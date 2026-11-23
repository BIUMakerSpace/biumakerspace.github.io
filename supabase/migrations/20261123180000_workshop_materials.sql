-- Per-meeting materials (slides, code, ...) shown as buttons on the workshops page.
-- Stored as a small JSON array on the meeting: [{"kind": "slides", "title": "...", "url": "https://..."}].
-- Only admins can write meetings (existing policies), and the check below rejects anything that
-- isn't a list of well-formed https links, so no javascript:/data: URLs can reach an <a href>.

CREATE FUNCTION public.valid_workshop_materials(p JSONB)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_typeof(p) = 'array'
     AND jsonb_array_length(p) <= 20
     AND NOT EXISTS (
       SELECT 1 FROM jsonb_array_elements(p) AS m
       WHERE jsonb_typeof(m) <> 'object'
          OR coalesce(m->>'kind', '') NOT IN ('slides', 'code', 'other')
          OR length(btrim(coalesce(m->>'title', ''))) = 0
          OR length(m->>'title') > 120
          OR coalesce(m->>'url', '') !~* '^https://[^\s]+$'
          OR length(m->>'url') > 2000
     )
$$;

ALTER TABLE public.workshop_meetings
  ADD COLUMN materials JSONB NOT NULL DEFAULT '[]'::jsonb
  CONSTRAINT workshop_meetings_materials_check CHECK (public.valid_workshop_materials(materials));

-- The check runs as whoever writes the row; make sure every API role can evaluate it.
GRANT EXECUTE ON FUNCTION public.valid_workshop_materials(JSONB) TO anon, authenticated, service_role;
