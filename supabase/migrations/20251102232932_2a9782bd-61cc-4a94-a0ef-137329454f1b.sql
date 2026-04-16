-- Create seasonal_themes table
CREATE TABLE IF NOT EXISTS public.seasonal_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  theme_config JSONB NOT NULL DEFAULT '{"colors":{"primary":"#default","accent":"#default","headerOverlay":"rgba(0,0,0,0)"},"animations":{"type":"none","density":"medium"},"decorations":{"logoOverlay":null,"backgroundPattern":null},"greeting":null}'::jsonb,
  preview_image_url TEXT,
  created_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create theme_presets table
CREATE TABLE IF NOT EXISTS public.theme_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  theme_config JSONB NOT NULL,
  preview_image_url TEXT,
  is_system_preset BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_seasonal_themes_dates ON public.seasonal_themes(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_seasonal_themes_enabled ON public.seasonal_themes(is_enabled);
CREATE INDEX IF NOT EXISTS idx_seasonal_themes_active ON public.seasonal_themes(is_active);

-- Enable RLS
ALTER TABLE public.seasonal_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_presets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for seasonal_themes
CREATE POLICY "Anyone can view seasonal themes"
  ON public.seasonal_themes
  FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert seasonal themes"
  ON public.seasonal_themes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Only admins can update seasonal themes"
  ON public.seasonal_themes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Only admins can delete seasonal themes"
  ON public.seasonal_themes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- RLS Policies for theme_presets
CREATE POLICY "Anyone can view theme presets"
  ON public.theme_presets
  FOR SELECT
  USING (true);

CREATE POLICY "Only super admins can insert theme presets"
  ON public.theme_presets
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Only super admins can update theme presets"
  ON public.theme_presets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Only super admins can delete non-system theme presets"
  ON public.theme_presets
  FOR DELETE
  USING (
    is_system_preset = false
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Insert system presets
INSERT INTO public.theme_presets (preset_name, category, theme_config, is_system_preset) VALUES
('Christmas Magic', 'christmas', '{"colors":{"primary":"#C41E3A","accent":"#165B33","gold":"#FFD700","headerOverlay":"linear-gradient(135deg, rgba(196,30,58,0.15), rgba(22,91,51,0.15))"},"animations":{"type":"snowflakes","density":"medium","color":"#FFFFFF"},"decorations":{"logoOverlay":"🎅","backgroundPattern":"snowflakes"},"greeting":"Merry Christmas & Happy Holidays! 🎄"}'::jsonb, true),

('Spooky Halloween', 'halloween', '{"colors":{"primary":"#FF6600","accent":"#6A0DAD","dark":"#1a1a1a","headerOverlay":"linear-gradient(135deg, rgba(255,102,0,0.2), rgba(106,13,173,0.2))"},"animations":{"type":"pumpkins","density":"low","color":"#FF6600"},"decorations":{"logoOverlay":"🎃","backgroundPattern":"bats"},"greeting":"Happy Halloween! 🎃👻"}'::jsonb, true),

('New Year Celebration', 'new_year', '{"colors":{"primary":"#FFD700","accent":"#C0C0C0","blue":"#1E90FF","headerOverlay":"linear-gradient(135deg, rgba(255,215,0,0.15), rgba(30,144,255,0.15))"},"animations":{"type":"fireworks","density":"high","color":"#FFD700"},"decorations":{"logoOverlay":"🎆","backgroundPattern":"sparkles"},"greeting":"Happy New Year! 🎆🥂"}'::jsonb, true),

('Diwali Festival', 'diwali', '{"colors":{"primary":"#FF5722","accent":"#FFEB3B","purple":"#9C27B0","headerOverlay":"linear-gradient(135deg, rgba(255,87,34,0.2), rgba(156,39,176,0.15))"},"animations":{"type":"diyas","density":"medium","color":"#FFEB3B"},"decorations":{"logoOverlay":"🪔","backgroundPattern":"rangoli"},"greeting":"Happy Diwali! May light triumph over darkness! 🪔✨"}'::jsonb, true),

('Valentine Love', 'valentines', '{"colors":{"primary":"#FF69B4","accent":"#DC143C","white":"#FFE4E9","headerOverlay":"linear-gradient(135deg, rgba(255,105,180,0.15), rgba(220,20,60,0.15))"},"animations":{"type":"hearts","density":"medium","color":"#FF69B4"},"decorations":{"logoOverlay":"💝","backgroundPattern":"hearts"},"greeting":"Happy Valentines Day! 💝"}'::jsonb, true);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_seasonal_themes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_seasonal_themes_updated_at
  BEFORE UPDATE ON public.seasonal_themes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_seasonal_themes_updated_at();

-- Function to check and update active themes based on current date
CREATE OR REPLACE FUNCTION public.update_active_seasonal_themes()
RETURNS void AS $$
BEGIN
  UPDATE public.seasonal_themes
  SET is_active = (
    CURRENT_DATE >= start_date 
    AND CURRENT_DATE <= end_date 
    AND is_enabled = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;