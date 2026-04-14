-- Create trigger to automatically update active seasonal themes
CREATE OR REPLACE FUNCTION public.trigger_update_active_themes()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate active status for all themes
  PERFORM public.update_active_seasonal_themes();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add trigger on seasonal_themes table
DROP TRIGGER IF EXISTS on_seasonal_theme_change ON public.seasonal_themes;
CREATE TRIGGER on_seasonal_theme_change
  AFTER INSERT OR UPDATE ON public.seasonal_themes
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_update_active_themes();