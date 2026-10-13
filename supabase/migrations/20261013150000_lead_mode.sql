-- "Lead mode" for service businesses (agencies, studios…): the receptionist
-- asks qualifying questions, knows the whole website, and steers towards a
-- meeting; the owner gets a summary of each enquiry.

-- What the receptionist should aim for in a conversation.
alter table public.businesses
  add column goal text not null default 'answer' check (goal in ('answer', 'meeting'));
grant update (goal) on table public.businesses to authenticated;

-- Questions the receptionist should find out (stored as rules of a new kind).
alter table public.rules drop constraint if exists rules_kind_check;
alter table public.rules
  add constraint rules_kind_check check (kind in ('never_answer', 'instruction', 'question'));

-- Whether the receptionist reads the whole website (optional: makes each chat
-- a bit more expensive because more text is sent to the AI).
alter table public.businesses
  add column use_website_knowledge boolean not null default false;
grant update (use_website_knowledge) on table public.businesses to authenticated;

-- Text of the business's website pages, used as knowledge by the receptionist.
create table public.knowledge_pages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  url text not null check (char_length(url) <= 500),
  title text not null default '' check (char_length(title) <= 300),
  content text not null check (char_length(content) <= 20000),
  fetched_at timestamptz not null default now()
);

create index knowledge_pages_business_id_idx on public.knowledge_pages (business_id);

alter table public.knowledge_pages enable row level security;

create policy "Members can read" on public.knowledge_pages for select to authenticated
  using (business_id in (select private.my_business_ids()));
create policy "Owners can insert" on public.knowledge_pages for insert to authenticated
  with check (business_id in (select private.my_owned_business_ids()));
create policy "Owners can delete" on public.knowledge_pages for delete to authenticated
  using (business_id in (select private.my_owned_business_ids()));

revoke all on table public.knowledge_pages from anon, authenticated;
grant all on table public.knowledge_pages to service_role;
grant select, insert, delete on table public.knowledge_pages to authenticated;

-- Enquiry summary for the owner (written by the server when the receptionist
-- has collected what the customer needs and how to reach them).
alter table public.conversations
  add column summary text not null default '' check (char_length(summary) <= 3000),
  add column lead_at timestamptz;

create index conversations_leads_idx on public.conversations (business_id, lead_at desc) where lead_at is not null;
