-- Add visibility restriction column to yutong_bus_models
ALTER TABLE public.yutong_bus_models 
ADD COLUMN visibility TEXT DEFAULT 'all' CHECK (visibility IN ('all', 'super_admin_only'));

-- Add comment for documentation
COMMENT ON COLUMN public.yutong_bus_models.visibility IS 'Controls who can see this model: all = everyone, super_admin_only = restricted to super_admin role';

-- Update the C12 Pro Customized model to be super_admin only
UPDATE public.yutong_bus_models 
SET visibility = 'super_admin_only' 
WHERE id = '7e8a321d-fb2b-429d-b9ed-49ab9babc0cf';