ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS screenshot_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS deposit_requests_user_hash_unique
  ON public.deposit_requests (user_id, screenshot_hash)
  WHERE screenshot_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS deposit_requests_hash_idx
  ON public.deposit_requests (screenshot_hash)
  WHERE screenshot_hash IS NOT NULL;