
-- avatars: users manage their own folder {uid}/...
CREATE POLICY "avatars read auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');
CREATE POLICY "avatars write own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars update own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- project-files: everyone auth can read; owner/admin writes
CREATE POLICY "project-files read auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'project-files');
CREATE POLICY "project-files write auth" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "project-files delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'project-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- lesson-media: everyone auth reads; only admin writes
CREATE POLICY "lesson-media read auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'lesson-media');
CREATE POLICY "lesson-media admin write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lesson-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "lesson-media admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'lesson-media' AND public.has_role(auth.uid(), 'admin'));
