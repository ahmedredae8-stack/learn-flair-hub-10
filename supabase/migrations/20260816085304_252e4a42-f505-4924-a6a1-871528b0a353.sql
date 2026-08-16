INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'admin@storylearn.app'
ON CONFLICT (user_id, role) DO NOTHING;

CREATE POLICY "branding readable by authenticated" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'branding');

CREATE POLICY "branding writable by admins" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "branding updatable by admins" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "branding deletable by admins" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));