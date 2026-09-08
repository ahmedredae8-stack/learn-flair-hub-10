ALTER TYPE public.step_kind ADD VALUE IF NOT EXISTS 'simulation';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  is_first boolean;
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;

  select not exists (select 1 from public.user_roles where role = 'admin') into is_first;

  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  if is_first then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end $function$;

INSERT INTO public.site_settings (key, value) VALUES
  ('theme_preset', 'purple')
ON CONFLICT (key) DO NOTHING;