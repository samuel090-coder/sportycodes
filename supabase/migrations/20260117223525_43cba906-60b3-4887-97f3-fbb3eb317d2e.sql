-- Insert default bank details settings
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES 
  ('bank_name', 'First Bank'),
  ('account_name', 'SportyCodes'),
  ('account_number', '1234567890')
ON CONFLICT (setting_key) DO NOTHING;