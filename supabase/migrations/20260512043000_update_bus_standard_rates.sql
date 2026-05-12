-- ============================================================
-- Update bus standard rates (expected_km_per_liter) from 
-- actual operational data spreadsheet.
-- Previous default was 8 km/L for all buses — incorrect.
-- These values reflect real fuel consumption benchmarks.
-- ============================================================

-- ==========================================
-- STEP 1: Specific bus number updates
-- (From the operational spreadsheet image)
-- ==========================================

-- Colombo Jaffna route — C12 Pro
UPDATE buses SET expected_km_per_liter = 4.2 WHERE bus_no = 'NG 8228';
UPDATE buses SET expected_km_per_liter = 4.2 WHERE bus_no = 'NG 8247';

-- Colombo - Passara — C12 Pro
UPDATE buses SET expected_km_per_liter = 3.8 WHERE bus_no = 'NG 8223';

-- Badulla - Makubura — C12 Pro
UPDATE buses SET expected_km_per_liter = 3.8 WHERE bus_no = 'NG 8241';

-- Makumbura - Badulla — C12 Pro
UPDATE buses SET expected_km_per_liter = 3.8 WHERE bus_no = 'NG 8242';

-- Colombo - Panama — C12 Pro
UPDATE buses SET expected_km_per_liter = 3.8 WHERE bus_no = 'NG 8264';

-- Colombo - Nuwara Eliya — C12 Pro
UPDATE buses SET expected_km_per_liter = 3.8 WHERE bus_no = 'NG 8245';

-- Ratnapura - Colombo — Leyland
UPDATE buses SET expected_km_per_liter = 3.5 WHERE bus_no = 'NE 2150';
UPDATE buses SET expected_km_per_liter = 3.5 WHERE bus_no = 'NE 2152';

-- Panadura - Kandy Supper Luxery — C12 Pro
UPDATE buses SET expected_km_per_liter = 2.69 WHERE bus_no = 'NG 8220';
UPDATE buses SET expected_km_per_liter = 2.65 WHERE bus_no = 'NG 8229';
UPDATE buses SET expected_km_per_liter = 2.77 WHERE bus_no = 'NG 8226';
UPDATE buses SET expected_km_per_liter = 2.55 WHERE bus_no = 'NG 8225';

-- Panadura - Kandy — Leyland
UPDATE buses SET expected_km_per_liter = 3.5 WHERE bus_no = 'NE 2147';
UPDATE buses SET expected_km_per_liter = 3.5 WHERE bus_no = 'NE 0251';
UPDATE buses SET expected_km_per_liter = 3.5 WHERE bus_no = 'NC 4832';

-- Gampola - Colombo — Leyland
UPDATE buses SET expected_km_per_liter = 3.5 WHERE bus_no = 'ND 3470';
UPDATE buses SET expected_km_per_liter = 3.5 WHERE bus_no = 'ND 0295';

-- Nittambuwa - Panadura — Leyland
UPDATE buses SET expected_km_per_liter = 4 WHERE bus_no = 'NE 2200';
UPDATE buses SET expected_km_per_liter = 4 WHERE bus_no = 'NE 2201';

-- Panadura - Nittambuwa — D7
UPDATE buses SET expected_km_per_liter = 7 WHERE bus_no = 'NG 8260';
UPDATE buses SET expected_km_per_liter = 7 WHERE bus_no = 'NG 8261';

-- Moratuwa to Nittambuwa (Highway) — D7
UPDATE buses SET expected_km_per_liter = 7 WHERE bus_no = 'NG 8250';
UPDATE buses SET expected_km_per_liter = 7 WHERE bus_no = 'NG 8251';
UPDATE buses SET expected_km_per_liter = 7 WHERE bus_no = 'NG 8252';

-- Nittambuwa to Moratuwa (Highway) — D7
UPDATE buses SET expected_km_per_liter = 7 WHERE bus_no = 'NG 8253';

-- Nittambuwa to Moratuwa (Highway) — C9
UPDATE buses SET expected_km_per_liter = 6 WHERE bus_no = 'NE 2511';

-- ==========================================
-- STEP 2: Catch-all by BUS MODEL
-- For any bus still at 8 (default) or higher,
-- set the standard rate based on its model.
-- This ensures ALL buses get correct rates.
-- ==========================================

-- C9 buses → 6 km/L
UPDATE buses SET expected_km_per_liter = 6
WHERE (model ILIKE '%C9%' OR model ILIKE '%C 9%')
  AND (expected_km_per_liter >= 8 OR expected_km_per_liter IS NULL);

-- D7 buses → 7 km/L
UPDATE buses SET expected_km_per_liter = 7
WHERE (model ILIKE '%D7%' OR model ILIKE '%D 7%')
  AND (expected_km_per_liter >= 8 OR expected_km_per_liter IS NULL);

-- C12 Pro buses → 3.8 km/L (default for C12 Pro)
UPDATE buses SET expected_km_per_liter = 3.8
WHERE (model ILIKE '%C12%' OR model ILIKE '%C 12%')
  AND (expected_km_per_liter >= 8 OR expected_km_per_liter IS NULL);

-- Leyland buses → 3.5 km/L
UPDATE buses SET expected_km_per_liter = 3.5
WHERE (model ILIKE '%Leyland%' OR model ILIKE '%VIKING%')
  AND (expected_km_per_liter >= 8 OR expected_km_per_liter IS NULL);

-- Any remaining buses still at 8 or above → default to 3.5 km/L
-- (Safe conservative fallback for unknown models)
UPDATE buses SET expected_km_per_liter = 3.5
WHERE expected_km_per_liter >= 8 OR expected_km_per_liter IS NULL;
