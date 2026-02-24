-- Add missing rate cards for Outside hire type to cover longer distances
-- Get the bus type IDs first
DO $$
DECLARE
    bus_type_record RECORD;
BEGIN
    -- Add rate cards for 101-300km range for Outside hire type
    FOR bus_type_record IN SELECT id FROM bus_types WHERE is_active = true
    LOOP
        INSERT INTO hire_rate_cards (
            hire_type,
            bus_type_id,
            from_km,
            to_km,
            flat_fee_lkr,
            standard_hours,
            overtime_rate_lkr_per_hour,
            overnight_charge_lkr_per_day,
            exceeding_km_rate_lkr,
            free_exceeding_km,
            effective_from,
            is_active
        ) VALUES (
            'Outside',
            bus_type_record.id,
            101,
            300,
            45000,
            20,
            500,
            10000,
            175,
            10,
            CURRENT_DATE,
            true
        );
        
        -- Add rate cards for 301-500km range for Outside hire type
        INSERT INTO hire_rate_cards (
            hire_type,
            bus_type_id,
            from_km,
            to_km,
            flat_fee_lkr,
            standard_hours,
            overtime_rate_lkr_per_hour,
            overnight_charge_lkr_per_day,
            exceeding_km_rate_lkr,
            free_exceeding_km,
            effective_from,
            is_active
        ) VALUES (
            'Outside',
            bus_type_record.id,
            301,
            500,
            65000,
            24,
            500,
            10000,
            175,
            15,
            CURRENT_DATE,
            true
        );
        
        -- Add rate cards for 501-1000km range for Outside hire type
        INSERT INTO hire_rate_cards (
            hire_type,
            bus_type_id,
            from_km,
            to_km,
            flat_fee_lkr,
            standard_hours,
            overtime_rate_lkr_per_hour,
            overnight_charge_lkr_per_day,
            exceeding_km_rate_lkr,
            free_exceeding_km,
            effective_from,
            is_active
        ) VALUES (
            'Outside',
            bus_type_record.id,
            501,
            1000,
            95000,
            32,
            500,
            10000,
            175,
            20,
            CURRENT_DATE,
            true
        );
        
        -- Add rate cards for 1000+km range (unlimited) for Outside hire type
        INSERT INTO hire_rate_cards (
            hire_type,
            bus_type_id,
            from_km,
            to_km,
            flat_fee_lkr,
            standard_hours,
            overtime_rate_lkr_per_hour,
            overnight_charge_lkr_per_day,
            exceeding_km_rate_lkr,
            free_exceeding_km,
            effective_from,
            is_active
        ) VALUES (
            'Outside',
            bus_type_record.id,
            1001,
            999999, -- Very large number to represent unlimited
            150000,
            48,
            500,
            10000,
            175,
            25,
            CURRENT_DATE,
            true
        );
    END LOOP;
END $$;