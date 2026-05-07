
ALTER TABLE public.wishlist_items
  ADD COLUMN estimated_cost numeric,
  ADD COLUMN quantity_pref text NOT NULL DEFAULT 'one'
    CHECK (quantity_pref IN ('one', 'few', 'many'));
