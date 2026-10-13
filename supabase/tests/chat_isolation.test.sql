-- Tenant-isolation tests for the chat tables (Milestone 2).
-- Runs after rls_isolation.test.sql (same database, same fixtures and helpers).

\set ON_ERROR_STOP on

-- Fixtures written by the server role (as the widget backend does).
reset role;
insert into public.channels (business_id, type) values
  (current_setting('test.business_a')::uuid, 'web_chat'),
  (current_setting('test.business_b')::uuid, 'web_chat');

with c as (
  insert into public.contacts (business_id, name, phone)
  values (current_setting('test.business_b')::uuid, 'Eva', '+420 600 000 000')
  returning id, business_id
), conv as (
  insert into public.conversations (business_id, channel_id, contact_id, visitor_token_hash)
  select c.business_id, ch.id, c.id, 'hash'
  from c join public.channels ch on ch.business_id = c.business_id
  returning id, business_id
)
insert into public.messages (conversation_id, business_id, sender, content)
select id, business_id, 'customer', 'Kolik stojí tetování?' from conv;

set role authenticated;

-- Alice (owner of A)
select test.act_as('00000000-0000-0000-0000-00000000000a');
select test.expect_count('owner sees only own channel', 'select * from public.channels', 1);
select test.expect_count('owner cannot read other business contacts', 'select * from public.contacts', 0);
select test.expect_count('owner cannot read other business conversations', 'select * from public.conversations', 0);
select test.expect_count('owner cannot read other business messages', 'select * from public.messages', 0);
select test.expect_error('owner cannot write messages directly',
  format($q$insert into public.messages (conversation_id, business_id, sender, content)
            select id, business_id, 'ai', 'x' from public.conversations limit 1$q$), '42501');
select test.expect_error('owner cannot create a channel for another business',
  format($q$insert into public.channels (business_id, type) values (%L, 'instagram')$q$, current_setting('test.business_b')),
  '42501');
select test.expect_affected('owner can create own channel',
  format($q$insert into public.channels (business_id, type) values (%L, 'instagram')$q$, current_setting('test.business_a')), 1);
select test.expect_error('owner cannot change the widget key',
  $q$update public.channels set public_key = 'wc_mine'$q$, '42501');
select test.expect_affected('owner can switch own chat off',
  $q$update public.channels set enabled = false where type = 'web_chat'$q$, 1);
select test.expect_error('owner cannot change conversation status directly',
  $q$update public.conversations set status = 'closed'$q$, '42501');

-- Bob (owner of B) sees his chat
select test.act_as('00000000-0000-0000-0000-00000000000b');
select test.expect_count('owner reads own conversation', 'select * from public.conversations', 1);
select test.expect_count('owner reads own messages', 'select * from public.messages', 1);
select test.expect_count('owner reads own contacts', $q$select * from public.contacts where name = 'Eva'$q$, 1);

-- Carol (staff at A) can read A's channels but not change them
select test.act_as('00000000-0000-0000-0000-00000000000c');
select test.expect_count('staff reads own business channels', 'select * from public.channels', 2);
select test.expect_affected('staff cannot switch the chat',
  $q$update public.channels set enabled = true$q$, 0);

-- Visitors (anon) get nothing directly
reset role;
set role anon;
select set_config('request.jwt.claims', '', false);
select test.expect_error('anon cannot read channels', 'select * from public.channels', '42501');
select test.expect_error('anon cannot read messages', 'select * from public.messages', '42501');
select test.expect_error('anon cannot write messages',
  $q$insert into public.messages (conversation_id, business_id, sender, content) values (gen_random_uuid(), gen_random_uuid(), 'customer', 'x')$q$,
  '42501');

reset role;
\echo 'All chat isolation tests passed.'

-- Lead mode (knowledge pages, question rules)
reset role;
insert into public.knowledge_pages (business_id, url, content)
  values (current_setting('test.business_b')::uuid, 'https://bob.example/', 'Bob secret page');
set role authenticated;
select test.act_as('00000000-0000-0000-0000-00000000000a');
select test.expect_count('owner cannot read other business website knowledge', 'select * from public.knowledge_pages', 0);
select test.expect_error('owner cannot add knowledge to another business',
  format($q$insert into public.knowledge_pages (business_id, url, content) values (%L, 'x', 'y')$q$, current_setting('test.business_b')),
  '42501');
select test.expect_affected('owner can add own knowledge page',
  format($q$insert into public.knowledge_pages (business_id, url, content) values (%L, 'https://a.example/', 'A')$q$, current_setting('test.business_a')), 1);
select test.expect_affected('owner can add a question rule',
  format($q$insert into public.rules (business_id, kind, content) values (%L, 'question', 'Jaký máte rozpočet?')$q$, current_setting('test.business_a')), 1);
select test.expect_affected('owner can set the goal',
  format($q$update public.businesses set goal = 'meeting' where id = %L$q$, current_setting('test.business_a')), 1);
select test.expect_error('goal must be a known value',
  format($q$update public.businesses set goal = 'sell' where id = %L$q$, current_setting('test.business_a')), '23514');
select test.expect_error('owner cannot write the enquiry summary directly',
  $q$update public.conversations set summary = 'x'$q$, '42501');
select test.act_as('00000000-0000-0000-0000-00000000000b');
select test.expect_count('other owner still sees only own knowledge', 'select * from public.knowledge_pages', 1);
select test.act_as('00000000-0000-0000-0000-00000000000c');
select test.expect_affected('staff cannot delete knowledge pages', 'delete from public.knowledge_pages', 0);
reset role;
set role anon;
select test.expect_error('anon cannot read knowledge', 'select * from public.knowledge_pages', '42501');
reset role;
\echo 'All lead mode tests passed.'
