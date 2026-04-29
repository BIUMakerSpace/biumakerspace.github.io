
-- BLOG POSTS
CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  author_name TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blog posts" ON public.blog_posts
  FOR SELECT USING (true);
CREATE POLICY "Users create own blog posts" ON public.blog_posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own blog posts" ON public.blog_posts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Users delete own blog posts" ON public.blog_posts
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE TRIGGER blog_posts_updated_at BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- FORUM QUESTIONS
CREATE TABLE public.forum_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  author_name TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.forum_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view questions" ON public.forum_questions
  FOR SELECT USING (true);
CREATE POLICY "Users create own questions" ON public.forum_questions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own questions" ON public.forum_questions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Users delete own questions" ON public.forum_questions
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE TRIGGER forum_questions_updated_at BEFORE UPDATE ON public.forum_questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- FORUM REPLIES
CREATE TABLE public.forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.forum_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view replies" ON public.forum_replies
  FOR SELECT USING (true);
CREATE POLICY "Users create own replies" ON public.forum_replies
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own replies" ON public.forum_replies
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Users delete own replies" ON public.forum_replies
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- BLOG IMAGES BUCKET
INSERT INTO storage.buckets (id, name, public) VALUES ('blog-images', 'blog-images', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Blog images are public" ON storage.objects
  FOR SELECT USING (bucket_id = 'blog-images');
CREATE POLICY "Users upload own blog images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'blog-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own blog images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'blog-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- INVENTORY AUTOMATION ON LEND STATUS CHANGE
CREATE OR REPLACE FUNCTION public.handle_lend_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Transition to delivered: decrement available
  IF NEW.status = 'delivered' AND COALESCE(OLD.status, '') <> 'delivered' AND NEW.delivered_at IS NOT NULL AND OLD.delivered_at IS NULL THEN
    UPDATE public.catalog_items ci
    SET quantity_available = GREATEST(0, ci.quantity_available - lri.quantity)
    FROM public.lend_request_items lri
    WHERE lri.request_id = NEW.id AND lri.item_id = ci.id;
  END IF;

  -- Transition to returned: restore available
  IF NEW.status = 'returned' AND COALESCE(OLD.status, '') <> 'returned' AND NEW.returned_at IS NOT NULL AND OLD.returned_at IS NULL THEN
    UPDATE public.catalog_items ci
    SET quantity_available = LEAST(ci.quantity_total, ci.quantity_available + lri.quantity)
    FROM public.lend_request_items lri
    WHERE lri.request_id = NEW.id AND lri.item_id = ci.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER lend_status_inventory
  AFTER UPDATE ON public.lend_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_lend_status_change();
