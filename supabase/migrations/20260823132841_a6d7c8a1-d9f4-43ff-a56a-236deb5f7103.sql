-- Enums
create type public.app_role as enum ('admin','user');
create type public.account_status as enum ('active','suspended','banned');
create type public.lesson_status as enum ('draft','published','archived');
create type public.step_kind as enum ('text','image','video','question');
create type public.project_channel as enum ('team','parents','admin');
create type public.project_stage as enum ('idea','review','funding','funded','rejected');

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "admins read all roles" on public.user_roles for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admins manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.profiles (
  id uuid primary key,
  username text unique,
  display_name text,
  avatar_url text,
  xp integer not null default 0,
  gems integer not null default 0,
  hearts integer not null default 5,
  hearts_updated_at timestamptz not null default now(),
  streak integer not null default 0,
  streak_freeze integer not null default 0,
  last_active_date date,
  status public.account_status not null default 'active',
  status_reason text,
  suspended_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable by authenticated" on public.profiles for select to authenticated using (true);
create policy "update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "admins manage profiles" on public.profiles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  emoji text not null default '📘',
  color text not null default 'primary',
  cover_url text,
  highlights jsonb not null default '[]'::jsonb,
  status public.lesson_status not null default 'draft',
  coming_soon boolean not null default false,
  is_paid boolean not null default false,
  price numeric not null default 0,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.units (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  number integer not null,
  name text not null,
  emoji text not null default '📘',
  color text not null default 'primary',
  description text,
  cover_url text,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  unit integer not null default 1,
  title text not null,
  description text,
  intro_text text,
  cover_url text,
  objectives jsonb not null default '[]'::jsonb,
  summary_points jsonb not null default '[]'::jsonb,
  status public.lesson_status not null default 'draft',
  xp_reward integer not null default 10,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.characters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bio text,
  color text not null default 'primary',
  avatar_url text,
  moods jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.lesson_steps (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  character_id uuid references public.characters(id) on delete set null,
  kind public.step_kind not null default 'text',
  content text,
  mood text not null default 'neutral',
  media_url text,
  options jsonb,
  admin_note text,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.units(course_id);
create index on public.lessons(course_id);
create index on public.lesson_steps(lesson_id);

grant select on public.courses, public.units, public.lessons, public.lesson_steps, public.characters to anon, authenticated;
grant insert, update, delete on public.courses, public.units, public.lessons, public.lesson_steps, public.characters to authenticated;
grant all on public.courses, public.units, public.lessons, public.lesson_steps, public.characters to service_role;

alter table public.courses enable row level security;
alter table public.units enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_steps enable row level security;
alter table public.characters enable row level security;

create policy "courses readable" on public.courses for select using (true);
create policy "units readable" on public.units for select using (true);
create policy "lessons readable" on public.lessons for select using (true);
create policy "lesson_steps readable" on public.lesson_steps for select using (true);
create policy "characters readable" on public.characters for select using (true);
create policy "courses admin" on public.courses for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "units admin" on public.units for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "lessons admin" on public.lessons for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "lesson_steps admin" on public.lesson_steps for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "characters admin" on public.characters for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create trigger courses_updated before update on public.courses for each row execute function public.set_updated_at();
create trigger units_updated before update on public.units for each row execute function public.set_updated_at();
create trigger lessons_updated before update on public.lessons for each row execute function public.set_updated_at();
create trigger characters_updated before update on public.characters for each row execute function public.set_updated_at();
create trigger lesson_steps_updated before update on public.lesson_steps for each row execute function public.set_updated_at();

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  xp_earned integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);
grant select, insert, update, delete on public.lesson_progress to authenticated;
grant all on public.lesson_progress to service_role;
alter table public.lesson_progress enable row level security;
create policy "own progress" on public.lesson_progress for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "admins read progress" on public.lesson_progress for select to authenticated using (public.has_role(auth.uid(),'admin'));
create trigger lesson_progress_updated before update on public.lesson_progress for each row execute function public.set_updated_at();

create table public.site_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);
grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;
grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;
create policy "settings readable" on public.site_settings for select using (true);
create policy "settings admin" on public.site_settings for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null,
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "own notifications" on public.notifications for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "admins insert notifications" on public.notifications for insert to authenticated with check (public.has_role(auth.uid(),'admin'));

create table public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null,
  title text not null,
  body text,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create table public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.forum_threads(id) on delete cascade,
  author_id uuid not null,
  body text not null,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create table public.forum_reactions (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.forum_threads(id) on delete cascade,
  post_id uuid references public.forum_posts(id) on delete cascade,
  user_id uuid not null,
  emoji text not null default '👍',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.forum_threads, public.forum_posts, public.forum_reactions to authenticated;
grant all on public.forum_threads, public.forum_posts, public.forum_reactions to service_role;
alter table public.forum_threads enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_reactions enable row level security;
create policy "threads readable" on public.forum_threads for select to authenticated using (true);
create policy "threads own write" on public.forum_threads for insert to authenticated with check (auth.uid() = author_id);
create policy "threads own manage" on public.forum_threads for update to authenticated using (auth.uid() = author_id or public.has_role(auth.uid(),'admin'));
create policy "threads own delete" on public.forum_threads for delete to authenticated using (auth.uid() = author_id or public.has_role(auth.uid(),'admin'));
create policy "posts readable" on public.forum_posts for select to authenticated using (true);
create policy "posts own write" on public.forum_posts for insert to authenticated with check (auth.uid() = author_id);
create policy "posts own manage" on public.forum_posts for update to authenticated using (auth.uid() = author_id or public.has_role(auth.uid(),'admin'));
create policy "posts own delete" on public.forum_posts for delete to authenticated using (auth.uid() = author_id or public.has_role(auth.uid(),'admin'));
create policy "reactions readable" on public.forum_reactions for select to authenticated using (true);
create policy "reactions own" on public.forum_reactions for insert to authenticated with check (auth.uid() = user_id);
create policy "reactions own delete" on public.forum_reactions for delete to authenticated using (auth.uid() = user_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  title text not null,
  description text not null,
  cover_url text,
  public_slug text unique,
  stage public.project_stage not null default 'idea',
  target_amount numeric not null default 0,
  raised_amount numeric not null default 0,
  owner_share numeric not null default 70,
  platform_share numeric not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.project_attachments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  file_url text not null,
  filename text,
  created_at timestamptz not null default now()
);
create table public.project_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  sender_id uuid not null,
  channel public.project_channel not null default 'team',
  body text not null,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create table public.project_inquiries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  sender_id uuid not null,
  body text not null,
  created_at timestamptz not null default now()
);
create table public.project_investments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  investor_id uuid not null,
  amount numeric not null,
  share_pct numeric not null default 0,
  created_at timestamptz not null default now()
);
create table public.investments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  investor_id uuid not null,
  amount numeric not null,
  share_pct numeric not null default 0,
  created_at timestamptz not null default now()
);
create table public.admin_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  sender_id uuid not null,
  body text not null,
  from_admin boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.projects, public.project_attachments, public.project_messages, public.project_inquiries, public.project_investments, public.investments, public.admin_messages to authenticated;
