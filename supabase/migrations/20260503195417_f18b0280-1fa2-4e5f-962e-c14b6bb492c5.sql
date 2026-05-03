ALTER TABLE public.sure_odds
  ADD COLUMN IF NOT EXISTS selections jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS bonus numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_postcard boolean NOT NULL DEFAULT false;