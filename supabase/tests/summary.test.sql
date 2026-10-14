-- Weekly summary (Milestone 6). Runs after inbox.test.sql (same fixtures):
-- business A: Alice (owner) + Carol (staff); business B: Bob (owner).

\set ON_ERROR_STOP on

set role authenticated;

select test.act_as('00000000-0000-0000-0000-00000000000a');
select test.expect_affected('owner stores own weekly summary',
  format($q$insert into public.weekly_summaries (business_id, week_start, insights, message_count)
            values (%L, '2026-10-05', '{"topics": []}', 12)$q$, current_setting('test.business_a')), 1);
select test.expect_error('one summary per business and week',
  format($q$insert into public.weekly_summaries (business_id, week_start) values (%L, '2026-10-05')$q$,
    current_setting('test.business_a')), '23505');
select test.expect_error('week must start on a Monday',
  format($q$insert into public.weekly_summaries (business_id, week_start) values (%L, '2026-10-07')$q$,
    current_setting('test.business_a')), '23514');
select test.expect_error('owner cannot store a summary for another business',
  format($q$insert into public.weekly_summaries (business_id, week_start) values (%L, '2026-10-05')$q$,
    current_setting('test.business_b')), '42501');
select test.expect_affected('owner updates own summary',
  $q$update public.weekly_summaries set insights = '{"topics": [{"topic": "Ceny"}]}', message_count = 13$q$, 1);
select test.expect_error('insights must be a JSON object',
  $q$update public.weekly_summaries set insights = '[]'$q$, '23514');
select test.expect_error('the week of a summary cannot be changed',
  $q$update public.weekly_summaries set week_start = '2026-10-12'$q$, '42501');

select test.act_as('00000000-0000-0000-0000-00000000000c');
select test.expect_count('staff reads the summary', 'select * from public.weekly_summaries', 1);
select test.expect_affected('staff cannot change the summary',
  $q$update public.weekly_summaries set message_count = 0$q$, 0);

select test.act_as('00000000-0000-0000-0000-00000000000b');
select test.expect_count('other business cannot read it', 'select * from public.weekly_summaries', 0);
select test.expect_affected('other business cannot change it',
  $q$update public.weekly_summaries set message_count = 0$q$, 0);

reset role;
set role anon;
select set_config('request.jwt.claims', '', false);
select test.expect_error('anon cannot read summaries', 'select * from public.weekly_summaries', '42501');

reset role;
\echo 'All weekly summary tests passed.'
