
-- Add unique constraint on setting_key so upserts work properly
ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_setting_key_unique UNIQUE (setting_key);
