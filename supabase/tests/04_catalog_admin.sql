-- Adding catalog items and category derivation.
BEGIN;
\ir 00_helpers.sql.inc
SELECT plan(9);

SELECT pg_temp.make_user('alice@x.com', 'Alice') AS alice \gset
SELECT pg_temp.make_user('admin@x.com', 'Admin', true) AS admin \gset

SELECT pg_temp.as_user(:'alice');
SELECT throws_ok($$ SELECT public.admin_add_catalog_items('[{"name":"x"}]') $$,
  NULL, 'Forbidden', 'non-admins cannot add items');

SELECT pg_temp.as_user(:'admin');
SELECT is(
  (SELECT count(*)::INT FROM public.admin_add_catalog_items(
    '[{"name":"DHT22","category":"sensors","quantity":5},
      {"name":"Switch","category":"switches","quantity":0}]')),
  2, 'admin adds two items in one call');

SELECT pg_temp.as_postgres();
SELECT results_eq(
  $$ SELECT name, general_category, quantity_total, quantity_available FROM public.catalog_items
     WHERE name IN ('DHT22', 'Switch') ORDER BY name $$,
  $$ VALUES ('DHT22'::TEXT, 'sensors'::TEXT, 5, 5), ('Switch'::TEXT, 'electronics'::TEXT, 0, 0) $$,
  'general category is derived and stock is recorded');
SELECT results_eq(
  $$ SELECT s.name, cis.quantity FROM public.catalog_item_sources cis
     JOIN public.item_sources s ON s.id = cis.source_id
     JOIN public.catalog_items i ON i.id = cis.item_id
     WHERE i.name IN ('DHT22', 'Switch') $$,
  $$ VALUES ('כללי'::TEXT, 5) $$,
  'stock without an explicit source goes to the default source');

-- The old bug: stock recorded only in quantity_* got wiped on the next source edit.
UPDATE public.catalog_item_sources SET quantity = quantity;
SELECT is((SELECT quantity_available FROM public.catalog_items WHERE name = 'DHT22'), 5,
  'stock survives a source recompute');

UPDATE public.catalog_items SET category = 'microcontrollers', general_category = 'sensors' WHERE name = 'DHT22';
SELECT is((SELECT general_category FROM public.catalog_items WHERE name = 'DHT22'), 'compute',
  'changing the category updates the general category (and it cannot be set inconsistently)');

SELECT pg_temp.as_user(:'admin');
SELECT is(public.ensure_item_source('  Drawer 4 '), public.ensure_item_source('drawer 4'),
  'ensure_item_source reuses names case-insensitively');
SELECT throws_ok($$ SELECT public.admin_add_catalog_items('[{"name":"Bad","quantity":-1}]') $$,
  NULL, 'כמות שלילית עבור "Bad"', 'negative quantity is rejected');
SELECT throws_ok($$ SELECT public.admin_add_catalog_items('[{"name":"  "}]') $$,
  NULL, 'לכל פריט חייב להיות שם', 'blank names are rejected');

SELECT * FROM finish();
ROLLBACK;
