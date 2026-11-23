-- Lockers privacy/claiming and server-side author names.
BEGIN;
\ir 00_helpers.sql.inc
SELECT plan(8);

SELECT pg_temp.make_user('alice@x.com', 'Alice') AS alice \gset
SELECT pg_temp.make_user('bob@x.com', 'Bob') AS bob \gset
SELECT pg_temp.make_user('admin@x.com', 'Admin', true) AS admin \gset

SELECT pg_temp.as_user(:'alice');
SELECT lives_ok($$ SELECT public.claim_locker(3, '4321') $$, 'a regular user can claim a free locker');
SELECT throws_ok($$ SELECT public.claim_locker(4, '1111') $$,
  NULL, 'You already have a locker assigned', 'one locker per user');

SELECT pg_temp.as_user(:'bob');
SELECT throws_ok($$ SELECT pin_code FROM public.lockers $$,
  '42501', NULL, 'other users cannot read locker PINs');
SELECT results_eq($$ SELECT is_occupied FROM public.lockers_status WHERE number = 3 $$,
  $$ VALUES (true) $$, 'occupancy is visible through lockers_status');
SELECT throws_ok($$ SELECT public.claim_locker(3, '9999') $$,
  NULL, 'Locker not available', 'an occupied locker cannot be claimed');

SELECT pg_temp.as_user(:'admin');
SELECT results_eq($$ SELECT pin_code FROM public.admin_list_lockers() WHERE number = 3 $$,
  $$ VALUES ('4321'::TEXT) $$, 'admins see PINs via admin_list_lockers()');

SELECT pg_temp.as_user(:'bob');
INSERT INTO public.forum_questions (user_id, author_name, title, body)
VALUES (:'bob', 'Admin (official)', 'q', 'b');
SELECT results_eq($$ SELECT author_name FROM public.forum_questions $$,
  $$ VALUES ('Bob'::TEXT) $$, 'author_name comes from the profile, not the client');
UPDATE public.forum_questions SET author_name = 'Admin (official)';
SELECT results_eq($$ SELECT author_name FROM public.forum_questions $$,
  $$ VALUES ('Bob'::TEXT) $$, 'author_name cannot be changed later');

SELECT * FROM finish();
ROLLBACK;
