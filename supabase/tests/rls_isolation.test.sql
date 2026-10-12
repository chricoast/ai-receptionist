-- Tenant-isolation tests: one business must never see or change another's data.
-- Run with: npm run test:db

\set ON_ERROR_STOP on

-- ---------------------------------------------------------------------------
-- Test helpers
-- ---------------------------------------------------------------------------

create schema test;
grant usage on schema test to anon, authenticated;

create function test.act_as(p_user_id uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id)::text, false);
end;
$$;

create function test.expect_count(p_label text, p_sql text, p_expected bigint) returns void
language plpgsql as $$
declare
  n bigint;
begin
  execute format('select count(*) from (%s) s', p_sql) into n;
  if n <> p_expected then
    raise exception 'FAIL [%]: expected % rows, got %', p_label, p_expected, n;
  end if;
  raise notice 'ok - %', p_label;
end;
$$;

create function test.expect_affected(p_label text, p_sql text, p_expected bigint) returns void
language plpgsql as $$
declare
  n bigint;
begin
  execute p_sql;
  get diagnostics n = row_count;
  if n <> p_expected then
    raise exception 'FAIL [%]: expected % rows affected, got %', p_label, p_expected, n;
  end if;
  raise notice 'ok - %', p_label;
end;
$$;

create function test.expect_error(p_label text, p_sql text, p_sqlstate text) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlstate = p_sqlstate then
      raise notice 'ok - %', p_label;
      return;
    end if;
    raise exception 'FAIL [%]: expected error %, got % (%)', p_label, p_sqlstate, sqlstate, sqlerrm;
  end;
  raise exception 'FAIL [%]: expected error %, but the statement succeeded', p_label, p_sqlstate;
end;
$$;

grant execute on all functions in schema test to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Fixtures: Alice owns business A, Bob owns business B, Carol is staff at A.
-- ---------------------------------------------------------------------------

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'carol@example.com');

set role authenticated;

select test.act_as('00000000-0000-0000-0000-00000000000a');
select set_config('test.business_a', public.create_business('Alice Café', 'cafe', '{cs,en}')::text, false);
insert into public.services (business_id, name, price_from)
  values (current_setting('test.business_a')::uuid, 'Espresso', 55);

select test.act_as('00000000-0000-0000-0000-00000000000b');
select set_config('test.business_b', public.create_business('Bob Tattoo', 'tattoo', '{en}')::text, false);
insert into public.services (business_id, name, price_note)
  values (current_setting('test.business_b')::uuid, 'Custom piece', 'After consultation');
insert into public.faqs (business_id, question, answer)
  values (current_setting('test.business_b')::uuid, 'Deposit?', '1000 CZK');
select set_config('test.service_b',
  (select id::text from public.services where business_id = current_setting('test.business_b')::uuid),
  false);

reset role;
insert into public.business_members (business_id, user_id, role)
  values (current_setting('test.business_a')::uuid, '00000000-0000-0000-0000-00000000000c', 'staff');

-- ---------------------------------------------------------------------------
-- Alice (owner of A) vs. Bob's business B
-- ---------------------------------------------------------------------------

set role authenticated;
select test.act_as('00000000-0000-0000-0000-00000000000a');

select test.expect_count('owner sees only her own business',
  'select * from public.businesses', 1);
select test.expect_count('owner sees her own business by id',
  format('select * from public.businesses where id = %L', current_setting('test.business_a')), 1);
select test.expect_count('owner cannot read other business services',
  format('select * from public.services where business_id = %L', current_setting('test.business_b')), 0);
select test.expect_count('owner cannot read other business FAQs',
  'select * from public.faqs', 0);
select test.expect_count('owner sees only memberships of her business',
  format('select * from public.business_members where business_id = %L', current_setting('test.business_b')), 0);

select test.expect_error('owner cannot insert into other business',
  format($q$insert into public.services (business_id, name) values (%L, 'Hack')$q$, current_setting('test.business_b')),
  '42501');
