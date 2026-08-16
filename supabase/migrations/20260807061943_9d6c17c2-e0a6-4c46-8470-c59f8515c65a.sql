CREATE POLICY "storage read auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('avatars','project-files','lesson-media'));

CREATE POLICY "storage insert own folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('avatars','project-files','lesson-media')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "storage update own folder" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('avatars','project-files','lesson-media')
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id IN ('avatars','project-files','lesson-media')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "storage delete own folder" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id IN ('avatars','project-files','lesson-media')
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin'))
  );