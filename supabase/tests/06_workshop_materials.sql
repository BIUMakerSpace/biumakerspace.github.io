-- Workshop meeting materials: only admins write them, only well-formed https links are stored.
BEGIN;
\ir 00_helpers.sql.inc
SELECT plan(6);

SELECT pg_temp.make_user('alice@x.com', 'Alice') AS alice \gset
SELECT pg_temp.make_user('admin@x.com', 'Admin', true) AS admin \gset

INSERT INTO public.workshops (id, title, is_published) VALUES ('a0000000-0000-4000-8000-000000000001', 'Walker robot', true);
INSERT INTO public.workshop_meetings (id, workshop_id, title, starts_at) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Meeting 1', now() - interval '7 days');

SELECT pg_temp.as_user(:'admin');
SELECT lives_ok($$
  UPDATE public.workshop_meetings SET materials = '[
    {"kind": "slides", "title": "Session 1 slides", "url": "https://drive.google.com/file/d/abc/view"},
    {"kind": "code", "title": "s1_blink.ino", "url": "https://drive.google.com/file/d/def/view"}
  ]' WHERE id = 'b0000000-0000-4000-8000-000000000001'
$$, 'admins can attach slides and code links');
SELECT throws_ok($$
  UPDATE public.workshop_meetings SET materials = '[{"kind": "code", "title": "x", "url": "javascript:alert(1)"}]'
  WHERE id = 'b0000000-0000-4000-8000-000000000001'
$$, '23514', NULL, 'non-https links are rejected');
SELECT throws_ok($$
  UPDATE public.workshop_meetings SET materials = '{"kind": "slides"}' WHERE id = 'b0000000-0000-4000-8000-000000000001'
$$, '23514', NULL, 'materials must be a list');
SELECT throws_ok($$
  UPDATE public.workshop_meetings SET materials = '[{"kind": "video", "title": "x", "url": "https://x.com"}]'
  WHERE id = 'b0000000-0000-4000-8000-000000000001'
$$, '23514', NULL, 'unknown kinds are rejected');

SELECT pg_temp.as_user(:'alice');
SELECT results_eq(
  $$ WITH u AS (UPDATE public.workshop_meetings SET materials = '[]' RETURNING 1) SELECT count(*)::INT FROM u $$,
  $$ VALUES (0) $$, 'students cannot change materials');

SELECT pg_temp.as_postgres();
SET LOCAL ROLE anon;
SELECT results_eq(
  $$ SELECT jsonb_array_length(materials) FROM public.workshop_meetings $$,
  $$ VALUES (2) $$, 'visitors can see the materials');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
