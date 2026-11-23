-- Deliver / return move stock between sources and loans atomically.
BEGIN;
\ir 00_helpers.sql.inc
SELECT plan(15);

SELECT pg_temp.make_user('alice@x.com', 'Alice') AS alice \gset
SELECT pg_temp.make_user('admin@x.com', 'Admin', true) AS admin \gset

INSERT INTO public.item_sources (id, name) VALUES
  ('00000000-0000-0000-0000-0000000000b1', 'Shelf A'),
  ('00000000-0000-0000-0000-0000000000b2', 'Shelf B');
INSERT INTO public.catalog_items (id, name) VALUES ('00000000-0000-0000-0000-0000000000a1', 'Arduino');
INSERT INTO public.catalog_item_sources (item_id, source_id, quantity) VALUES
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', 2),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', 2);

CREATE FUNCTION pg_temp.stock() RETURNS TABLE (a INT, b INT, avail INT, total INT) LANGUAGE SQL AS $$
  SELECT
    (SELECT quantity FROM public.catalog_item_sources WHERE source_id = '00000000-0000-0000-0000-0000000000b1'),
    (SELECT quantity FROM public.catalog_item_sources WHERE source_id = '00000000-0000-0000-0000-0000000000b2'),
    quantity_available, quantity_total
  FROM public.catalog_items WHERE id = '00000000-0000-0000-0000-0000000000a1'
$$;
GRANT EXECUTE ON FUNCTION pg_temp.stock() TO authenticated;

SELECT results_eq($$ SELECT * FROM pg_temp.stock() $$, $$ VALUES (2, 2, 4, 4) $$, 'initial stock');

SELECT pg_temp.as_user(:'alice');
SELECT public.create_lend_request('A', 'a@x.com', '050', NULL,
  '[{"item_id":"00000000-0000-0000-0000-0000000000a1","quantity":3}]') AS req \gset
SELECT pg_temp.as_postgres();
SELECT id AS lri FROM public.lend_request_items WHERE request_id = :'req' \gset

SELECT pg_temp.as_user(:'alice');
SELECT throws_ok(
  format($$ SELECT public.deliver_lend_request(%L, '[]') $$, :'req'),
  NULL, 'Forbidden', 'non-admins cannot deliver');

SELECT pg_temp.as_user(:'admin');
SELECT throws_ok(
  format($$ SELECT public.deliver_lend_request(%L, '[]') $$, :'req'),
  NULL, 'ניתן למסור רק בקשה מאושרת (מצב נוכחי: pending)', 'pending requests cannot be delivered');

UPDATE public.lend_requests SET status = 'approved' WHERE id = :'req';

SELECT throws_ok(
  format($$ SELECT public.deliver_lend_request(%L, '[]') $$, :'req'),
  NULL, 'כמות לא תואמת עבור "Arduino" (נדרש 3, נבחר 0)', 'items must be fully covered');
SELECT throws_ok(
  format($$ SELECT public.deliver_lend_request(%L, jsonb_build_array(jsonb_build_object(
    'lend_request_item_id', %L::TEXT, 'picks', jsonb_build_array(
      jsonb_build_object('source_id', '00000000-0000-0000-0000-0000000000b1', 'quantity', 5),
      jsonb_build_object('source_id', '00000000-0000-0000-0000-0000000000b2', 'quantity', -2))))) $$,
    :'req', :'lri'),
  NULL, 'כמות לא תקינה', 'negative picks are rejected');
SELECT throws_ok(
  format($$ SELECT public.deliver_lend_request(%L, jsonb_build_array(jsonb_build_object(
    'lend_request_item_id', %L::TEXT, 'picks', jsonb_build_array(
      jsonb_build_object('source_id', '00000000-0000-0000-0000-0000000000b1', 'quantity', 2),
      jsonb_build_object('source_id', '00000000-0000-0000-0000-0000000000b1', 'quantity', 1))))) $$,
    :'req', :'lri'),
  NULL, 'מלאי לא מספיק במקור שנבחר', 'duplicate picks cannot overdraw a source');
SELECT pg_temp.as_postgres();
SELECT results_eq($$ SELECT * FROM pg_temp.stock() $$, $$ VALUES (2, 2, 4, 4) $$,
  'failed deliveries leave stock untouched');

SELECT pg_temp.as_user(:'admin');
SELECT lives_ok(
  format($$ SELECT public.deliver_lend_request(%L, jsonb_build_array(jsonb_build_object(
    'lend_request_item_id', %L::TEXT, 'picks', jsonb_build_array(
      jsonb_build_object('source_id', '00000000-0000-0000-0000-0000000000b1', 'quantity', 2),
      jsonb_build_object('source_id', '00000000-0000-0000-0000-0000000000b2', 'quantity', 1))))) $$,
    :'req', :'lri'),
  'valid delivery succeeds');
SELECT pg_temp.as_postgres();
SELECT results_eq($$ SELECT * FROM pg_temp.stock() $$, $$ VALUES (0, 1, 1, 4) $$,
  'delivery moves 3 units from the shelves onto loan');
SELECT is((SELECT status FROM public.lend_requests WHERE id = :'req'), 'delivered', 'request is delivered');

SELECT pg_temp.as_user(:'admin');
SELECT throws_ok(
  format($$ SELECT public.deliver_lend_request(%L, '[]') $$, :'req'),
  NULL, 'ניתן למסור רק בקשה מאושרת (מצב נוכחי: delivered)', 'double delivery is rejected');

-- Return everything, sending the Shelf A part back to Shelf B instead.
SELECT pg_temp.as_postgres();
SELECT id AS lris_a FROM public.lend_request_item_sources
WHERE source_id = '00000000-0000-0000-0000-0000000000b1' \gset
SELECT pg_temp.as_user(:'admin');
SELECT lives_ok(
  format($$ SELECT public.return_lend_request(%L, jsonb_build_array(jsonb_build_object(
    'lris_id', %L::TEXT, 'source_id', '00000000-0000-0000-0000-0000000000b2'))) $$, :'req', :'lris_a'),
  'return succeeds');
SELECT pg_temp.as_postgres();
SELECT results_eq($$ SELECT * FROM pg_temp.stock() $$, $$ VALUES (0, 4, 4, 4) $$,
  'return puts all units back, honouring the source override');
SELECT is((SELECT count(*)::INT FROM public.lend_request_item_sources), 0, 'no units remain on loan');

SELECT pg_temp.as_user(:'admin');
SELECT throws_ok(
  format($$ SELECT public.return_lend_request(%L) $$, :'req'),
  NULL, 'ניתן להחזיר רק בקשה שנמסרה (מצב נוכחי: returned)', 'double return is rejected');

SELECT * FROM finish();
ROLLBACK;
