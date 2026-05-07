
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage email templates" ON public.email_templates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER set_email_templates_updated_at BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.email_templates (key, label, subject, body) VALUES
  ('print_approved', 'הדפסה – אושר', 'בקשת ההדפסה שלך אושרה', 'שלום {first_name},

בקשת ההדפסה שלך אושרה ונכנסה לתור. נעדכן אותך כשהיא מוכנה.

מייקרספייס'),
  ('print_rejected', 'הדפסה – נדחה', 'בקשת ההדפסה שלך נדחתה', 'שלום {first_name},

לצערנו בקשת ההדפסה שלך נדחתה. נשמח לעזור לך להבין מדוע ולמצוא פתרון.

מייקרספייס'),
  ('print_printing', 'הדפסה – בהדפסה', 'ההדפסה שלך בעבודה', 'שלום {first_name},

התחלנו להדפיס את הקובץ שלך. נעדכן אותך כשיהיה מוכן לאיסוף.

מייקרספייס'),
  ('print_ready', 'הדפסה – מוכן לאיסוף', 'ההדפסה שלך מוכנה לאיסוף', 'שלום {first_name},

ההדפסה שלך מוכנה לאיסוף במייקרספייס.

מייקרספייס'),
  ('print_completed', 'הדפסה – הושלם', 'תודה!', 'שלום {first_name},

תודה שאספת את ההדפסה. מקווים שאהבת!

מייקרספייס'),
  ('lend_approved', 'השאלה – אושר', 'בקשת ההשאלה שלך אושרה', 'שלום {first_name},

בקשת ההשאלה שלך אושרה. נעדכן אותך מתי ניתן לאסוף.

מייקרספייס'),
  ('lend_rejected', 'השאלה – נדחה', 'בקשת ההשאלה שלך נדחתה', 'שלום {first_name},

לצערנו בקשת ההשאלה שלך נדחתה.

מייקרספייס'),
  ('lend_delivered', 'השאלה – נמסר', 'הציוד נמסר', 'שלום {first_name},

הציוד נמסר לך. נא להחזיר במצב תקין כשתסיים.

מייקרספייס'),
  ('lend_returned', 'השאלה – הוחזר', 'תודה על ההחזרה', 'שלום {first_name},

קיבלנו בחזרה את הציוד. תודה!

מייקרספייס');

CREATE TABLE public.wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  link text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage wishlist" ON public.wishlist_items
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER set_wishlist_items_updated_at BEFORE UPDATE ON public.wishlist_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
