DROP VIEW IF EXISTS public.public_profiles;

CREATE TABLE public.public_profiles (
  id uuid PRIMARY KEY,
  display_name text,
  username text,
  avatar_url text,
  xp integer NOT NULL DEFAULT 0,
  streak integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.public_profiles TO authenticated;
GRANT ALL ON public.public_profiles TO service_role;
ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public profiles readable by signed in" ON public.public_profiles
  FOR SELECT TO authenticated USING (true);

INSERT INTO public.public_profiles (id, display_name, username, avatar_url, xp, streak)
SELECT id, display_name, username, avatar_url, xp, streak FROM public.profiles
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_public_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  insert into public.public_profiles (id, display_name, username, avatar_url, xp, streak, updated_at)
  values (new.id, new.display_name, new.username, new.avatar_url, new.xp, new.streak, now())
  on conflict (id) do update set
    display_name = excluded.display_name,
    username = excluded.username,
    avatar_url = excluded.avatar_url,
    xp = excluded.xp,
    streak = excluded.streak,
    updated_at = now();
  return new;
end $$;

REVOKE ALL ON FUNCTION public.sync_public_profile() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER profiles_sync_public
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_public_profile();

CREATE OR REPLACE FUNCTION public.delete_public_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  delete from public.public_profiles where id = old.id;
  return old;
end $$;

REVOKE ALL ON FUNCTION public.delete_public_profile() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER profiles_sync_public_delete
AFTER DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.delete_public_profile();