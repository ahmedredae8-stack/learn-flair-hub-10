CREATE TABLE public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  number integer NOT NULL,
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '✨',
  color text NOT NULL DEFAULT 'primary',
  description text,
  cover_url text,
  order_index integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.units TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.units TO authenticated;
GRANT ALL ON public.units TO service_role;

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "units readable by everyone" ON public.units FOR SELECT USING (true);
CREATE POLICY "admins manage units" ON public.units FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_units_updated BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hearts_updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_active_date date,
  ADD COLUMN IF NOT EXISTS streak_freeze integer NOT NULL DEFAULT 0;

INSERT INTO public.units (course_id, number, name, emoji, color, order_index)
SELECT c.id, u.n, u.name, u.emoji, u.color, u.n
FROM public.courses c
CROSS JOIN (VALUES
  (1, 'مدخل إلى عالم العقل الرقمي', '🤖', 'primary'),
  (2, 'أسرار التوجيه وكتابة الأوامر', '✍️', 'accent'),
  (3, 'رحلة داخل تطبيق الدردشة', '💬', 'streak'),
  (4, 'سحر التصميم والرسومات', '🎨', 'primary'),
  (5, 'مدخل إلى البرمجة الذكية', '💻', 'accent'),
  (6, 'الاحتراف بأدوات الويب', '🛠️', 'streak'),
  (7, 'الصوت والفيديو بالذكاء الاصطناعي', '🎬', 'primary'),
  (8, 'البيانات والعروض الذكية', '📊', 'accent'),
  (9, 'حل المشكلات وابتكار الحلول', '💡', 'streak'),
  (10, 'ريادة الأعمال الرقمية', '🚀', 'primary')
) AS u(n, name, emoji, color)
WHERE c.slug = 'ai-tools';