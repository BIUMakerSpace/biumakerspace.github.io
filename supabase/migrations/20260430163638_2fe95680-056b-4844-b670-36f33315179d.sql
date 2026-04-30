ALTER TABLE public.catalog_items
ADD COLUMN IF NOT EXISTS general_category text NOT NULL DEFAULT 'other';

UPDATE public.catalog_items SET general_category = CASE
  WHEN category IN ('sensors','actuators','displays','leds','input','communication','passive_components') THEN 'electronics'
  WHEN category IN ('microcontrollers','storage_memory') THEN 'compute'
  WHEN category IN ('wires_connectors','power') THEN 'connectivity_power'
  WHEN category = 'tools' THEN 'tools'
  ELSE 'other'
END;

ALTER TABLE public.catalog_items DROP CONSTRAINT IF EXISTS catalog_items_general_category_check;
ALTER TABLE public.catalog_items ADD CONSTRAINT catalog_items_general_category_check
  CHECK (general_category IN ('electronics','compute','connectivity_power','tools','other'));