select test.expect_affected('owner cannot update other business',
  format($q$update public.businesses set name = 'Hacked' where id = %L$q$, current_setting('test.business_b')), 0);
select test.expect_affected('owner cannot update other business services',
  format($q$update public.services set name = 'Hacked' where business_id = %L$q$, current_setting('test.business_b')), 0);
select test.expect_affected('owner cannot delete other business services',
  format($q$delete from public.services where business_id = %L$q$, current_setting('test.business_b')), 0);
select test.expect_error('owner cannot hijack another row through upsert',
  format($q$insert into public.services (id, business_id, name) values (%L, %L, 'Hack')
            on conflict (id) do update set name = excluded.name$q$,
         current_setting('test.service_b'), current_setting('test.business_a')),
  '42501');
select test.expect_error('owner cannot move own row to other business',
  format($q$update public.services set business_id = %L where business_id = %L$q$,
         current_setting('test.business_b'), current_setting('test.business_a')),
  '42501');
select test.expect_error('owner cannot change her plan',
  format($q$update public.businesses set plan = 'pro' where id = %L$q$, current_setting('test.business_a')),
  '42501');
select test.expect_error('owner cannot add members directly',
  format($q$insert into public.business_members (business_id, user_id, role) values (%L, %L, 'owner')$q$,
         current_setting('test.business_b'), '00000000-0000-0000-0000-00000000000a'),
  '42501');

-- Alice can manage her own business.
select test.expect_affected('owner can update own business',
  format($q$update public.businesses set description = 'Best coffee' where id = %L$q$, current_setting('test.business_a')), 1);
select test.expect_affected('owner can add own FAQ',
  format($q$insert into public.faqs (business_id, question, answer) values (%L, 'Wi-Fi?', 'Yes')$q$, current_setting('test.business_a')), 1);
select test.expect_affected('owner can add own opening hours',
  format($q$insert into public.opening_hours (business_id, weekday, opens_at, closes_at) values (%L, 1, '08:00', '18:00')$q$, current_setting('test.business_a')), 1);

-- ---------------------------------------------------------------------------
-- Bob's data is intact after Alice's attempts
-- ---------------------------------------------------------------------------

select test.act_as('00000000-0000-0000-0000-00000000000b');
select test.expect_count('other business data untouched',
  $q$select * from public.services where name = 'Custom piece'$q$, 1);
select test.expect_count('other business name untouched',
  $q$select * from public.businesses where name = 'Bob Tattoo'$q$, 1);

-- ---------------------------------------------------------------------------
-- Carol (staff at A) can read but not change
-- ---------------------------------------------------------------------------

select test.act_as('00000000-0000-0000-0000-00000000000c');
select test.expect_count('staff can read business', 'select * from public.businesses', 1);
select test.expect_count('staff can read services', 'select * from public.services', 1);
select test.expect_error('staff cannot add services',
  format($q$insert into public.services (business_id, name) values (%L, 'Latte')$q$, current_setting('test.business_a')),
  '42501');
select test.expect_affected('staff cannot update business',
  $q$update public.businesses set name = 'Carol Café'$q$, 0);

-- ---------------------------------------------------------------------------
-- Logged-out visitors (anon) get nothing
-- ---------------------------------------------------------------------------

reset role;
set role anon;
select set_config('request.jwt.claims', '', false);
select test.expect_error('anon cannot read businesses', 'select * from public.businesses', '42501');
select test.expect_error('anon cannot read services', 'select * from public.services', '42501');
select test.expect_error('anon cannot create a business',
  $q$select public.create_business('Spam', 'other', '{cs}')$q$, '42501');

-- Logged-in role without a user id (should never happen, but must fail closed)
reset role;
set role authenticated;
select set_config('request.jwt.claims', '', false);
select test.expect_error('create_business requires a user',
  $q$select public.create_business('Ghost', 'other', '{cs}')$q$, '42501');
select test.expect_count('no user sees no businesses', 'select * from public.businesses', 0);

reset role;
\echo 'All RLS isolation tests passed.'
