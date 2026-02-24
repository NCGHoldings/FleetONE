-- Fix the system_settings table to handle the logo URL properly
INSERT INTO system_settings (setting_key, setting_value, category, description)
VALUES ('company_logo_url', '"https://example.com/placeholder-logo.png"', 'branding', 'NCG Express company logo for sidebar display')
ON CONFLICT (setting_key) 
DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  updated_at = now();