
-- ============ Admin role helper ============
-- (has_role already exists; ensure admin can bypass profile visibility etc.)

-- ============ Characters ============
CREATE TABLE public.characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  avatar_url TEXT,
  color TEXT NOT NULL DEFAULT '#7c3aed',
  bio TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.characters TO authenticated;
GRANT ALL ON public.characters TO service_role;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "characters read all auth" ON public.characters FOR SELECT TO authenticated USING (true);
CREATE POLICY "characters admin all" ON public.characters FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
GRANT INSERT, UPDATE, DELETE ON public.characters TO authenticated;
CREATE TRIGGER trg_characters_updated BEFORE UPDATE ON public.characters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ Lessons ============
CREATE TYPE public.lesson_status AS ENUM ('draft','published','archived');

CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit INT NOT NULL DEFAULT 1,
  order_index INT NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  status public.lesson_status NOT NULL DEFAULT 'draft',
  xp_reward INT NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lessons TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lessons read published" ON public.lessons FOR SELECT TO authenticated
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "lessons admin all" ON public.lessons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_lessons_updated BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ Lesson steps (chat bubbles) ============
CREATE TYPE public.step_kind AS ENUM ('text','image','video','question');

CREATE TABLE public.lesson_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  order_index INT NOT NULL DEFAULT 0,
  character_id UUID REFERENCES public.characters(id) ON DELETE SET NULL,
  kind public.step_kind NOT NULL DEFAULT 'text',
  content TEXT,
  media_url TEXT,
  options JSONB, -- for questions: [{ text, is_correct }]
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.lesson_steps(lesson_id, order_index);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_steps TO authenticated;
GRANT ALL ON public.lesson_steps TO service_role;
ALTER TABLE public.lesson_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "steps read auth" ON public.lesson_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "steps admin all" ON public.lesson_steps FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_lesson_steps_updated BEFORE UPDATE ON public.lesson_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ Projects ============
CREATE TYPE public.project_stage AS ENUM ('idea','review','funding','funded','rejected');

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  cover_url TEXT,
  stage public.project_stage NOT NULL DEFAULT 'idea',
  target_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  raised_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  platform_share NUMERIC(5,2) NOT NULL DEFAULT 20,
  owner_share NUMERIC(5,2) NOT NULL DEFAULT 10,
  public_slug TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects read auth" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects insert own" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "projects update own or admin" ON public.projects FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "projects admin delete" ON public.projects FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ Project attachments ============
CREATE TABLE public.project_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  filename TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.project_attachments TO authenticated;
GRANT ALL ON public.project_attachments TO service_role;
ALTER TABLE public.project_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attach read auth" ON public.project_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "attach insert owner" ON public.project_attachments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "attach delete owner" ON public.project_attachments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- ============ Investments ============
CREATE TABLE public.project_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 10),
  share_pct NUMERIC(6,3) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.project_investments TO authenticated;
GRANT ALL ON public.project_investments TO service_role;
ALTER TABLE public.project_investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv read auth" ON public.project_investments FOR SELECT TO authenticated USING (true);
CREATE POLICY "inv insert self" ON public.project_investments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = investor_id);

-- ============ Project messages (team chat) ============
CREATE TABLE public.project_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.project_messages TO authenticated;
GRANT ALL ON public.project_messages TO service_role;
ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;
-- Members = owner + investors + admin
CREATE POLICY "pm read members" ON public.project_messages FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin')
  OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.project_investments i WHERE i.project_id = project_id AND i.investor_id = auth.uid())
);
CREATE POLICY "pm insert members" ON public.project_messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = sender_id AND (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.project_investments i WHERE i.project_id = project_id AND i.investor_id = auth.uid())
  )
);

-- ============ Admin message thread (idea submission) ============
CREATE TABLE public.admin_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  from_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_messages TO authenticated;
GRANT ALL ON public.admin_messages TO service_role;
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "am read own or admin" ON public.admin_messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));
CREATE POLICY "am insert self" ON public.admin_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- ============ Forum ============
CREATE TABLE public.forum_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.forum_threads TO authenticated;
GRANT UPDATE, DELETE ON public.forum_threads TO authenticated;
GRANT ALL ON public.forum_threads TO service_role;
ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ft read" ON public.forum_threads FOR SELECT TO authenticated USING (true);
CREATE POLICY "ft insert self" ON public.forum_threads FOR INSERT TO authenticated WITH CHECK (auth.uid()=author_id);
CREATE POLICY "ft edit own or admin" ON public.forum_threads FOR UPDATE TO authenticated
  USING (auth.uid()=author_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid()=author_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "ft delete own or admin" ON public.forum_threads FOR DELETE TO authenticated
  USING (auth.uid()=author_id OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.forum_posts TO authenticated;
GRANT ALL ON public.forum_posts TO service_role;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fp read" ON public.forum_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "fp insert self" ON public.forum_posts FOR INSERT TO authenticated WITH CHECK (auth.uid()=author_id);
CREATE POLICY "fp delete own or admin" ON public.forum_posts FOR DELETE TO authenticated
  USING (auth.uid()=author_id OR public.has_role(auth.uid(),'admin'));

-- ============ Notifications ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  href TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.notifications(user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif own" ON public.notifications FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "notif update own" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
