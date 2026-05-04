
CREATE TABLE IF NOT EXISTS public.winning_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  display_name text,
  bookmaker text,
  ticket_id text,
  verify_code text,
  total_stake numeric DEFAULT 0,
  total_odds numeric DEFAULT 0,
  total_return numeric DEFAULT 0,
  total_bonus numeric DEFAULT 0,
  bet_type text,
  selections jsonb DEFAULT '[]'::jsonb,
  screenshot_url text,
  caption text,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  created_by_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.winning_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved reviews"
  ON public.winning_reviews FOR SELECT
  USING (status = 'approved' OR auth.uid() = user_id OR public.is_admin_user(auth.uid()));

CREATE POLICY "Users submit own reviews"
  ON public.winning_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

CREATE POLICY "Admins manage reviews"
  ON public.winning_reviews FOR UPDATE
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins delete reviews"
  ON public.winning_reviews FOR DELETE
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_reviews_status_created ON public.winning_reviews(status, created_at DESC);

CREATE TRIGGER trg_winning_reviews_updated_at
  BEFORE UPDATE ON public.winning_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public bucket for win screenshots (these are wins users want to show off)
INSERT INTO storage.buckets (id, name, public)
VALUES ('win-screenshots', 'win-screenshots', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read win screenshots"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'win-screenshots');

CREATE POLICY "Auth users upload win screenshots"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'win-screenshots');

CREATE POLICY "Users delete own win screenshots"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'win-screenshots' AND (owner = auth.uid() OR public.is_admin_user(auth.uid())));
