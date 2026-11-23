-- Request creation and status guards.
BEGIN;
\ir 00_helpers.sql.inc
SELECT plan(15);

SELECT pg_temp.make_user('alice@x.com', 'Alice') AS alice \gset
SELECT pg_temp.make_user('admin@x.com', 'Admin', true) AS admin \gset

INSERT INTO public.catalog_items (id, name) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'Arduino'),
  ('00000000-0000-0000-0000-0000000000a2', 'Old scope');
INSERT INTO public.catalog_item_sources (item_id, source_id, quantity)
SELECT i.id, s.id, 3 FROM public.catalog_items i, public.item_sources s
WHERE i.id IN ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2');
UPDATE public.catalog_items SET archived_at = now() WHERE id = '00000000-0000-0000-0000-0000000000a2';

-- A user cannot smuggle a privileged state into a new request.
SELECT pg_temp.as_user(:'alice');
INSERT INTO public.print_requests
  (user_id, requester_name, requester_email, requester_phone, purpose, filament_color,
   stl_file_path, stl_file_name, status, admin_notes)
VALUES (:'alice', 'A', 'a@x.com', '050', 'p', 'black', 'x/y.stl', 'y.stl', 'approved', 'free!');
SELECT results_eq(
  $$ SELECT status, admin_notes FROM public.print_requests $$,
  $$ VALUES ('pending'::TEXT, NULL::TEXT) $$,
  'user-inserted print request is forced to pending with no admin notes');

SELECT throws_ok(
  format($$ INSERT INTO public.lend_requests (user_id, requester_name, requester_email, requester_phone)
            VALUES (%L, 'A', 'a@x.com', '050') $$, :'alice'),
  '42501', NULL,
  'direct lend_requests insert is not allowed (must use create_lend_request)');

-- create_lend_request validation.
SELECT throws_ok(
  $$ SELECT public.create_lend_request('A', 'a@x.com', '050', NULL, '[]') $$,
  NULL, 'יש לבחור לפחות פריט אחד', 'empty cart is rejected');
SELECT throws_ok(
  $$ SELECT public.create_lend_request('A', 'a@x.com', '050', NULL,
       '[{"item_id":"00000000-0000-0000-0000-0000000000a1","quantity":0}]') $$,
  NULL, 'כמות לא תקינה', 'zero quantity is rejected');
SELECT throws_ok(
  $$ SELECT public.create_lend_request('A', 'a@x.com', '050', NULL,
       '[{"item_id":"00000000-0000-0000-0000-0000000000a1","quantity":4}]') $$,
  NULL, 'אין מספיק מלאי עבור "Arduino" (זמין: 3)', 'more than available is rejected');
SELECT throws_ok(
  $$ SELECT public.create_lend_request('A', 'a@x.com', '050', NULL,
       '[{"item_id":"00000000-0000-0000-0000-0000000000a2","quantity":1}]') $$,
  NULL, 'פריט לא קיים בקטלוג', 'archived item is rejected');
SELECT throws_ok(
  $$ SELECT public.create_lend_request('A', 'a@x.com', '050', NULL,
       '[{"item_id":"00000000-0000-0000-0000-0000000000a1","quantity":1},
         {"item_id":"00000000-0000-0000-0000-0000000000a1","quantity":1}]') $$,
  NULL, 'פריט מופיע יותר מפעם אחת בבקשה', 'duplicate item lines are rejected');

SELECT public.create_lend_request('A', 'a@x.com', '050', '  ',
  '[{"item_id":"00000000-0000-0000-0000-0000000000a1","quantity":2}]') AS req \gset
SELECT results_eq(
  format($$ SELECT r.status, r.user_id, r.notes, i.quantity
            FROM public.lend_requests r JOIN public.lend_request_items i ON i.request_id = r.id
            WHERE r.id = %L $$, :'req'),
  format($$ VALUES ('pending'::TEXT, %L::UUID, NULL::TEXT, 2) $$, :'alice'),
  'create_lend_request creates a pending request with its items');

-- Owner may only cancel, and nothing else changes with it.
UPDATE public.lend_requests SET status = 'cancelled', admin_notes = 'x', requester_name = 'Mallory'
WHERE id = :'req';
SELECT pg_temp.as_postgres();
SELECT results_eq(
  format($$ SELECT status, admin_notes, requester_name FROM public.lend_requests WHERE id = %L $$, :'req'),
  $$ VALUES ('cancelled'::TEXT, NULL::TEXT, 'A'::TEXT) $$,
  'cancelling cannot also rewrite other columns');

SELECT pg_temp.as_user(:'alice');
SELECT public.create_lend_request('A', 'a@x.com', '050', NULL,
  '[{"item_id":"00000000-0000-0000-0000-0000000000a1","quantity":1}]') AS req2 \gset
SELECT throws_ok(
  format($$ UPDATE public.lend_requests SET status = 'approved' WHERE id = %L $$, :'req2'),
  '42501', NULL, 'owner cannot approve their own request');

-- Admin flows.
SELECT pg_temp.as_user(:'admin');
SELECT public.admin_create_lend_request(:'alice', 'handed over',
  '[{"item_id":"00000000-0000-0000-0000-0000000000a1","quantity":1}]') AS req3 \gset
SELECT results_eq(
  format($$ SELECT status, requester_name, requester_email FROM public.lend_requests WHERE id = %L $$, :'req3'),
  $$ VALUES ('approved'::TEXT, 'Alice'::TEXT, 'alice@x.com'::TEXT) $$,
  'admin_create_lend_request is approved and uses the profile details');
SELECT throws_ok(
  format($$ UPDATE public.lend_requests SET status = 'delivered' WHERE id = %L $$, :'req3'),
  NULL, 'Use deliver_lend_request() / return_lend_request() to change delivery state',
  'even admins cannot set delivered without the RPC');
SELECT throws_ok(
  $$ UPDATE public.print_requests SET status = 'bogus' $$,
  '23514', NULL, 'unknown status values are rejected');

SELECT pg_temp.as_user(:'alice');
SELECT throws_ok(
  format($$ SELECT public.admin_create_lend_request(%L, NULL,
       '[{"item_id":"00000000-0000-0000-0000-0000000000a1","quantity":1}]') $$, :'alice'),
  NULL, 'Forbidden', 'non-admins cannot use admin_create_lend_request');

SELECT throws_ok(
  format($$ INSERT INTO public.item_requests
            (user_id, requester_name, requester_email, requester_phone, item_name, reference_link)
            VALUES (%L, 'A', 'a@x.com', '050', 'x', 'javascript:alert(1)') $$, :'alice'),
  '23514', NULL, 'javascript: links are rejected');

SELECT * FROM finish();
ROLLBACK;
