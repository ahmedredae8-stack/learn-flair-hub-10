-- 1. Student moderation
DO $$ BEGIN
  CREATE TYPE public.account_status AS ENUM ('active','suspended','banned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status public.account_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS status_reason text,
  ADD COLUMN IF NOT EXISTS suspended_until timestamptz;

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Lessons: intro / objectives / summary
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS intro_text text,
  ADD COLUMN IF NOT EXISTS objectives jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS summary_points jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 3. Characters: multiple mood images
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS moods jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 4. Lesson step mood
ALTER TABLE public.lesson_steps
  ADD COLUMN IF NOT EXISTS mood text NOT NULL DEFAULT 'neutral';

-- 5. Lesson progress
CREATE TABLE IF NOT EXISTS public.lesson_progress (
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

-- 6. Forum: attachments, reactions, comments on posts
ALTER TABLE public.forum_threads
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.forum_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL DEFAULT '❤️',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS forum_reactions_thread_uniq ON public.forum_reactions(thread_id, user_id) WHERE thread_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS forum_reactions_post_uniq ON public.forum_reactions(post_id, user_id) WHERE post_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_reactions TO authenticated;
GRANT ALL ON public.forum_reactions TO service_role;
ALTER TABLE public.forum_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fr read" ON public.forum_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "fr insert self" ON public.forum_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fr update self" ON public.forum_reactions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fr delete self" ON public.forum_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 7. Project chat channels + pre-join contact
DO $$ BEGIN
  CREATE TYPE public.project_channel AS ENUM ('team','parents','admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.project_messages
  ADD COLUMN IF NOT EXISTS channel public.project_channel NOT NULL DEFAULT 'team',
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

DROP POLICY IF EXISTS "pm read members" ON public.project_messages;
DROP POLICY IF EXISTS "pm insert members" ON public.project_messages;
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

CREATE TABLE IF NOT EXISTS public.project_inquiries (
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

-- 8. Admin can send notifications
DROP POLICY IF EXISTS "notif insert admin" ON public.notifications;
CREATE POLICY "notif insert admin" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "notif delete admin" ON public.notifications;
CREATE POLICY "notif delete admin" ON public.notifications FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- 9. Admins can moderate forum content
DROP POLICY IF EXISTS "fp update own or admin" ON public.forum_posts;
CREATE POLICY "fp update own or admin" ON public.forum_posts FOR UPDATE TO authenticated
  USING (auth.uid() = author_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = author_id OR public.has_role(auth.uid(),'admin'));