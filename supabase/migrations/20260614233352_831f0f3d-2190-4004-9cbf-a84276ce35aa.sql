INSERT INTO public.app_settings (setting_key, setting_value) VALUES
  ('apk_banner_enabled', 'true'),
  ('apk_download_url', ''),
  ('apk_banner_title', 'Get the SPORTY CODES App'),
  ('apk_banner_text', 'Download the official Android APK for the fastest, smoothest experience. Lightning quick, fully offline-ready.'),
  ('apk_version', '1.0.0')
ON CONFLICT (setting_key) DO NOTHING;