
-- Create bus_categories table
CREATE TABLE IF NOT EXISTS public.bus_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  icon TEXT DEFAULT 'bus',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bus_sub_categories table
CREATE TABLE IF NOT EXISTS public.bus_sub_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.bus_categories(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category_id, code)
);

-- Create bus_category_route_rules table
CREATE TABLE IF NOT EXISTS public.bus_category_route_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_pattern TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES public.bus_categories(id) ON DELETE CASCADE,
  sub_category_id UUID REFERENCES public.bus_sub_categories(id) ON DELETE SET NULL,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  matched_buses_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add category columns to buses table
ALTER TABLE public.buses 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.bus_categories(id),
ADD COLUMN IF NOT EXISTS sub_category_id UUID REFERENCES public.bus_sub_categories(id),
ADD COLUMN IF NOT EXISTS category_assignment_source TEXT DEFAULT 'manual';

-- Enable RLS
ALTER TABLE public.bus_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_sub_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_category_route_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view bus categories" ON public.bus_categories;
CREATE POLICY "Anyone can view bus categories" ON public.bus_categories FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage bus categories" ON public.bus_categories;
CREATE POLICY "Admins can manage bus categories" ON public.bus_categories FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));

DROP POLICY IF EXISTS "Anyone can view bus sub categories" ON public.bus_sub_categories;
CREATE POLICY "Anyone can view bus sub categories" ON public.bus_sub_categories FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage bus sub categories" ON public.bus_sub_categories;
CREATE POLICY "Admins can manage bus sub categories" ON public.bus_sub_categories FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));

DROP POLICY IF EXISTS "Anyone can view route rules" ON public.bus_category_route_rules;
CREATE POLICY "Anyone can view route rules" ON public.bus_category_route_rules FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage route rules" ON public.bus_category_route_rules;
CREATE POLICY "Admins can manage route rules" ON public.bus_category_route_rules FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));

-- Triggers
DROP TRIGGER IF EXISTS update_bus_categories_updated_at ON public.bus_categories;
CREATE TRIGGER update_bus_categories_updated_at BEFORE UPDATE ON public.bus_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_bus_sub_categories_updated_at ON public.bus_sub_categories;
CREATE TRIGGER update_bus_sub_categories_updated_at BEFORE UPDATE ON public.bus_sub_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_bus_category_route_rules_updated_at ON public.bus_category_route_rules;
CREATE TRIGGER update_bus_category_route_rules_updated_at BEFORE UPDATE ON public.bus_category_route_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed main categories
INSERT INTO public.bus_categories (code, name, description, color, icon, display_order) VALUES
('public_bus', 'Public Bus', 'Regular route buses for public transportation', '#3B82F6', 'bus', 1),
('school_bus', 'School Bus', 'Buses dedicated to school transportation services', '#8B5CF6', 'graduation-cap', 2),
('special_hire', 'Special Hire', 'Buses available for charter and special hire services', '#10B981', 'star', 3)
ON CONFLICT (code) DO NOTHING;

-- Seed sub-categories for Public Bus
INSERT INTO public.bus_sub_categories (category_id, code, name, description, color, display_order)
SELECT id, 'super_luxury', 'Super Luxury', 'Premium long-distance buses with AC and reclining seats', '#2563EB', 1
FROM public.bus_categories WHERE code = 'public_bus'
ON CONFLICT (category_id, code) DO NOTHING;

INSERT INTO public.bus_sub_categories (category_id, code, name, description, color, display_order)
SELECT id, 'semi_luxury', 'Semi Luxury', 'Comfortable buses with basic amenities', '#4F46E5', 2
FROM public.bus_categories WHERE code = 'public_bus'
ON CONFLICT (category_id, code) DO NOTHING;

INSERT INTO public.bus_sub_categories (category_id, code, name, description, color, display_order)
SELECT id, 'leyland', 'Leyland', 'Standard Leyland buses for regular routes', '#475569', 3
FROM public.bus_categories WHERE code = 'public_bus'
ON CONFLICT (category_id, code) DO NOTHING;

-- Auto-migrate: School buses (from school_routes via bus_reg_no)
UPDATE public.buses b
SET 
  category_id = (SELECT id FROM public.bus_categories WHERE code = 'school_bus'),
  category_assignment_source = 'auto_school_routes'
WHERE EXISTS (
  SELECT 1 FROM public.school_routes sr WHERE sr.bus_reg_no = b.bus_no
);

-- Auto-migrate: Super Luxury buses (Jaffna, Badulla routes)
UPDATE public.buses b
SET 
  category_id = (SELECT id FROM public.bus_categories WHERE code = 'public_bus'),
  sub_category_id = (SELECT s.id FROM public.bus_sub_categories s JOIN public.bus_categories c ON s.category_id = c.id WHERE c.code = 'public_bus' AND s.code = 'super_luxury'),
  category_assignment_source = 'auto_route_pattern'
WHERE b.category_id IS NULL
AND (b.route ILIKE '%Jaffna%' OR b.route ILIKE '%Badulla%' OR b.route ILIKE '%Moratuwa%' OR b.route ILIKE '%Makumbura%');

-- Auto-migrate: Buses in daily_trips -> Public Bus Semi Luxury
UPDATE public.buses b
SET 
  category_id = (SELECT id FROM public.bus_categories WHERE code = 'public_bus'),
  sub_category_id = (SELECT s.id FROM public.bus_sub_categories s JOIN public.bus_categories c ON s.category_id = c.id WHERE c.code = 'public_bus' AND s.code = 'semi_luxury'),
  category_assignment_source = 'auto_daily_trips'
WHERE b.category_id IS NULL
AND EXISTS (SELECT 1 FROM public.daily_trips dt WHERE dt.bus_id = b.id);

-- Auto-migrate: Remaining buses -> Public Bus Semi Luxury (default)
UPDATE public.buses b
SET 
  category_id = (SELECT id FROM public.bus_categories WHERE code = 'public_bus'),
  sub_category_id = (SELECT s.id FROM public.bus_sub_categories s JOIN public.bus_categories c ON s.category_id = c.id WHERE c.code = 'public_bus' AND s.code = 'semi_luxury'),
  category_assignment_source = 'default'
WHERE b.category_id IS NULL;
