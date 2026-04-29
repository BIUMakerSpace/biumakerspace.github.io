
-- Roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- has_role function (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.email
  );
  -- Default role: user
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Catalog items
CREATE TABLE public.catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  quantity_total INT NOT NULL DEFAULT 1,
  quantity_available INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Print requests (STL)
CREATE TABLE public.print_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  requester_phone TEXT NOT NULL,
  purpose TEXT NOT NULL,
  filament_color TEXT NOT NULL,
  stl_file_path TEXT NOT NULL,
  stl_file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lend requests
CREATE TABLE public.lend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  requester_phone TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  -- pending | approved | delivered | returned | rejected
  delivered_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.lend_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.lend_requests(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_print_updated BEFORE UPDATE ON public.print_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_lend_updated BEFORE UPDATE ON public.lend_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lend_request_items ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- user_roles policies
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- catalog_items policies
CREATE POLICY "Anyone can view catalog" ON public.catalog_items FOR SELECT USING (true);
CREATE POLICY "Admins manage catalog" ON public.catalog_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- print_requests policies
CREATE POLICY "Users view own print requests" ON public.print_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all print requests" ON public.print_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own print requests" ON public.print_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update print requests" ON public.print_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- lend_requests policies
CREATE POLICY "Users view own lend requests" ON public.lend_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all lend requests" ON public.lend_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own lend requests" ON public.lend_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update lend requests" ON public.lend_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- lend_request_items policies (mirror parent)
CREATE POLICY "Users view own lend items" ON public.lend_request_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.lend_requests lr WHERE lr.id = request_id AND lr.user_id = auth.uid())
);
CREATE POLICY "Admins view all lend items" ON public.lend_request_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own lend items" ON public.lend_request_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.lend_requests lr WHERE lr.id = request_id AND lr.user_id = auth.uid())
);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('stl-files', 'stl-files', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('catalog-images', 'catalog-images', true);

-- Storage policies for STL (private, users upload to their own folder, admins read all)
CREATE POLICY "Users upload own STL" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'stl-files' AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "Users read own STL" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'stl-files' AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "Admins read all STL" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'stl-files' AND public.has_role(auth.uid(), 'admin')
);

-- Catalog images (public read, admins write)
CREATE POLICY "Anyone view catalog images" ON storage.objects FOR SELECT USING (bucket_id = 'catalog-images');
CREATE POLICY "Admins upload catalog images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'catalog-images' AND public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Admins update catalog images" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'catalog-images' AND public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Admins delete catalog images" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'catalog-images' AND public.has_role(auth.uid(), 'admin')
);
