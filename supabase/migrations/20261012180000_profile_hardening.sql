-- Hardening after the Milestone 1 review.
--  * Web addresses must be http(s) at the database level too, so a value
--    like "javascript:..." can never reach customers, even if someone skips
--    the app and talks to the API directly.
--  * plan only accepts known values.
--  * create_business() takes a per-user lock so two simultaneous requests
--    cannot slip past the "max 5 businesses" check.

alter table public.businesses
  add constraint businesses_website_http check (website = '' or website ~* '^https?://[^\s]+$'),
  add constraint businesses_booking_url_http check (booking_url = '' or booking_url ~* '^https?://[^\s]+$'),
  add constraint businesses_plan_known check (plan in ('free', 'trial', 'pro'));

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

  -- One creation at a time per user (released at the end of the transaction).
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

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
