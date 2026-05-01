
-- 1) item_sources
CREATE TABLE public.item_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.item_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view sources"
  ON public.item_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage sources"
  ON public.item_sources FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER item_sources_updated_at
  BEFORE UPDATE ON public.item_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) catalog_item_sources
CREATE TABLE public.catalog_item_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.item_sources(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, source_id)
);
ALTER TABLE public.catalog_item_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage item sources"
  ON public.catalog_item_sources FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER catalog_item_sources_updated_at
  BEFORE UPDATE ON public.catalog_item_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_catalog_item_sources_item ON public.catalog_item_sources(item_id);
CREATE INDEX idx_catalog_item_sources_source ON public.catalog_item_sources(source_id);

-- 3) lend_request_item_sources
CREATE TABLE public.lend_request_item_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lend_request_item_id uuid NOT NULL REFERENCES public.lend_request_items(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.item_sources(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lend_request_item_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage lend item sources"
  ON public.lend_request_item_sources FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_lris_lri ON public.lend_request_item_sources(lend_request_item_id);

-- 4) Sync function: keep catalog_items.quantity_total in sync with sum of source quantities,
--    and keep quantity_available consistent (subtract currently-loaned amount).
CREATE OR REPLACE FUNCTION public.sync_catalog_item_quantities()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item_id uuid;
  v_total integer;
  v_on_loan integer;
BEGIN
  v_item_id := COALESCE(NEW.item_id, OLD.item_id);

  SELECT COALESCE(SUM(quantity), 0) INTO v_total
  FROM public.catalog_item_sources WHERE item_id = v_item_id;

  -- Currently on-loan = sum of lend_request_item_sources for delivered (not returned) requests for this item.
  SELECT COALESCE(SUM(lris.quantity), 0) INTO v_on_loan
  FROM public.lend_request_item_sources lris
  JOIN public.lend_request_items lri ON lri.id = lris.lend_request_item_id
  JOIN public.lend_requests lr ON lr.id = lri.request_id
  WHERE lri.item_id = v_item_id
    AND lr.status = 'delivered';

  UPDATE public.catalog_items
  SET quantity_total = v_total,
      quantity_available = GREATEST(0, v_total - v_on_loan)
  WHERE id = v_item_id;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_catalog_qty_cis
AFTER INSERT OR UPDATE OR DELETE ON public.catalog_item_sources
FOR EACH ROW EXECUTE FUNCTION public.sync_catalog_item_quantities();

-- Also recompute when lend_request_item_sources rows change (delivery/return)
CREATE OR REPLACE FUNCTION public.sync_after_lris_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item_id uuid;
  v_total integer;
  v_on_loan integer;
BEGIN
  SELECT item_id INTO v_item_id FROM public.lend_request_items
  WHERE id = COALESCE(NEW.lend_request_item_id, OLD.lend_request_item_id);

  IF v_item_id IS NULL THEN RETURN NULL; END IF;

  SELECT COALESCE(SUM(quantity), 0) INTO v_total
  FROM public.catalog_item_sources WHERE item_id = v_item_id;

  SELECT COALESCE(SUM(lris.quantity), 0) INTO v_on_loan
  FROM public.lend_request_item_sources lris
  JOIN public.lend_request_items lri ON lri.id = lris.lend_request_item_id
  JOIN public.lend_requests lr ON lr.id = lri.request_id
  WHERE lri.item_id = v_item_id
    AND lr.status = 'delivered';

  UPDATE public.catalog_items
  SET quantity_available = GREATEST(0, v_total - v_on_loan)
  WHERE id = v_item_id;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_after_lris
AFTER INSERT OR UPDATE OR DELETE ON public.lend_request_item_sources
FOR EACH ROW EXECUTE FUNCTION public.sync_after_lris_change();

-- 5) Drop old auto stock trigger logic (we'll handle via edge functions)
DROP TRIGGER IF EXISTS lend_status_change ON public.lend_requests;
DROP TRIGGER IF EXISTS handle_lend_status_change_trigger ON public.lend_requests;
DROP TRIGGER IF EXISTS trg_handle_lend_status_change ON public.lend_requests;

-- 6) Seed: create "כללי" source and migrate existing stock
INSERT INTO public.item_sources (name, description, sort_order)
VALUES ('כללי', 'מקור ברירת מחדל - יש להעביר פריטים למקורות ספציפיים', 0)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.catalog_item_sources (item_id, source_id, quantity)
SELECT ci.id, s.id, ci.quantity_total
FROM public.catalog_items ci
CROSS JOIN public.item_sources s
WHERE s.name = 'כללי'
ON CONFLICT (item_id, source_id) DO NOTHING;
