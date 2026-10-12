-- Milestone 1: accounts & business profile (the shared "business brain").
--
-- Security model, in plain words:
--   * Every row belongs to a business (business_id).
--   * Row Level Security (RLS) is ON for every table: members of a business can
--     read its rows, only owners can change them. Nobody else sees anything.
--   * Logged-out visitors (the "anon" role) get no access to any table.
--   * Businesses are created only through create_business(), which also makes
--     the caller the owner, in one transaction.

-- ---------------------------------------------------------------------------
-- Helpers (kept in a "private" schema that the public API does not expose)
-- ---------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- businesses
-- ---------------------------------------------------------------------------

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  type text not null default 'other' check (
    type in ('salon', 'barber', 'clinic', 'tattoo', 'studio', 'cafe', 'restaurant', 'service_shop', 'other')
  ),
  description text not null default '' check (char_length(description) <= 2000),
  address text not null default '' check (char_length(address) <= 300),
  phone text not null default '' check (char_length(phone) <= 50),
  email text not null default '' check (char_length(email) <= 200),
  website text not null default '' check (char_length(website) <= 300),
  booking_url text not null default '' check (char_length(booking_url) <= 500),
  -- Languages the business talks to customers in. First one is the main one.
  languages text[] not null default '{cs}' check (
    cardinality(languages) >= 1 and languages <@ array['cs', 'en']
  ),
  timezone text not null default 'Europe/Prague',
  tone text not null default 'friendly' check (tone in ('friendly', 'professional', 'casual')),
  tone_notes text not null default '' check (char_length(tone_notes) <= 1000),
  -- Milestone 4: when true, AI replies are saved as drafts for the owner to approve.
  approve_replies boolean not null default false,
  -- Billing plan. Not editable by users (see grants below).
  plan text not null default 'free',
  onboarding_step text not null default 'contact' check (char_length(onboarding_step) <= 30),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- business_members: who can access which business
-- ---------------------------------------------------------------------------

create table public.business_members (
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'staff' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create index business_members_user_id_idx on public.business_members (user_id);

-- These run with elevated rights ("security definer") so that RLS policies can
-- look up membership without the policies on business_members looping forever.
-- They only ever answer about the currently logged-in user.
create or replace function private.is_business_member(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.business_members m
    where m.business_id = p_business_id
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_business_owner(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.business_members m
    where m.business_id = p_business_id
      and m.user_id = (select auth.uid())
      and m.role = 'owner'
  );
$$;

revoke all on function private.is_business_member(uuid) from public;
revoke all on function private.is_business_owner(uuid) from public;
grant execute on function private.is_business_member(uuid) to authenticated;
grant execute on function private.is_business_owner(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- services
-- ---------------------------------------------------------------------------

create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  -- Leave both prices empty when the price is "on request" (explain in price_note).
  price_from numeric(10, 2) check (price_from >= 0),
  price_to numeric(10, 2) check (price_to >= 0),
  currency text not null default 'CZK' check (currency ~ '^[A-Z]{3}$'),
  price_note text not null default '' check (char_length(price_note) <= 200),
  duration_minutes integer check (duration_minutes between 1 and 1440),
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (price_from is null or price_to is null or price_to >= price_from)
);

create index services_business_id_idx on public.services (business_id, position);

create trigger services_set_updated_at
  before update on public.services
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- opening_hours: regular weekly hours. A weekday with no rows is closed.
-- Several rows on one day = several intervals (e.g. a lunch break).
-- closes_at earlier than opens_at means the interval ends after midnight.
-- ---------------------------------------------------------------------------

create table public.opening_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7), -- ISO: 1 = Monday, 7 = Sunday
  opens_at time not null,
  closes_at time not null,
  created_at timestamptz not null default now(),
  check (opens_at <> closes_at)
);

create index opening_hours_business_id_idx on public.opening_hours (business_id, weekday);

-- ---------------------------------------------------------------------------
-- opening_hour_exceptions: holidays and special days
-- ---------------------------------------------------------------------------

create table public.opening_hour_exceptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  date date not null,
  closed boolean not null default true,
  opens_at time,
  closes_at time,
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  check (closed or (opens_at is not null and closes_at is not null and opens_at <> closes_at))
);

create index opening_hour_exceptions_business_id_idx on public.opening_hour_exceptions (business_id, date);

