ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS highlights jsonb NOT NULL DEFAULT '[]'::jsonb;