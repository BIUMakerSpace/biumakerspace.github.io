-- Catalog admin integrity:
--   * general_category is derived from category (clients used to leave it at its
--     default, so every newly added item landed in "tools_other").
--   * Items are added through admin_add_catalog_items(), which puts initial stock
--     in a source. Writing quantity_* directly (old add form / CSV import) was
--     silently reset to 0 by the source-sync triggers on the next edit.

-- Mirror of CATEGORY_TO_GENERAL in src/lib/categories.ts.
CREATE FUNCTION public.general_category_for(p_category TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_category = 'sensors' THEN 'sensors'
    WHEN p_category IN ('actuators', 'displays', 'leds', 'input', 'communication',
                        'passive_components', 'switches') THEN 'electronics'
    WHEN p_category IN ('microcontrollers', 'storage_memory') THEN 'compute'
    WHEN p_category IN ('wires_connectors', 'power') THEN 'connectivity_power'
    ELSE 'tools_other'
  END
$$;

CREATE FUNCTION public.set_general_category()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.general_category := public.general_category_for(NEW.category);
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_general_category
  BEFORE INSERT OR UPDATE OF category, general_category ON public.catalog_items
  FOR EACH ROW EXECUTE FUNCTION public.set_general_category();

UPDATE public.catalog_items SET general_category = public.general_category_for(category);

-- Returns the id of the source with this name (case-insensitive), creating it if needed.
CREATE FUNCTION public.ensure_item_source(p_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT := btrim(p_name);
  v_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF coalesce(v_name, '') = '' THEN
    RAISE EXCEPTION 'שם מקור ריק';
  END IF;
  SELECT id INTO v_id FROM public.item_sources WHERE lower(name) = lower(v_name);
  IF v_id IS NULL THEN
    INSERT INTO public.item_sources (name) VALUES (v_name)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_id;
    -- Lost a race with a concurrent insert of the same name.
    IF v_id IS NULL THEN
      SELECT id INTO v_id FROM public.item_sources WHERE lower(name) = lower(v_name);
    END IF;
  END IF;
  RETURN v_id;
END;
$$;

-- p_items: [{"name", "description"?, "category"?, "image_url"?, "quantity"?, "source_id"?}, ...]
-- Stock goes to source_id, or to the default "כללי" source when omitted.
CREATE FUNCTION public.admin_add_catalog_items(p_items JSONB)
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item JSONB;
  v_id UUID;
  v_qty INTEGER;
  v_source UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'אין פריטים להוספה';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    IF coalesce(btrim(v_item ->> 'name'), '') = '' THEN
      RAISE EXCEPTION 'לכל פריט חייב להיות שם';
    END IF;
    v_qty := coalesce((v_item ->> 'quantity')::INTEGER, 0);
    IF v_qty < 0 THEN
      RAISE EXCEPTION 'כמות שלילית עבור "%"', v_item ->> 'name';
    END IF;

    INSERT INTO public.catalog_items (name, description, category, image_url, quantity_total, quantity_available)
    VALUES (
      btrim(v_item ->> 'name'),
      nullif(btrim(v_item ->> 'description'), ''),
      coalesce(nullif(v_item ->> 'category', ''), 'other'),
      nullif(btrim(v_item ->> 'image_url'), ''),
      0, 0
    )
    RETURNING id INTO v_id;

    IF v_qty > 0 THEN
      v_source := coalesce((v_item ->> 'source_id')::UUID, public.ensure_item_source('כללי'));
      INSERT INTO public.catalog_item_sources (item_id, source_id, quantity) VALUES (v_id, v_source, v_qty);
    END IF;

    RETURN NEXT v_id;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_item_source(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_add_catalog_items(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_item_source(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_catalog_items(JSONB) TO authenticated;
