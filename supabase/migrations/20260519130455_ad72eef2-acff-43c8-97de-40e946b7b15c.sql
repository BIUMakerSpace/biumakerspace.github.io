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

  SELECT COALESCE(SUM(quantity), 0) INTO v_sources
  FROM public.catalog_item_sources WHERE item_id = v_item_id;

  SELECT COALESCE(SUM(lris.quantity), 0) INTO v_on_loan
  FROM public.lend_request_item_sources lris
  JOIN public.lend_request_items lri ON lri.id = lris.lend_request_item_id
  JOIN public.lend_requests lr ON lr.id = lri.request_id
  WHERE lri.item_id = v_item_id
    AND lr.status = 'delivered';

  UPDATE public.catalog_items
  SET quantity_total = v_sources + v_on_loan,
      quantity_available = v_sources
  WHERE id = v_item_id;

  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_after_lris_change()
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
  SELECT item_id INTO v_item_id FROM public.lend_request_items
  WHERE id = COALESCE(NEW.lend_request_item_id, OLD.lend_request_item_id);

  IF v_item_id IS NULL THEN RETURN NULL; END IF;

  SELECT COALESCE(SUM(quantity), 0) INTO v_sources
  FROM public.catalog_item_sources WHERE item_id = v_item_id;

  SELECT COALESCE(SUM(lris.quantity), 0) INTO v_on_loan
  FROM public.lend_request_item_sources lris
  JOIN public.lend_request_items lri ON lri.id = lris.lend_request_item_id
  JOIN public.lend_requests lr ON lr.id = lri.request_id
  WHERE lri.item_id = v_item_id
    AND lr.status = 'delivered';

  UPDATE public.catalog_items
  SET quantity_total = v_sources + v_on_loan,
      quantity_available = v_sources
  WHERE id = v_item_id;

  RETURN NULL;
END;
$function$;

-- Ensure triggers exist (they may have been missing, which would also cause corruption)
DROP TRIGGER IF EXISTS catalog_item_sources_sync ON public.catalog_item_sources;
CREATE TRIGGER catalog_item_sources_sync
AFTER INSERT OR UPDATE OR DELETE ON public.catalog_item_sources
FOR EACH ROW EXECUTE FUNCTION public.sync_catalog_item_quantities();

DROP TRIGGER IF EXISTS lend_request_item_sources_sync ON public.lend_request_item_sources;
CREATE TRIGGER lend_request_item_sources_sync
AFTER INSERT OR UPDATE OR DELETE ON public.lend_request_item_sources
FOR EACH ROW EXECUTE FUNCTION public.sync_after_lris_change();

-- Recompute all catalog items now to repair any drifted rows
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
      SET quantity_total = v_sources + v_on_loan,
          quantity_available = v_sources
      WHERE id = r.id;
  END LOOP;
END $$;