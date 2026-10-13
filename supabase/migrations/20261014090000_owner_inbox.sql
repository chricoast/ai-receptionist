-- Milestone 3: owner inbox.
--
-- * The team (owner and staff) can take over a conversation, reply to the
--   customer, hand it back to the receptionist, or close it. This goes through
--   two database functions that check membership, so the browser still cannot
--   write to conversations or messages directly.
-- * conversations.last_message: a short preview for the inbox list.
-- * channels.appearance: the website chat's look (accent colour, corners,
--   font), editable by owners. Kept as JSON so new options can be added without
--   a migration; the app validates it (src/lib/chat/theme.ts).
-- * Live inbox: conversations and messages are published to Supabase Realtime
--   (Realtime still applies Row Level Security to every subscriber).

-- ---------------------------------------------------------------------------
-- New columns
-- ---------------------------------------------------------------------------

alter table public.conversations
  add column last_message text not null default '' check (char_length(last_message) <= 300);

update public.conversations c
set last_message = coalesce((
  select left(m.content, 300) from public.messages m
  where m.conversation_id = c.id and m.sender <> 'system'
  order by m.created_at desc limit 1
), '');

alter table public.channels
  add column appearance jsonb not null default '{}'::jsonb
    check (jsonb_typeof(appearance) = 'object' and pg_column_size(appearance) <= 4096);

grant update (appearance) on table public.channels to authenticated;

create index conversations_business_status_idx on public.conversations (business_id, status, last_message_at desc);

-- ---------------------------------------------------------------------------
-- Team actions
-- ---------------------------------------------------------------------------

-- Take over ('human_active'), hand back to the receptionist ('ai_active') or
-- close ('closed') a conversation of one of my businesses.
create or replace function public.set_conversation_status(p_conversation_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business uuid;
begin
  if p_status is null or p_status not in ('ai_active', 'human_active', 'closed') then
    raise exception 'invalid status' using errcode = '22023';
  end if;
  select c.business_id into v_business from public.conversations c where c.id = p_conversation_id;
  if v_business is null or v_business not in (select private.my_business_ids()) then
    raise exception 'conversation not found' using errcode = '42501';
  end if;
  update public.conversations set status = p_status where id = p_conversation_id;
end;
$$;

-- A team member replies to the customer. Replying also takes the conversation
-- over, so the receptionist stays quiet until it is handed back.
create or replace function public.send_human_reply(p_conversation_id uuid, p_content text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business uuid;
  v_content text := btrim(coalesce(p_content, ''));
  v_id uuid;
begin
  if char_length(v_content) = 0 or char_length(v_content) > 2000 then
    raise exception 'invalid message' using errcode = '22023';
  end if;
  select c.business_id into v_business from public.conversations c
  where c.id = p_conversation_id
  for update;
  if v_business is null or v_business not in (select private.my_business_ids()) then
    raise exception 'conversation not found' using errcode = '42501';
  end if;

  insert into public.messages (conversation_id, business_id, sender, content, metadata)
  values (p_conversation_id, v_business, 'human', v_content, jsonb_build_object('user_id', (select auth.uid())))
  returning id into v_id;

  update public.conversations
  set status = 'human_active', last_message = left(v_content, 300), last_message_at = now()
  where id = p_conversation_id;
  return v_id;
end;
$$;

revoke all on function public.set_conversation_status(uuid, text) from public, anon;
revoke all on function public.send_human_reply(uuid, text) from public, anon;
grant execute on function public.set_conversation_status(uuid, text) to authenticated;
grant execute on function public.send_human_reply(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Live updates (Supabase Realtime). Skipped where Realtime doesn't exist
-- (e.g. the plain Postgres used by `npm run test:db`).
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['conversations', 'messages'] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end;
$$;
