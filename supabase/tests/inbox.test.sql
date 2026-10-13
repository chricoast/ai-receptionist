-- Owner inbox (Milestone 3): team actions on conversations, widget appearance.
-- Runs after chat_isolation.test.sql (same database, fixtures and helpers):
-- business B (owner Bob) has one conversation; business A has Alice (owner)
-- and Carol (staff).

\set ON_ERROR_STOP on

reset role;
select set_config('test.conv_b', (select id::text from public.conversations limit 1), false);

-- A conversation for business A as well.
with c as (
  insert into public.contacts (business_id) values (current_setting('test.business_a')::uuid)
  returning id, business_id
)
insert into public.conversations (business_id, channel_id, contact_id, visitor_token_hash)
select c.business_id, ch.id, c.id, 'hash-a'
from c join public.channels ch on ch.business_id = c.business_id and ch.type = 'web_chat';
select set_config('test.conv_a',
  (select id::text from public.conversations where business_id = current_setting('test.business_a')::uuid limit 1), false);

set role authenticated;

-- Alice (owner of A) cannot touch B's conversation.
select test.act_as('00000000-0000-0000-0000-00000000000a');
select test.expect_error('owner cannot take over another business conversation',
  format($q$select public.set_conversation_status(%L, 'human_active')$q$, current_setting('test.conv_b')), '42501');
select test.expect_error('owner cannot reply in another business conversation',
  format($q$select public.send_human_reply(%L, 'Ahoj')$q$, current_setting('test.conv_b')), '42501');
select test.expect_error('unknown conversation is refused',
  $q$select public.send_human_reply(gen_random_uuid(), 'Ahoj')$q$, '42501');

-- …but can work with her own.
select test.expect_count('owner takes over own conversation',
  format($q$select public.set_conversation_status(%L, 'human_active')$q$, current_setting('test.conv_a')), 1);
select test.expect_count('status is now human_active',
  $q$select * from public.conversations where status = 'human_active'$q$, 1);
select test.expect_error('status must be a known value',
  format($q$select public.set_conversation_status(%L, 'needs_human')$q$, current_setting('test.conv_a')), '22023');
select test.expect_error('empty reply is refused',
  format($q$select public.send_human_reply(%L, '   ')$q$, current_setting('test.conv_a')), '22023');
select test.expect_error('overlong reply is refused',
  format($q$select public.send_human_reply(%L, repeat('x', 2001))$q$, current_setting('test.conv_a')), '22023');
select test.expect_count('owner replies',
  format($q$select public.send_human_reply(%L, '  Dobrý den, ozvu se vám.  ')$q$, current_setting('test.conv_a')), 1);
select test.expect_count('reply is stored as a human message, trimmed',
  $q$select * from public.messages where sender = 'human' and content = 'Dobrý den, ozvu se vám.'$q$, 1);
select test.expect_count('preview shows the reply',
  $q$select * from public.conversations where last_message = 'Dobrý den, ozvu se vám.'$q$, 1);
select test.expect_error('owner still cannot write messages directly',
  format($q$insert into public.messages (conversation_id, business_id, sender, content) values (%L, %L, 'human', 'x')$q$,
    current_setting('test.conv_a'), current_setting('test.business_a')), '42501');

-- Carol (staff at A) handles the inbox too.
select test.act_as('00000000-0000-0000-0000-00000000000c');
select test.expect_count('staff hands back to the receptionist',
  format($q$select public.set_conversation_status(%L, 'ai_active')$q$, current_setting('test.conv_a')), 1);
select test.expect_count('staff closes the conversation',
  format($q$select public.set_conversation_status(%L, 'closed')$q$, current_setting('test.conv_a')), 1);
select test.expect_count('status is now closed', $q$select * from public.conversations where status = 'closed'$q$, 1);
select test.expect_affected('staff cannot change the chat appearance',
  $q$update public.channels set appearance = '{"accent":"#000000"}'$q$, 0);

-- Widget appearance: owners only, own channel, JSON object.
select test.act_as('00000000-0000-0000-0000-00000000000a');
select test.expect_affected('owner sets own chat appearance',
  $q$update public.channels set appearance = '{"accent":"#1d4ed8"}' where type = 'web_chat'$q$, 1);
select test.expect_error('appearance must be a JSON object',
  $q$update public.channels set appearance = '"red"' where type = 'web_chat'$q$, '23514');
select test.expect_error('appearance has a size limit',
  format($q$update public.channels set appearance = jsonb_build_object('x', %L) where type = 'web_chat'$q$,
    repeat(md5('x'), 200)), '23514');
select test.act_as('00000000-0000-0000-0000-00000000000b');
select test.expect_count('other owner does not see the change',
  $q$select * from public.channels where appearance <> '{}'::jsonb$q$, 0);

-- Visitors cannot use the team functions.
reset role;
set role anon;
select set_config('request.jwt.claims', '', false);
select test.expect_error('anon cannot reply as the team',
  format($q$select public.send_human_reply(%L, 'x')$q$, current_setting('test.conv_b')), '42501');
select test.expect_error('anon cannot change status',
  format($q$select public.set_conversation_status(%L, 'closed')$q$, current_setting('test.conv_b')), '42501');

reset role;
\echo 'All inbox tests passed.'
