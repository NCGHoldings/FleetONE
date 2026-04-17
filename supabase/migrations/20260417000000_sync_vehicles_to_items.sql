-- =========================================================================
-- Vehicle Dealership → Inventory Items Deep Sync
-- Interlocks Yutong, Sinotruk, and Light Vehicles with Accounting Inventory
-- =========================================================================

-- 1. Create the Universal Sync Function
CREATE OR REPLACE FUNCTION sync_vehicle_to_item()
RETURNS TRIGGER AS $$
DECLARE
    v_item_code TEXT;
    v_item_name TEXT;
    v_selling_price NUMERIC;
    v_is_active BOOLEAN;
    v_company_id UUID;
    v_id_suffix TEXT;
BEGIN
    -- Resolve the default company (first active company)
    SELECT id INTO v_company_id FROM public.companies WHERE is_active = true ORDER BY created_at LIMIT 1;

    -- Short unique suffix from UUID to prevent item_code collisions
    v_id_suffix := upper(substr(NEW.id::text, 1, 6));

    -- Evaluate the Source Table to properly map columns to the universal Item Master
    IF TG_TABLE_NAME = 'yutong_bus_models' THEN
        v_item_code := COALESCE(NEW.model, 'YTG-' || v_id_suffix);
        v_item_name := NEW.model_name;
        v_selling_price := NEW.base_price;
        v_is_active := COALESCE(NEW.is_active, true);
        
    ELSIF TG_TABLE_NAME = 'sinotruck_truck_models' THEN
        v_item_code := 'SNT-' || NEW.model_name || '-' || v_id_suffix;
        v_item_name := NEW.model_name;
        v_selling_price := NEW.base_price;
        v_is_active := COALESCE(NEW.is_active, true);
        
    ELSIF TG_TABLE_NAME = 'lightvehicle_models' THEN
        v_item_code := 'LV-' || NEW.model_name || '-' || v_id_suffix;
        v_item_name := NEW.vehicle_name;
        v_selling_price := COALESCE(NEW.base_price, 0);
        v_is_active := COALESCE(NEW.is_active, true);
    END IF;

    -- Handle DELETE operations: soft-delete in items
    IF TG_OP = 'DELETE' THEN
        UPDATE public.items SET is_active = false WHERE id = OLD.id;
        RETURN OLD;
    END IF;

    -- Sync to the items table (Upsert using the same UUID)
    INSERT INTO public.items (
        id, 
        item_code, 
        item_name, 
        item_type, 
        selling_price, 
        standard_cost,
        is_serialized, 
        is_active,
        description,
        unit_of_measure,
        valuation_method,
        company_id
    )
    VALUES (
        NEW.id,
        v_item_code,
        v_item_name,
        'vehicle',
        COALESCE(v_selling_price, 0),
        COALESCE(v_selling_price, 0),
        true,
        COALESCE(v_is_active, true),
        'Auto-synced from ' || TG_TABLE_NAME || ' dealership catalog',
        'unit',
        'Specific Identification',
        v_company_id
    )
    ON CONFLICT (id) DO UPDATE SET
        item_code = EXCLUDED.item_code,
        item_name = EXCLUDED.item_name,
        selling_price = EXCLUDED.selling_price,
        standard_cost = EXCLUDED.standard_cost,
        is_active = EXCLUDED.is_active,
        company_id = EXCLUDED.company_id,
        updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Bind Triggers to All 3 Vehicle Tables

-- Yutong Bus Models
DROP TRIGGER IF EXISTS sync_yutong_to_inventory ON public.yutong_bus_models;
CREATE TRIGGER sync_yutong_to_inventory
AFTER INSERT OR UPDATE OR DELETE ON public.yutong_bus_models
FOR EACH ROW EXECUTE FUNCTION sync_vehicle_to_item();

-- Sinotruk Truck Models
DROP TRIGGER IF EXISTS sync_sinotruk_to_inventory ON public.sinotruck_truck_models;
CREATE TRIGGER sync_sinotruk_to_inventory
AFTER INSERT OR UPDATE OR DELETE ON public.sinotruck_truck_models
FOR EACH ROW EXECUTE FUNCTION sync_vehicle_to_item();

-- Light Vehicle Models
DROP TRIGGER IF EXISTS sync_light_vehicle_to_inventory ON public.lightvehicle_models;
CREATE TRIGGER sync_light_vehicle_to_inventory
AFTER INSERT OR UPDATE OR DELETE ON public.lightvehicle_models
FOR EACH ROW EXECUTE FUNCTION sync_vehicle_to_item();

-- 3. Backfill: Push ALL existing vehicles into the Items master list
DO $$
DECLARE
    v_company_id UUID;
BEGIN
    -- Resolve the default company
    SELECT id INTO v_company_id FROM public.companies WHERE is_active = true ORDER BY created_at LIMIT 1;

    -- Backfill Yutong
    INSERT INTO public.items (id, item_code, item_name, item_type, selling_price, standard_cost, is_serialized, is_active, description, unit_of_measure, valuation_method, company_id)
    SELECT 
        id,
        COALESCE(model, 'YTG-' || upper(substr(id::text, 1, 6))),
        model_name,
        'vehicle',
        base_price,
        base_price,
        true,
        COALESCE(is_active, true),
        'Backfilled from yutong_bus_models',
        'unit',
        'Specific Identification',
        v_company_id
    FROM public.yutong_bus_models
    ON CONFLICT (id) DO NOTHING;

    -- Backfill Sinotruk (append UUID suffix to prevent item_code collisions)
    INSERT INTO public.items (id, item_code, item_name, item_type, selling_price, standard_cost, is_serialized, is_active, description, unit_of_measure, valuation_method, company_id)
    SELECT 
        id,
        'SNT-' || model_name || '-' || upper(substr(id::text, 1, 6)),
        model_name,
        'vehicle',
        base_price,
        base_price,
        true,
        COALESCE(is_active, true),
        'Backfilled from sinotruck_truck_models',
        'unit',
        'Specific Identification',
        v_company_id
    FROM public.sinotruck_truck_models
    ON CONFLICT (id) DO NOTHING;

    -- Backfill Light Vehicles (append UUID suffix to prevent item_code collisions)
    INSERT INTO public.items (id, item_code, item_name, item_type, selling_price, standard_cost, is_serialized, is_active, description, unit_of_measure, valuation_method, company_id)
    SELECT 
        id,
        'LV-' || model_name || '-' || upper(substr(id::text, 1, 6)),
        vehicle_name,
        'vehicle',
        COALESCE(base_price, 0),
        COALESCE(base_price, 0),
        true,
        COALESCE(is_active, true),
        'Backfilled from lightvehicle_models',
        'unit',
        'Specific Identification',
        v_company_id
    FROM public.lightvehicle_models
    ON CONFLICT (id) DO NOTHING;
END $$;
