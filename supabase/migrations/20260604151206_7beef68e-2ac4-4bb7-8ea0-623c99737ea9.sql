
-- ============ FIX INVENTORY SYNC TRIGGERS ============
CREATE OR REPLACE FUNCTION public.sync_catalog_item_quantities()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_item_id uuid;
  v_sources integer;
  v_on_loan integer;
BEGIN
  v_item_id := COALESCE(NEW.item_id, OLD.item_id);
  SELECT COALESCE(SUM(quantity), 0) INTO v_sources FROM public.catalog_item_sources WHERE item_id = v_item_id;
  SELECT COALESCE(SUM(lris.quantity), 0) INTO v_on_loan
  FROM public.lend_request_item_sources lris
  JOIN public.lend_request_items lri ON lri.id = lris.lend_request_item_id
  JOIN public.lend_requests lr ON lr.id = lri.request_id
  WHERE lri.item_id = v_item_id AND lr.status = 'delivered';
  UPDATE public.catalog_items
  SET quantity_total = v_sources + v_on_loan, quantity_available = v_sources
  WHERE id = v_item_id;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_after_lris_change()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_item_id uuid; v_sources integer; v_on_loan integer;
BEGIN
  SELECT item_id INTO v_item_id FROM public.lend_request_items
  WHERE id = COALESCE(NEW.lend_request_item_id, OLD.lend_request_item_id);
  IF v_item_id IS NULL THEN RETURN NULL; END IF;
  SELECT COALESCE(SUM(quantity), 0) INTO v_sources FROM public.catalog_item_sources WHERE item_id = v_item_id;
  SELECT COALESCE(SUM(lris.quantity), 0) INTO v_on_loan
  FROM public.lend_request_item_sources lris
  JOIN public.lend_request_items lri ON lri.id = lris.lend_request_item_id
  JOIN public.lend_requests lr ON lr.id = lri.request_id
  WHERE lri.item_id = v_item_id AND lr.status = 'delivered';
  UPDATE public.catalog_items
  SET quantity_total = v_sources + v_on_loan, quantity_available = v_sources
  WHERE id = v_item_id;
  RETURN NULL;
END;
$function$;

-- Make handle_lend_status_change a no-op to avoid double-counting if a trigger gets re-added
CREATE OR REPLACE FUNCTION public.handle_lend_status_change()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ BEGIN RETURN NEW; END; $function$;

DROP TRIGGER IF EXISTS catalog_item_sources_sync ON public.catalog_item_sources;
CREATE TRIGGER catalog_item_sources_sync
AFTER INSERT OR UPDATE OR DELETE ON public.catalog_item_sources
FOR EACH ROW EXECUTE FUNCTION public.sync_catalog_item_quantities();

DROP TRIGGER IF EXISTS lend_request_item_sources_sync ON public.lend_request_item_sources;
CREATE TRIGGER lend_request_item_sources_sync
AFTER INSERT OR UPDATE OR DELETE ON public.lend_request_item_sources
FOR EACH ROW EXECUTE FUNCTION public.sync_after_lris_change();

-- Recompute all catalog items now to repair drift
DO $$
DECLARE r record; v_sources int; v_on_loan int;
BEGIN
  FOR r IN SELECT id FROM public.catalog_items LOOP
    SELECT COALESCE(SUM(quantity),0) INTO v_sources FROM public.catalog_item_sources WHERE item_id = r.id;
    SELECT COALESCE(SUM(lris.quantity),0) INTO v_on_loan
      FROM public.lend_request_item_sources lris
      JOIN public.lend_request_items lri ON lri.id = lris.lend_request_item_id
      JOIN public.lend_requests lr ON lr.id = lri.request_id
      WHERE lri.item_id = r.id AND lr.status = 'delivered';
    UPDATE public.catalog_items
      SET quantity_total = v_sources + v_on_loan, quantity_available = v_sources
      WHERE id = r.id;
  END LOOP;
END $$;

-- ============ LOCKERS ============
CREATE TABLE public.lockers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  number integer NOT NULL UNIQUE,
  label text,
  occupied_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  occupant_name text,
  occupant_email text,
  pin_code text,
  occupied_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.lockers TO authenticated;
GRANT ALL ON public.lockers TO service_role;

ALTER TABLE public.lockers ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all lockers (to see which are free)
CREATE POLICY "Authenticated view lockers" ON public.lockers
FOR SELECT TO authenticated USING (true);

-- A user can claim a free locker (set occupied_by = themselves only when currently free)
CREATE POLICY "User claims free locker" ON public.lockers
FOR UPDATE TO authenticated
USING (occupied_by IS NULL)
WITH CHECK (occupied_by = auth.uid());

-- A user can release their own locker (set occupied_by back to null)
CREATE POLICY "User releases own locker" ON public.lockers
FOR UPDATE TO authenticated
USING (occupied_by = auth.uid())
WITH CHECK (occupied_by IS NULL OR occupied_by = auth.uid());

-- Admins manage everything
CREATE POLICY "Admins manage lockers" ON public.lockers
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER lockers_updated_at BEFORE UPDATE ON public.lockers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed 8 lockers
INSERT INTO public.lockers (number, label) VALUES
  (1,'לוקר 1'),(2,'לוקר 2'),(3,'לוקר 3'),(4,'לוקר 4'),
  (5,'לוקר 5'),(6,'לוקר 6'),(7,'לוקר 7'),(8,'לוקר 8');
