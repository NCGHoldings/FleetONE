-- Comprehensive Rate Card System Enhancement

-- Add new columns for the advanced pricing system
ALTER TABLE hire_rate_cards 
ADD COLUMN from_km numeric DEFAULT 0,
ADD COLUMN to_km numeric,
ADD COLUMN standard_hours numeric DEFAULT 8,
ADD COLUMN overtime_rate_lkr_per_hour numeric DEFAULT 500,
ADD COLUMN overnight_charge_lkr_per_day numeric DEFAULT 0,
ADD COLUMN exceeding_km_rate_lkr numeric DEFAULT 175,
ADD COLUMN free_exceeding_km numeric DEFAULT 5;

-- Update comments for clarity
COMMENT ON COLUMN hire_rate_cards.from_km IS 'Minimum distance for this rate tier (inclusive)';
COMMENT ON COLUMN hire_rate_cards.to_km IS 'Maximum distance for this rate tier (inclusive)';
COMMENT ON COLUMN hire_rate_cards.flat_fee_lkr IS 'Fixed rate for the distance tier';
COMMENT ON COLUMN hire_rate_cards.standard_hours IS 'Standard working hours included in the rate';
COMMENT ON COLUMN hire_rate_cards.overtime_rate_lkr_per_hour IS 'Rate per hour beyond standard hours';
COMMENT ON COLUMN hire_rate_cards.overnight_charge_lkr_per_day IS 'Overnight charges per day (Outside customers only)';
COMMENT ON COLUMN hire_rate_cards.exceeding_km_rate_lkr IS 'Rate per km when exceeding agreed distance';
COMMENT ON COLUMN hire_rate_cards.free_exceeding_km IS 'Free kilometers allowed before exceeding charges apply';

-- Remove the old tiered columns as they're not needed for this new structure
ALTER TABLE hire_rate_cards 
DROP COLUMN IF EXISTS first_100km_rate_per_km_lkr,
DROP COLUMN IF EXISTS additional_km_rate_per_km_lkr;

-- Insert the rate cards as specified in requirements

-- Outside Customers Rate Card
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
) 
SELECT 
    'Outside' as hire_type,
    bt.id as bus_type_id,
    1 as from_km,
    100 as to_km,
    30000 as flat_fee_lkr,
    15 as standard_hours,
    500 as overtime_rate_lkr_per_hour,
    10000 as overnight_charge_lkr_per_day,
    175 as exceeding_km_rate_lkr,
    5 as free_exceeding_km,
    CURRENT_DATE as effective_from,
    true as is_active
FROM bus_types bt 
WHERE bt.is_active = true;

-- LIS (Lyceum) Rate Cards - Multiple tiers
-- Tier 1: Below 10 km
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
) 
SELECT 
    'Lyceum' as hire_type,
    bt.id as bus_type_id,
    0 as from_km,
    10 as to_km,
    9000 as flat_fee_lkr,
    2 as standard_hours,
    500 as overtime_rate_lkr_per_hour,
    0 as overnight_charge_lkr_per_day,
    175 as exceeding_km_rate_lkr,
    5 as free_exceeding_km,
    CURRENT_DATE as effective_from,
    true as is_active
FROM bus_types bt 
WHERE bt.is_active = true;

-- Tier 2: 11 km - 25 km
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
) 
SELECT 
    'Lyceum' as hire_type,
    bt.id as bus_type_id,
    11 as from_km,
    25 as to_km,
    16000 as flat_fee_lkr,
    4 as standard_hours,
    500 as overtime_rate_lkr_per_hour,
    0 as overnight_charge_lkr_per_day,
    175 as exceeding_km_rate_lkr,
    5 as free_exceeding_km,
    CURRENT_DATE as effective_from,
    true as is_active
FROM bus_types bt 
WHERE bt.is_active = true;

-- Tier 3: 26 km - 50 km
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
) 
SELECT 
    'Lyceum' as hire_type,
    bt.id as bus_type_id,
    26 as from_km,
    50 as to_km,
    18500 as flat_fee_lkr,
    4 as standard_hours,
    500 as overtime_rate_lkr_per_hour,
    0 as overnight_charge_lkr_per_day,
    175 as exceeding_km_rate_lkr,
    5 as free_exceeding_km,
    CURRENT_DATE as effective_from,
    true as is_active
FROM bus_types bt 
WHERE bt.is_active = true;

-- Tier 4: 51 km - 75 km
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
) 
SELECT 
    'Lyceum' as hire_type,
    bt.id as bus_type_id,
    51 as from_km,
    75 as to_km,
    25000 as flat_fee_lkr,
    8 as standard_hours,
    500 as overtime_rate_lkr_per_hour,
    0 as overnight_charge_lkr_per_day,
    175 as exceeding_km_rate_lkr,
    5 as free_exceeding_km,
    CURRENT_DATE as effective_from,
    true as is_active
FROM bus_types bt 
WHERE bt.is_active = true;

-- Tier 5: 76 km - 100 km
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
) 
SELECT 
    'Lyceum' as hire_type,
    bt.id as bus_type_id,
    76 as from_km,
    100 as to_km,
    30000 as flat_fee_lkr,
    12 as standard_hours,
    500 as overtime_rate_lkr_per_hour,
    0 as overnight_charge_lkr_per_day,
    175 as exceeding_km_rate_lkr,
    5 as free_exceeding_km,
    CURRENT_DATE as effective_from,
    true as is_active
FROM bus_types bt 
WHERE bt.is_active = true;