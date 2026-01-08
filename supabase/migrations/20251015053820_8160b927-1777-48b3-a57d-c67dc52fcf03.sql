-- Add bus_fleet_details column to store multiple bus types in a single quotation
ALTER TABLE special_hire_quotations 
ADD COLUMN IF NOT EXISTS bus_fleet_details JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN special_hire_quotations.bus_fleet_details IS 
'Stores details for quotations with multiple bus types. Structure: {"buses": [{"bus_type_id": "uuid", "bus_type_name": "text", "quantity": number, "seating_capacity": number, "hire_charge_per_bus": number, "fuel_cost_per_bus": number, "maintenance_cost_per_bus": number, "subtotal_per_bus": number, "subtotal_all_buses": number}], "total_buses": number, "total_capacity": number, "combined_subtotal": number}';

-- Create GIN index for efficient JSONB querying
CREATE INDEX IF NOT EXISTS idx_special_hire_quotations_bus_fleet 
ON special_hire_quotations USING GIN (bus_fleet_details);