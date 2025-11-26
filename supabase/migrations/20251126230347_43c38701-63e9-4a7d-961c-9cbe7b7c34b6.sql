-- Add price field to matches (stored in localStorage but we need a proper table)
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_team_logo TEXT,
  away_team_logo TEXT,
  home_odds DECIMAL(10,2) NOT NULL,
  away_odds DECIMAL(10,2) NOT NULL,
  match_time TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('not-started', 'live', 'completed')),
  bet_code TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add price field to sure odds
CREATE TABLE IF NOT EXISTS public.sure_odds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_team_logo TEXT,
  away_team_logo TEXT,
  prediction TEXT NOT NULL,
  odds DECIMAL(10,2) NOT NULL,
  confidence TEXT NOT NULL,
  bet_code TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('not-started', 'scored', 'lost')),
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sure_odds ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Anyone can view matches"
ON public.matches
FOR SELECT
USING (true);

CREATE POLICY "Anyone can view sure odds"
ON public.sure_odds
FOR SELECT
USING (true);

-- Create simple admin policies (admin check will be done in application layer)
CREATE POLICY "Authenticated users can insert matches"
ON public.matches
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update matches"
ON public.matches
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete matches"
ON public.matches
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert sure odds"
ON public.sure_odds
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update sure odds"
ON public.sure_odds
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete sure odds"
ON public.sure_odds
FOR DELETE
TO authenticated
USING (true);

-- Add columns to track which item user paid for
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS item_type TEXT CHECK (item_type IN ('bet', 'sure-odd')),
ADD COLUMN IF NOT EXISTS item_id UUID;

-- Create index for faster payment lookups
CREATE INDEX IF NOT EXISTS idx_payments_email_status ON public.payments(user_email, status);
CREATE INDEX IF NOT EXISTS idx_payments_item ON public.payments(item_id, item_type);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_matches()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at_sure_odds()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_matches_updated_at
BEFORE UPDATE ON public.matches
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_matches();

CREATE TRIGGER update_sure_odds_updated_at
BEFORE UPDATE ON public.sure_odds
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_sure_odds();