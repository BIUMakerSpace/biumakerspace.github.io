ALTER TABLE public.catalog_items DROP CONSTRAINT IF EXISTS catalog_items_category_check;
ALTER TABLE public.catalog_items ADD CONSTRAINT catalog_items_category_check
  CHECK (category = ANY (ARRAY[
    'sensors','actuators','displays','leds','input','microcontrollers',
    'communication','storage_memory','passive_components','wires_connectors',
    'power','tools','other'
  ]));