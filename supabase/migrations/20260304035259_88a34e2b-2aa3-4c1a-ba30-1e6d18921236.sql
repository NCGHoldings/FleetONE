INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES ('yutong_spreadsheet_access_code', '"YTSHT2026"', 'Access code for the public Yutong spreadsheet')
ON CONFLICT (setting_key) DO NOTHING;