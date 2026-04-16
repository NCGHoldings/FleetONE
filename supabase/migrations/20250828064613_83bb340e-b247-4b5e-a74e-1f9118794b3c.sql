-- Insert or update the company logo setting
INSERT INTO system_settings (setting_key, setting_value, category, description)
VALUES ('company_logo_url', '/src/assets/ncg-express-logo.png', 'branding', 'NCG Express company logo for sidebar display')
ON CONFLICT (setting_key) 
DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  updated_at = now();