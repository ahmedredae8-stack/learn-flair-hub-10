-- 1) Profiles: restrict full-row reads to owner + admins; expose safe public fields via a view
DROP POLICY IF EXISTS "profiles readable by authenticated" ON public.profiles;
CREATE POLICY "profiles readable by owner or admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false) AS
  SELECT id, display_name, username, avatar_url, xp, streak
  FROM public.profiles;

REVOKE ALL ON public.public_profiles FROM anon, authenticated;
GRANT SELECT ON public.public_profiles TO authenticated;

-- 2) Storage: remove ownership-less branding/media write policies
DROP POLICY IF EXISTS "media upload by authenticated" ON storage.objects;
DROP POLICY IF EXISTS "media update by authenticated" ON storage.objects;
DROP POLICY IF EXISTS "media delete by admins" ON storage.objects;
CREATE POLICY "media delete admins only" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = ANY (ARRAY['branding','media']) AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "media write admins only" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "media update admins only" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'::app_role));

-- 3) Reduce SECURITY DEFINER function exposure
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;