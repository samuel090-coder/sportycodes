-- Insert SEO settings into app_settings table
INSERT INTO public.app_settings (setting_key, setting_value) VALUES
('seo_site_title', 'SPORTY CODES - Sure Football Predictions | 2+ Odds Daily | Fixed Matches & Winning Tips'),
('seo_meta_description', 'Get daily sure football predictions with 2+ odds, correct scores, and winning betting tips. Access fixed matches, hacked predictions, and expert football analysis. 90%+ win rate guaranteed.'),
('seo_meta_keywords', 'football predictions, sure odds, 2+ odds daily, football tips, correct score predictions, fixed matches, hacked football predictions, betting tips, winning football site, football analysis, today match prediction, sure bet codes, football winning tips, daily football odds, soccer predictions, betting codes today'),
('seo_canonical_url', 'https://yourdomain.com'),
('seo_og_image', 'https://yourdomain.com/icon-512.png'),
('seo_twitter_handle', '@SportyCodes'),
('seo_google_verification', ''),
('seo_bing_verification', ''),
('seo_last_updated', NOW()::TEXT)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = NOW();