grant all on public.projects, public.project_attachments, public.project_messages, public.project_inquiries, public.project_investments, public.investments, public.admin_messages to service_role;
alter table public.projects enable row level security;
alter table public.project_attachments enable row level security;
alter table public.project_messages enable row level security;
alter table public.project_inquiries enable row level security;
alter table public.project_investments enable row level security;
alter table public.investments enable row level security;
alter table public.admin_messages enable row level security;

create policy "projects readable" on public.projects for select to authenticated using (true);
create policy "projects own write" on public.projects for insert to authenticated with check (auth.uid() = owner_id);
create policy "projects own update" on public.projects for update to authenticated using (auth.uid() = owner_id or public.has_role(auth.uid(),'admin'));
create policy "projects own delete" on public.projects for delete to authenticated using (auth.uid() = owner_id or public.has_role(auth.uid(),'admin'));

create policy "attachments readable" on public.project_attachments for select to authenticated using (true);
create policy "attachments by owner" on public.project_attachments for all to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and (p.owner_id = auth.uid() or public.has_role(auth.uid(),'admin'))))
  with check (exists (select 1 from public.projects p where p.id = project_id and (p.owner_id = auth.uid() or public.has_role(auth.uid(),'admin'))));

create policy "pmsg readable" on public.project_messages for select to authenticated
  using (sender_id = auth.uid() or public.has_role(auth.uid(),'admin') or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy "pmsg insert" on public.project_messages for insert to authenticated with check (auth.uid() = sender_id);

create policy "inq readable" on public.project_inquiries for select to authenticated
  using (sender_id = auth.uid() or public.has_role(auth.uid(),'admin') or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy "inq insert" on public.project_inquiries for insert to authenticated with check (auth.uid() = sender_id);

create policy "pinv readable" on public.project_investments for select to authenticated
  using (investor_id = auth.uid() or public.has_role(auth.uid(),'admin') or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy "pinv insert" on public.project_investments for insert to authenticated with check (auth.uid() = investor_id);

create policy "inv readable" on public.investments for select to authenticated
  using (investor_id = auth.uid() or public.has_role(auth.uid(),'admin') or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy "inv insert" on public.investments for insert to authenticated with check (auth.uid() = investor_id);

create policy "amsg readable" on public.admin_messages for select to authenticated
  using (sender_id = auth.uid() or public.has_role(auth.uid(),'admin') or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy "amsg insert" on public.admin_messages for insert to authenticated with check (auth.uid() = sender_id);

create trigger projects_updated before update on public.projects for each row execute function public.set_updated_at();

create policy "branding public read" on storage.objects for select using (bucket_id in ('branding','media'));
create policy "media upload by authenticated" on storage.objects for insert to authenticated with check (bucket_id in ('branding','media'));
create policy "media update by authenticated" on storage.objects for update to authenticated using (bucket_id in ('branding','media'));
create policy "media delete by admins" on storage.objects for delete to authenticated using (bucket_id in ('branding','media') and public.has_role(auth.uid(),'admin'));