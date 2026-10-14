-- Milestone 6: weekly summary (shown in the app, no emails: founder's choice).
--
-- The numbers (conversations, handled by the receptionist, handed over…) are
-- computed live from conversations/messages. Only the AI part (common topics,
-- unanswered questions, suggested FAQs) is stored here, because it costs a
-- Claude call: one row per business and week, created when the owner clicks
-- "Analyse the week".

create table public.weekly_summaries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  -- Monday of the week, in the business's time zone.
  week_start date not null check (extract(isodow from week_start) = 1),
  -- {"topics": [...], "unanswered": [...], "suggested_faqs": [...]} (validated by the app)
  insights jsonb not null default '{}'::jsonb
    check (jsonb_typeof(insights) = 'object' and pg_column_size(insights) <= 32768),
  -- How many customer messages the analysis was based on.
  message_count integer not null default 0 check (message_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, week_start)
);

create trigger weekly_summaries_set_updated_at
  before update on public.weekly_summaries
  for each row execute function private.set_updated_at();

alter table public.weekly_summaries enable row level security;

create policy "Members can read" on public.weekly_summaries for select to authenticated
  using (business_id in (select private.my_business_ids()));
create policy "Owners can insert" on public.weekly_summaries for insert to authenticated
  with check (business_id in (select private.my_owned_business_ids()));
create policy "Owners can update" on public.weekly_summaries for update to authenticated
  using (business_id in (select private.my_owned_business_ids()))
  with check (business_id in (select private.my_owned_business_ids()));

revoke all on table public.weekly_summaries from anon, authenticated;
grant all on table public.weekly_summaries to service_role;
grant select on table public.weekly_summaries to authenticated;
grant insert (business_id, week_start, insights, message_count) on table public.weekly_summaries to authenticated;
grant update (insights, message_count) on table public.weekly_summaries to authenticated;
