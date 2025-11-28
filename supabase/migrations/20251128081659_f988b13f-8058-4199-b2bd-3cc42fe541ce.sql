-- Add stake and payout fields to sure_odds table
ALTER TABLE sure_odds 
ADD COLUMN IF NOT EXISTS stake numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS payout numeric DEFAULT 0;

-- Create a table to store app settings like WhatsApp number
CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value text NOT NULL,
  updated_at timestamp with time zone DEFAULT now()
);

-- Insert default WhatsApp number
INSERT INTO app_settings (setting_key, setting_value)
VALUES ('whatsapp_number', '+2349067423764')
ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS on app_settings
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read settings
CREATE POLICY "Anyone can view app settings"
ON app_settings FOR SELECT
USING (true);

-- Only allow updates (admin will update via edge function)
CREATE POLICY "Authenticated users can update settings"
ON app_settings FOR UPDATE
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON app_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();