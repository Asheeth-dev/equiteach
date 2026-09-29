CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_name TEXT NOT NULL,
  class_subject TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('recruitment', 'in_service')),
  scores JSONB NOT NULL,
  total_score INTEGER NOT NULL CHECK (total_score BETWEEN 10 AND 50),
  tier TEXT NOT NULL CHECK (tier IN ('Critical', 'Developing', 'Proficient')),
  verdict TEXT NOT NULL,
  focus_metric TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.evaluations TO anon;
GRANT SELECT, INSERT ON public.evaluations TO authenticated;
GRANT ALL ON public.evaluations TO service_role;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create demo evaluations"
ON public.evaluations FOR INSERT TO anon, authenticated
WITH CHECK (
  jsonb_typeof(scores) = 'object'
  AND total_score BETWEEN 10 AND 50
  AND mode IN ('recruitment', 'in_service')
);
CREATE POLICY "Anyone can read demo evaluations"
ON public.evaluations FOR SELECT TO anon, authenticated
USING (true);
CREATE INDEX evaluations_created_at_idx ON public.evaluations (created_at DESC);