-- ---------------------------------------------------------------------------
-- faqs
-- ---------------------------------------------------------------------------

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  question text not null check (char_length(question) between 1 and 500),
  answer text not null check (char_length(answer) between 1 and 2000),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index faqs_business_id_idx on public.faqs (business_id, position);

create trigger faqs_set_updated_at
  before update on public.faqs
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- rules: "never answer" topics and extra instructions for the AI
-- ---------------------------------------------------------------------------

create table public.rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  kind text not null check (kind in ('never_answer', 'instruction')),
  content text not null check (char_length(content) between 1 and 500),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index rules_business_id_idx on public.rules (business_id, position);

create trigger rules_set_updated_at
  before update on public.rules
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.services enable row level security;
alter table public.opening_hours enable row level security;
alter table public.opening_hour_exceptions enable row level security;
alter table public.faqs enable row level security;
alter table public.rules enable row level security;

-- businesses: members read, owners update. No direct insert/delete.
create policy "Members can read their business"
  on public.businesses for select to authenticated
  using (private.is_business_member(id));

create policy "Owners can update their business"
  on public.businesses for update to authenticated
  using (private.is_business_owner(id))
  with check (private.is_business_owner(id));

-- business_members: you can see the member list of businesses you belong to.
-- Adding/removing members will come later through dedicated functions.
create policy "Members can read members of their business"
  on public.business_members for select to authenticated
  using (user_id = (select auth.uid()) or private.is_business_member(business_id));

-- Profile tables: same four policies on each.
do $$
declare
  t text;
begin
  foreach t in array array['services', 'opening_hours', 'opening_hour_exceptions', 'faqs', 'rules'] loop
    execute format(
      'create policy "Members can read" on public.%I for select to authenticated
         using (private.is_business_member(business_id))', t);
    execute format(
      'create policy "Owners can insert" on public.%I for insert to authenticated
         with check (private.is_business_owner(business_id))', t);
    execute format(
      'create policy "Owners can update" on public.%I for update to authenticated
         using (private.is_business_owner(business_id))
         with check (private.is_business_owner(business_id))', t);
    execute format(
      'create policy "Owners can delete" on public.%I for delete to authenticated
         using (private.is_business_owner(business_id))', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Table privileges (which API roles may touch which tables at all).
-- RLS above then decides which rows. Start from nothing and grant explicitly.
-- ---------------------------------------------------------------------------

revoke all on table
  public.businesses,
  public.business_members,
  public.services,
  public.opening_hours,
  public.opening_hour_exceptions,
  public.faqs,
  public.rules
from anon, authenticated;

-- The server-only "service_role" key (never sent to browsers) gets full access.
-- It is not used by the app yet; the chat widget backend will need it later.
grant all on table
  public.businesses,
  public.business_members,
  public.services,
  public.opening_hours,
  public.opening_hour_exceptions,
  public.faqs,
  public.rules
to service_role;

grant select on table public.businesses to authenticated;
-- Only these columns can be changed by owners (not plan, timezone, ids, timestamps).
grant update (
  name, type, description, address, phone, email, website, booking_url,
  languages, tone, tone_notes, approve_replies, onboarding_step, onboarding_completed_at
) on table public.businesses to authenticated;

grant select on table public.business_members to authenticated;

grant select, insert, update, delete on table
  public.services,
  public.opening_hours,
  public.opening_hour_exceptions,
  public.faqs,
  public.rules
to authenticated;

-- ---------------------------------------------------------------------------
-- create_business(): creates a business and makes the caller its owner.
-- ---------------------------------------------------------------------------

create or replace function public.create_business(
  p_name text,
  p_type text,
  p_languages text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_business_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  -- Simple guard against accidental or abusive mass creation.
  if (
    select count(*) from public.business_members
    where user_id = v_user_id and role = 'owner'
  ) >= 5 then
    raise exception 'Too many businesses for one account' using errcode = '54000';
  end if;

  insert into public.businesses (name, type, languages)
  values (p_name, p_type, p_languages)
  returning id into v_business_id;

  insert into public.business_members (business_id, user_id, role)
  values (v_business_id, v_user_id, 'owner');

  return v_business_id;
end;
$$;

revoke all on function public.create_business(text, text, text[]) from public, anon;
grant execute on function public.create_business(text, text, text[]) to authenticated;
