CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  display_name text,
  avatar_url text,
  xp integer NOT NULL DEFAULT 0,
  streak integer NOT NULL DEFAULT 0,
  gems integer NOT NULL DEFAULT 100,
  hearts integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 6)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'boy')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;

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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.characters TO authenticated;
GRANT ALL ON public.characters TO service_role;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "characters read all auth" ON public.characters FOR SELECT TO authenticated USING (true);
CREATE POLICY "characters admin all" ON public.characters FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_characters_updated BEFORE UPDATE ON public.characters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lessons read published" ON public.lessons FOR SELECT TO authenticated
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "lessons admin all" ON public.lessons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_lessons_updated BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TYPE public.step_kind AS ENUM ('text','image','video','question');

CREATE TABLE public.lesson_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  order_index INT NOT NULL DEFAULT 0,
  character_id UUID REFERENCES public.characters(id) ON DELETE SET NULL,
  kind public.step_kind NOT NULL DEFAULT 'text',
  content TEXT,
  media_url TEXT,
  options JSONB,
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
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

CREATE TABLE public.forum_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_threads TO authenticated;
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_posts TO authenticated;
GRANT ALL ON public.forum_posts TO service_role;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fp read" ON public.forum_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "fp insert self" ON public.forum_posts FOR INSERT TO authenticated WITH CHECK (auth.uid()=author_id);
CREATE POLICY "fp delete own or admin" ON public.forum_posts FOR DELETE TO authenticated
  USING (auth.uid()=author_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "fp update own or admin" ON public.forum_posts FOR UPDATE TO authenticated
  USING (auth.uid() = author_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = author_id OR public.has_role(auth.uid(),'admin'));

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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif own" ON public.notifications FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "notif update own" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE POLICY "notif insert admin" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "notif delete admin" ON public.notifications FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  investor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount >= 10),
  share_pct numeric(6,3) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.investments TO authenticated;
GRANT ALL ON public.investments TO service_role;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invest read auth" ON public.investments FOR SELECT TO authenticated USING (true);
CREATE POLICY "invest insert self" ON public.investments FOR INSERT TO authenticated WITH CHECK (investor_id = auth.uid());
CREATE INDEX investments_project_idx ON public.investments(project_id);

CREATE TYPE public.account_status AS ENUM ('active','suspended','banned');

ALTER TABLE public.profiles
  ADD COLUMN status public.account_status NOT NULL DEFAULT 'active',
  ADD COLUMN status_reason text,
  ADD COLUMN suspended_until timestamptz;

CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.lessons
  ADD COLUMN intro_text text,
  ADD COLUMN objectives jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN summary_points jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.characters
  ADD COLUMN moods jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.lesson_steps
  ADD COLUMN mood text NOT NULL DEFAULT 'neutral';

CREATE TABLE public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed_at timestamptz,
  xp_earned integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lp read own or admin" ON public.lesson_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "lp insert own" ON public.lesson_progress FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lp update own" ON public.lesson_progress FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER lesson_progress_updated_at BEFORE UPDATE ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.forum_threads ADD COLUMN attachments jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.forum_posts ADD COLUMN attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE public.forum_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL DEFAULT '❤️',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX forum_reactions_thread_uniq ON public.forum_reactions(thread_id, user_id) WHERE thread_id IS NOT NULL;
CREATE UNIQUE INDEX forum_reactions_post_uniq ON public.forum_reactions(post_id, user_id) WHERE post_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_reactions TO authenticated;
GRANT ALL ON public.forum_reactions TO service_role;
ALTER TABLE public.forum_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fr read" ON public.forum_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "fr insert self" ON public.forum_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fr update self" ON public.forum_reactions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fr delete self" ON public.forum_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TYPE public.project_channel AS ENUM ('team','parents','admin');

ALTER TABLE public.project_messages
  ADD COLUMN channel public.project_channel NOT NULL DEFAULT 'team',
  ADD COLUMN attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE POLICY "pm read members" ON public.project_messages FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_messages.project_id AND p.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.project_investments i WHERE i.project_id = project_messages.project_id AND i.investor_id = auth.uid())
  );
CREATE POLICY "pm insert members" ON public.project_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND (
      public.has_role(auth.uid(),'admin')
      OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_messages.project_id AND p.owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.project_investments i WHERE i.project_id = project_messages.project_id AND i.investor_id = auth.uid())
    )
  );

CREATE TABLE public.project_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.project_inquiries TO authenticated;
GRANT ALL ON public.project_inquiries TO service_role;
ALTER TABLE public.project_inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pi insert self" ON public.project_inquiries FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "pi read parties" ON public.project_inquiries FOR SELECT TO authenticated
  USING (
    auth.uid() = sender_id
    OR public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_inquiries.project_id AND p.owner_id = auth.uid())
  );

CREATE TABLE public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  emoji text not null default '✨',
  color text not null default 'primary',
  status public.lesson_status not null default 'published',
  coming_soon boolean not null default false,
  order_index integer not null default 0,
  is_paid boolean NOT NULL DEFAULT false,
  price numeric NOT NULL DEFAULT 0,
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  cover_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "courses read" ON public.courses FOR SELECT TO authenticated USING (status = 'published' OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "courses admin all" ON public.courses FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_courses_updated BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.lessons ADD COLUMN course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;
ALTER TABLE public.lesson_steps ADD COLUMN admin_note text;

INSERT INTO public.courses (slug, title, subtitle, emoji, color, order_index, coming_soon, is_paid, price, highlights)
VALUES
  ('ai-tools','أدوات الذكاء الاصطناعي','تعلّم تتكلم مع الذكاء الاصطناعي وتصنع به أي شيء','🤖','primary',1,false,false,0,'["100 درس تفاعلي بأسلوب المحادثة","مشاريع عملية بأدوات حقيقية","شهادة تقدم ونقاط XP"]'::jsonb),
  ('physical-world','العالم المادي وبناء المنتجات','حوّل أفكارك إلى منتجات حقيقية تُلمس وتُباع','🛠️','streak',2,true,false,0,'["من الفكرة إلى منتج ملموس","إلكترونيات وطباعة ثلاثية الأبعاد","تجارب عملية آمنة للأطفال"]'::jsonb),
  ('design','التصميم الرقمي بالذكاء الاصطناعي','تعلّم تصميم الواجهات والهوية البصرية بأدوات الذكاء الاصطناعي.','🎨','accent',3,true,true,199,'["أساسيات الألوان والخطوط","تصميم شعار وهوية كاملة","تحويل الفكرة إلى واجهة تطبيق"]'::jsonb),
  ('coding','البرمجة للمبتكرين الصغار','من أول سطر كود إلى تطبيق حقيقي يعمل على الإنترنت.','💻','primary',4,true,true,249,'["مفاهيم البرمجة بأسلوب مبسّط","بناء موقعك الأول خطوة بخطوة","استخدام الذكاء الاصطناعي كمساعد برمجة"]'::jsonb),
  ('products','بناء وإطلاق المنتجات','كيف تحوّل مشروعك إلى منتج يستخدمه الناس فعلاً.','🚀','streak',5,true,true,299,'["دراسة الفكرة والجمهور","بناء نموذج أولي سريع","الإطلاق والتسويق الذكي"]'::jsonb);

INSERT INTO public.characters (name, color, bio) VALUES
  ('زكي','#7c3aed','مرشدك الذكي في رحلة nilex'),
  ('نور','#e11d48','زميلتك الفضولية في الفصل، دايماً عندها سؤال!'),
  ('أ. سارة','#0ea5e9','معلمة التقنية، تشرح ببساطة وتحب التجارب');