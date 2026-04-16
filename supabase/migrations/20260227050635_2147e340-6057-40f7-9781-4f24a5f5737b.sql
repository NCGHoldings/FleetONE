INSERT INTO system_settings (setting_key, setting_value, description, category)
VALUES ('yutong_report_access_code', '"YTR2026"', 'Access code for public Yutong Executive Report', 'yutong')
ON CONFLICT (setting_key) DO NOTHING;