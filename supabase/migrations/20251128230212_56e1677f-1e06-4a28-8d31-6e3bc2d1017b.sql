-- Add settings for global ad controls
INSERT INTO app_settings (setting_key, setting_value)
VALUES 
  ('cards_ads_enabled', 'true'),
  ('site_ads_enabled', 'true')
ON CONFLICT (setting_key) DO NOTHING;