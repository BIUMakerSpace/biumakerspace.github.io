ALTER TABLE public.catalog_items DROP CONSTRAINT IF EXISTS catalog_items_general_category_check;

UPDATE public.catalog_items SET general_category = CASE
  WHEN category = 'sensors' THEN 'sensors'
  WHEN category IN ('actuators','displays','leds','input','communication','passive_components') THEN 'electronics'
  WHEN category IN ('microcontrollers','storage_memory') THEN 'compute'
  WHEN category IN ('wires_connectors','power') THEN 'connectivity_power'
  ELSE 'tools_other'
END;

ALTER TABLE public.catalog_items ADD CONSTRAINT catalog_items_general_category_check
  CHECK (general_category IN ('sensors','electronics','compute','connectivity_power','tools_other'));

ALTER TABLE public.catalog_items ALTER COLUMN general_category SET DEFAULT 'tools_other';