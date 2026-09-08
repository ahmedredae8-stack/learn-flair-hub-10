CREATE POLICY "media read for signed in"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('branding','lesson-media'));

CREATE POLICY "media upload own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('branding','lesson-media') AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')));

CREATE POLICY "media update own or admin"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('branding','lesson-media') AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')));

CREATE POLICY "media delete own or admin"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('branding','lesson-media') AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')));