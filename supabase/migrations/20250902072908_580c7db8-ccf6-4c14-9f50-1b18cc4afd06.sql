-- Create table for bus allocations to add-ons
CREATE TABLE yutong_addon_bus_allocations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  addon_id uuid NOT NULL REFERENCES yutong_addons(id) ON DELETE CASCADE,
  bus_id uuid REFERENCES buses(id) ON DELETE SET NULL,
  bus_registration text,
  allocation_date date NOT NULL DEFAULT CURRENT_DATE,
  quantity integer NOT NULL DEFAULT 1,
  notes text,
  status text NOT NULL DEFAULT 'allocated',
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create table for quotation add-ons
CREATE TABLE yutong_quotation_addons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id uuid NOT NULL REFERENCES yutong_quotations(id) ON DELETE CASCADE,
  addon_id uuid NOT NULL REFERENCES yutong_addons(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add RLS policies for bus allocations
ALTER TABLE yutong_addon_bus_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view addon bus allocations"
ON yutong_addon_bus_allocations
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage addon bus allocations"
ON yutong_addon_bus_allocations
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Add RLS policies for quotation add-ons
ALTER TABLE yutong_quotation_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view quotation addons"
ON yutong_quotation_addons
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage quotation addons"
ON yutong_quotation_addons
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_yutong_addon_bus_allocations_updated_at
BEFORE UPDATE ON yutong_addon_bus_allocations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_yutong_quotation_addons_updated_at
BEFORE UPDATE ON yutong_quotation_addons
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();