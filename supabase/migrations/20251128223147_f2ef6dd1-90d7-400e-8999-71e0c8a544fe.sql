-- Add ad_zone_id to sure_odds table for per-card ad zones
ALTER TABLE sure_odds ADD COLUMN ad_zone_id TEXT;

-- Create table for tracking ad view attempts (prevents abuse with 1-hour cooldown)
CREATE TABLE ad_view_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  sure_odd_id UUID NOT NULL REFERENCES sure_odds(id) ON DELETE CASCADE,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  granted_access BOOLEAN DEFAULT FALSE
);

-- Create index for faster lookups
CREATE INDEX idx_ad_view_attempts_user_odd ON ad_view_attempts(user_email, sure_odd_id);

-- Enable RLS
ALTER TABLE ad_view_attempts ENABLE ROW LEVEL SECURITY;

-- RLS policies for ad_view_attempts
CREATE POLICY "Users can view their own attempts"
  ON ad_view_attempts FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own attempts"
  ON ad_view_attempts FOR INSERT
  WITH CHECK (true);

-- Create table for global ad zones (site-wide banners, popups, etc.)
CREATE TABLE global_ad_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id TEXT NOT NULL,
  zone_name TEXT NOT NULL,
  placement TEXT NOT NULL CHECK (placement IN ('header', 'footer', 'sidebar', 'popup', 'interstitial')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for global_ad_zones
ALTER TABLE global_ad_zones ENABLE ROW LEVEL SECURITY;

-- RLS policies for global_ad_zones
CREATE POLICY "Anyone can view active zones"
  ON global_ad_zones FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage zones"
  ON global_ad_zones FOR ALL
  USING (true);

-- Create trigger for updating updated_at on global_ad_zones
CREATE TRIGGER update_global_ad_zones_updated_at
  BEFORE UPDATE ON global_ad_zones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();