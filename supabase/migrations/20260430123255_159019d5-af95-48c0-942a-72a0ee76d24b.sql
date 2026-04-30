ALTER TABLE public.catalog_items
ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other';

ALTER TABLE public.catalog_items
DROP CONSTRAINT IF EXISTS catalog_items_category_check;

ALTER TABLE public.catalog_items
ADD CONSTRAINT catalog_items_category_check
CHECK (category IN ('sensors', 'tools', 'microcontrollers', 'other'));

UPDATE public.catalog_items SET category = 'other' WHERE category IS NULL;