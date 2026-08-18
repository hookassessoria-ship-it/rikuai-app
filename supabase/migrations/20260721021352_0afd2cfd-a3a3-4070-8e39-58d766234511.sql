
ALTER TABLE public.dream_goals
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS priority boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS milestones_reached integer[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.dream_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dream_id uuid NOT NULL REFERENCES public.dream_goals(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  contributed_at date NOT NULL DEFAULT current_date,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dream_contributions TO authenticated;
GRANT ALL ON public.dream_contributions TO service_role;

ALTER TABLE public.dream_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members access dream contributions" ON public.dream_contributions;
CREATE POLICY "Members access dream contributions"
  ON public.dream_contributions FOR ALL
  USING (public.has_workspace_access(auth.uid(), workspace_id))
  WITH CHECK (public.has_workspace_access(auth.uid(), workspace_id));

CREATE INDEX IF NOT EXISTS idx_dream_contributions_dream ON public.dream_contributions(dream_id);
CREATE INDEX IF NOT EXISTS idx_dream_contributions_ws ON public.dream_contributions(workspace_id);
