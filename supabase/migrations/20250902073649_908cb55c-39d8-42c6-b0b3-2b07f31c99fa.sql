-- Remove bus allocation tables since we're changing approach
DROP TABLE IF EXISTS yutong_addon_bus_allocations;

-- Add compatible bus models field to yutong_addons
ALTER TABLE yutong_addons 
ADD COLUMN compatible_bus_models jsonb DEFAULT '[]'::jsonb;