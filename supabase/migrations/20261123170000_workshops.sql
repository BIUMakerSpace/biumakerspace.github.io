-- Workshops: multi-meeting courses. Students register for each meeting separately.
--
-- Access model:
--   * Anyone can see published workshops, their meetings, and per-meeting seat counts.
--   * Signed-in users register/cancel only through register_workshop_meeting() and
--     cancel_workshop_registration(), which enforce capacity, cancellation and start time.
--     There is no INSERT/DELETE policy for users on workshop_registrations.
--   * Users see only their own registrations; admins see everyone's (with profile contact
--     details) and manage workshops and meetings directly.

-- ============================================================================
-- Tables
-- ============================================================================

CREATE TABLE public.workshops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (length(btrim(title)) > 0),
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT CHECK (image_url IS NULL OR image_url ~* '^https?://'),
  -- Short highlighted note shown on the card, e.g. "no meeting on 7.12 (Hanukkah)".
  notice TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.workshop_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(btrim(title)) > 0),
  starts_at TIMESTAMPTZ NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 12 CHECK (capacity BETWEEN 1 AND 500),
  is_cancelled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_workshop_meetings_workshop ON public.workshop_meetings(workshop_id, starts_at);

CREATE TABLE public.workshop_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.workshop_meetings(id) ON DELETE CASCADE,
  -- References profiles (not auth.users) so admins can embed name/email/phone in one query.
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (meeting_id, user_id)
);
CREATE INDEX idx_workshop_registrations_user ON public.workshop_registrations(user_id);

CREATE TRIGGER workshops_updated_at BEFORE UPDATE ON public.workshops
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER workshop_meetings_updated_at BEFORE UPDATE ON public.workshop_meetings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- Row-level security
-- ============================================================================

ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published workshops are public" ON public.workshops
  FOR SELECT TO anon, authenticated
  USING (is_published OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage workshops" ON public.workshops
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Meetings of published workshops are public" ON public.workshop_meetings
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workshops w
    WHERE w.id = workshop_id AND (w.is_published OR public.has_role(auth.uid(), 'admin'))
  ));
CREATE POLICY "Admins manage workshop meetings" ON public.workshop_meetings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own workshop registrations" ON public.workshop_registrations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Admins manage workshop registrations" ON public.workshop_registrations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Explicit privileges. Projects differ in what new tables get by default (newer Supabase projects
-- grant nothing, older ones and the local CLI stack grant everything), so first clear whatever the
-- defaults handed out, then grant exactly what's needed. Visitors only read workshops and meetings.
REVOKE ALL ON public.workshops, public.workshop_meetings, public.workshop_registrations
  FROM anon, authenticated;
GRANT SELECT ON public.workshops, public.workshop_meetings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.workshops, public.workshop_meetings, public.workshop_registrations TO authenticated;
GRANT ALL ON public.workshops, public.workshop_meetings, public.workshop_registrations TO service_role;

-- ============================================================================
-- Functions
-- ============================================================================

-- Seat counts for every visible meeting, plus whether the caller is registered.
-- Counts only: no one learns who else registered.
CREATE FUNCTION public.workshop_meeting_stats()
RETURNS TABLE (meeting_id UUID, registered_count INTEGER, is_registered BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id,
         count(r.id)::INTEGER,
         coalesce(bool_or(r.user_id = auth.uid()), false)
  FROM public.workshop_meetings m
  JOIN public.workshops w ON w.id = m.workshop_id
  LEFT JOIN public.workshop_registrations r ON r.meeting_id = m.id
  WHERE w.is_published OR public.has_role(auth.uid(), 'admin')
  GROUP BY m.id
$$;

CREATE FUNCTION public.register_workshop_meeting(p_meeting_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_starts_at TIMESTAMPTZ;
  v_capacity INTEGER;
  v_cancelled BOOLEAN;
  v_published BOOLEAN;
  v_taken INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'יש להתחבר כדי להירשם';
  END IF;

  -- Lock the meeting row so concurrent registrations for it run one at a time:
  -- the seat count below can't be overtaken between the check and the insert.
  SELECT m.starts_at, m.capacity, m.is_cancelled, w.is_published
    INTO v_starts_at, v_capacity, v_cancelled, v_published
  FROM public.workshop_meetings m
  JOIN public.workshops w ON w.id = m.workshop_id
  WHERE m.id = p_meeting_id
  FOR UPDATE OF m;

  IF NOT FOUND OR NOT v_published THEN
    RAISE EXCEPTION 'המפגש לא נמצא';
  END IF;
  IF v_cancelled THEN
    RAISE EXCEPTION 'המפגש בוטל';
  END IF;
  IF v_starts_at <= now() THEN
    RAISE EXCEPTION 'המפגש כבר התחיל';
  END IF;
  IF EXISTS (SELECT 1 FROM public.workshop_registrations
             WHERE meeting_id = p_meeting_id AND user_id = v_uid) THEN
    RAISE EXCEPTION 'כבר נרשמת למפגש הזה';
  END IF;

  SELECT count(*) INTO v_taken FROM public.workshop_registrations WHERE meeting_id = p_meeting_id;
  IF v_taken >= v_capacity THEN
    RAISE EXCEPTION 'המפגש מלא';
  END IF;

  INSERT INTO public.workshop_registrations (meeting_id, user_id) VALUES (p_meeting_id, v_uid);
END;
$$;

CREATE FUNCTION public.cancel_workshop_registration(p_meeting_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_starts_at TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'יש להתחבר כדי לבטל הרשמה';
  END IF;

  SELECT starts_at INTO v_starts_at FROM public.workshop_meetings WHERE id = p_meeting_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'המפגש לא נמצא';
  END IF;
  IF v_starts_at <= now() THEN
    RAISE EXCEPTION 'המפגש כבר התחיל, אי אפשר לבטל את ההרשמה';
  END IF;

  DELETE FROM public.workshop_registrations WHERE meeting_id = p_meeting_id AND user_id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'לא נרשמת למפגש הזה';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.workshop_meeting_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.register_workshop_meeting(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_workshop_registration(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.workshop_meeting_stats() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.register_workshop_meeting(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_workshop_registration(UUID) TO authenticated;
