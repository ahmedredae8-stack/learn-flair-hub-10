-- ============================================================
-- nilex — إعدادات المظهر (اللوجو والصور) + حساب أدمن
-- شغّل هذا الملف كاملاً في: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- 1) جدول إعدادات الموقع (اللوجو، صور الروبوت… إلخ)
CREATE TABLE IF NOT EXISTS public.site_settings (
  key         text PRIMARY KEY,
  value       text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT ON public.site_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read site settings" ON public.site_settings;
CREATE POLICY "Anyone can read site settings"
  ON public.site_settings FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage site settings" ON public.site_settings;
CREATE POLICY "Admins manage site settings"
  ON public.site_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) باكِت التخزين لصور المظهر (لوجو / روبوت)
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read branding" ON storage.objects;
CREATE POLICY "Public read branding" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'branding');

DROP POLICY IF EXISTS "Admins write branding" ON storage.objects;
CREATE POLICY "Admins write branding" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));

-- 3) منح دور الأدمن للحساب (غيّر البريد إن أردت حساباً آخر)
--    أنشئ الحساب أولاً من صفحة التسجيل، ثم شغّل هذا الجزء.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'admin@nilex.app'
ON CONFLICT (user_id, role) DO NOTHING;

-- 4) تأكيد البريد فوراً (لو خاصية تأكيد البريد ما زالت مفعّلة)
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email = 'admin@nilex.app';
