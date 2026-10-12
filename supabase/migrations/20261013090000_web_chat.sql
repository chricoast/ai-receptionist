-- Milestone 2: website chat widget.
--
-- New tables: channels, contacts, conversations, messages.
-- Security model:
--   * Members of a business can READ its conversations; owners can turn the
--     web chat channel on/off. Nothing else is writable from the browser.
--   * Website visitors are not logged in. Their messages are written by our
--     server (with the server-only secret key) after checking the widget key,
--     the visitor's conversation token and rate limits.
--   * Policies use "business_id in (my businesses)" so the membership lookup
--     runs once per query, not once per row (messages can get large).

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function private.my_business_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.business_id from public.business_members m where m.user_id = (select auth.uid());
$$;

create or replace function private.my_owned_business_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.business_id from public.business_members m
  where m.user_id = (select auth.uid()) and m.role = 'owner';
$$;

revoke all on function private.my_business_ids() from public;
revoke all on function private.my_owned_business_ids() from public;
grant execute on function private.my_business_ids() to authenticated;
grant execute on function private.my_owned_business_ids() to authenticated;

-- ---------------------------------------------------------------------------
-- channels: where messages come from (web chat now; Instagram etc. later)
-- ---------------------------------------------------------------------------

create table public.channels (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  type text not null check (type in ('web_chat', 'instagram', 'facebook', 'whatsapp')),
  -- Public identifier used in the website snippet. Random, not guessable.
  public_key text not null unique default ('wc_' || replace(gen_random_uuid()::text, '-', '')),
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, type)
);

create trigger channels_set_updated_at
  before update on public.channels
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- contacts: the business's customers (end users)
-- ---------------------------------------------------------------------------

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 200),
  email text not null default '' check (char_length(email) <= 200),
  phone text not null default '' check (char_length(phone) <= 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contacts_business_id_idx on public.contacts (business_id);

create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- conversations
-- ---------------------------------------------------------------------------

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  channel_id uuid not null references public.channels (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  status text not null default 'ai_active'
    check (status in ('ai_active', 'needs_human', 'human_active', 'closed')),
  -- SHA-256 of the secret the visitor's browser holds; proves the visitor owns
  -- this conversation. The secret itself is never stored.
  visitor_token_hash text not null,
  -- SHA-256 of the visitor's IP address (+ salt), only for rate limiting.
  client_ip_hash text not null default '',
  -- Started from the "Try your receptionist" preview in settings.
  is_test boolean not null default false,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conversations_business_last_idx on public.conversations (business_id, last_message_at desc);
create index conversations_rate_idx on public.conversations (business_id, client_ip_hash, created_at);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  sender text not null check (sender in ('customer', 'ai', 'human', 'system')),
  content text not null check (char_length(content) between 1 and 4000),
  -- e.g. {"decision": "handoff", "reason": "...", "model": "...", "usage": {...}}
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index messages_business_sender_idx on public.messages (business_id, sender, created_at);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.channels enable row level security;
alter table public.contacts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "Members can read" on public.channels for select to authenticated
  using (business_id in (select private.my_business_ids()));
create policy "Owners can create" on public.channels for insert to authenticated
  with check (business_id in (select private.my_owned_business_ids()));
create policy "Owners can update" on public.channels for update to authenticated
  using (business_id in (select private.my_owned_business_ids()))
  with check (business_id in (select private.my_owned_business_ids()));

create policy "Members can read" on public.contacts for select to authenticated
  using (business_id in (select private.my_business_ids()));
create policy "Members can read" on public.conversations for select to authenticated
  using (business_id in (select private.my_business_ids()));
create policy "Members can read" on public.messages for select to authenticated
  using (business_id in (select private.my_business_ids()));

-- ---------------------------------------------------------------------------
-- Table privileges
-- ---------------------------------------------------------------------------

revoke all on table public.channels, public.contacts, public.conversations, public.messages
  from anon, authenticated;

grant all on table public.channels, public.contacts, public.conversations, public.messages
  to service_role;

grant select on table public.channels, public.contacts, public.conversations, public.messages
  to authenticated;
grant insert (business_id, type) on table public.channels to authenticated;
grant update (enabled) on table public.channels to authenticated;
