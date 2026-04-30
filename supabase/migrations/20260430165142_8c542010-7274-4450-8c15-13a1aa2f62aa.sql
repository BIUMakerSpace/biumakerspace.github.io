CREATE TABLE public.filament_colors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  hex TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.filament_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active colors"
ON public.filament_colors FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage colors"
ON public.filament_colors FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_filament_colors_updated_at
BEFORE UPDATE ON public.filament_colors
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.filament_colors (name, hex, sort_order) VALUES
  ('שחור', '#1a1a1a', 1),
  ('לבן', '#f5f5f5', 2),
  ('אפור', '#888888', 3),
  ('כחול', '#2563eb', 4),
  ('אדום', '#dc2626', 5),
  ('ירוק', '#16a34a', 6),
  ('צהוב', '#eab308', 7),
  ('כתום', '#ea580c', 8);