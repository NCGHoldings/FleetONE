-- Drop triggers that cause infinite recursion on seasonal_themes table
DROP TRIGGER IF EXISTS update_seasonal_themes_updated_at ON seasonal_themes;
DROP TRIGGER IF EXISTS on_seasonal_theme_change ON seasonal_themes;

-- Note: The edge function will now handle updated_at manually