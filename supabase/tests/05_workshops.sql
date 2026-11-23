-- Workshops: visibility, per-meeting registration rules and privacy.
BEGIN;
\ir 00_helpers.sql.inc
SELECT plan(21);

SELECT pg_temp.make_user('alice@x.com', 'Alice') AS alice \gset
SELECT pg_temp.make_user('bob@x.com', 'Bob') AS bob \gset
SELECT pg_temp.make_user('carol@x.com', 'Carol') AS carol \gset
SELECT pg_temp.make_user('admin@x.com', 'Admin', true) AS admin \gset

INSERT INTO public.workshops (id, title, is_published) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Walker robot', true),
  ('a0000000-0000-4000-8000-000000000002', 'Draft workshop', false);
INSERT INTO public.workshop_meetings (id, workshop_id, title, starts_at, capacity, is_cancelled) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Meeting 1', now() + interval '7 days', 2, false),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Meeting 0', now() - interval '1 day', 12, false),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Meeting X', now() + interval '14 days', 12, true),
  ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000002', 'Draft meeting', now() + interval '7 days', 12, false);

-- Signed-out visitors
SET LOCAL ROLE anon;
SELECT results_eq($$ SELECT title FROM public.workshops $$, $$ VALUES ('Walker robot'::TEXT) $$,
  'visitors see only published workshops');
SELECT results_eq($$ SELECT count(*)::INT FROM public.workshop_meetings $$, $$ VALUES (3) $$,
  'visitors see meetings of published workshops only');
SELECT throws_ok($$ SELECT public.register_workshop_meeting('b0000000-0000-4000-8000-000000000001') $$,
  '42501', NULL, 'visitors cannot register');
SELECT throws_ok($$ SELECT * FROM public.workshop_registrations $$,
  '42501', NULL, 'visitors cannot read registrations');
RESET ROLE;

-- Registration rules
SELECT pg_temp.as_user(:'alice');
SELECT lives_ok($$ SELECT public.register_workshop_meeting('b0000000-0000-4000-8000-000000000001') $$,
  'a student can register for an upcoming meeting');
SELECT throws_ok($$ SELECT public.register_workshop_meeting('b0000000-0000-4000-8000-000000000001') $$,
  NULL, 'כבר נרשמת למפגש הזה', 'no double registration');
SELECT throws_ok($$ SELECT public.register_workshop_meeting('b0000000-0000-4000-8000-000000000002') $$,
  NULL, 'המפגש כבר התחיל', 'no registration after the meeting started');
SELECT throws_ok($$ SELECT public.register_workshop_meeting('b0000000-0000-4000-8000-000000000003') $$,
  NULL, 'המפגש בוטל', 'no registration for a cancelled meeting');
SELECT throws_ok($$ SELECT public.register_workshop_meeting('b0000000-0000-4000-8000-000000000004') $$,
  NULL, 'המפגש לא נמצא', 'no registration for an unpublished workshop');
SELECT throws_ok(
  format($$ INSERT INTO public.workshop_registrations (meeting_id, user_id) VALUES ('b0000000-0000-4000-8000-000000000001', %L) $$, :'carol'),
  '42501', NULL, 'students cannot insert registrations directly (capacity bypass)');

SELECT pg_temp.as_user(:'bob');
SELECT lives_ok($$ SELECT public.register_workshop_meeting('b0000000-0000-4000-8000-000000000001') $$,
  'a second student fills the last seat');
SELECT results_eq($$ SELECT count(*)::INT FROM public.workshop_registrations $$, $$ VALUES (1) $$,
  'students see only their own registrations');
SELECT results_eq(
  $$ SELECT registered_count, is_registered FROM public.workshop_meeting_stats()
     WHERE meeting_id = 'b0000000-0000-4000-8000-000000000001' $$,
  $$ VALUES (2, true) $$, 'seat count and own status come from workshop_meeting_stats()');

SELECT pg_temp.as_user(:'carol');
SELECT throws_ok($$ SELECT public.register_workshop_meeting('b0000000-0000-4000-8000-000000000001') $$,
  NULL, 'המפגש מלא', 'a full meeting rejects registrations');
SELECT throws_ok($$ SELECT public.cancel_workshop_registration('b0000000-0000-4000-8000-000000000001') $$,
  NULL, 'לא נרשמת למפגש הזה', 'cannot cancel a registration you do not have');
SELECT results_eq(
  $$ WITH d AS (DELETE FROM public.workshop_registrations RETURNING 1) SELECT count(*)::INT FROM d $$,
  $$ VALUES (0) $$, 'students cannot delete other students'' registrations');
SELECT throws_ok($$ INSERT INTO public.workshops (title) VALUES ('hack') $$,
  '42501', NULL, 'students cannot create workshops');

-- Cancelling frees the seat
SELECT pg_temp.as_user(:'alice');
SELECT lives_ok($$ SELECT public.cancel_workshop_registration('b0000000-0000-4000-8000-000000000001') $$,
  'a student can cancel before the meeting starts');
SELECT pg_temp.as_user(:'carol');
SELECT lives_ok($$ SELECT public.register_workshop_meeting('b0000000-0000-4000-8000-000000000001') $$,
  'the freed seat can be taken');

-- Admins
SELECT pg_temp.as_user(:'admin');
SELECT results_eq(
  $$ SELECT p.full_name FROM public.workshop_registrations r JOIN public.profiles p ON p.id = r.user_id
     WHERE r.meeting_id = 'b0000000-0000-4000-8000-000000000001' ORDER BY 1 $$,
  $$ VALUES ('Bob'::TEXT), ('Carol'::TEXT) $$, 'admins see who registered');
SELECT results_eq($$ SELECT count(*)::INT FROM public.workshops $$, $$ VALUES (2) $$,
  'admins also see unpublished workshops');

SELECT * FROM finish();
ROLLBACK;
