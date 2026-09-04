ALTER TABLE public.sure_odds
  ADD COLUMN IF NOT EXISTS competition text,
  ADD COLUMN IF NOT EXISTS league text;