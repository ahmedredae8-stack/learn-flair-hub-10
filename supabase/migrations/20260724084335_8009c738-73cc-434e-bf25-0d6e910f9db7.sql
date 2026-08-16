
CREATE TABLE IF NOT EXISTS public.investments (
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
CREATE INDEX IF NOT EXISTS investments_project_idx ON public.investments(project_id);
