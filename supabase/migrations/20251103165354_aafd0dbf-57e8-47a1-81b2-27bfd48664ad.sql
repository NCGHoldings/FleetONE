-- Update existing daily_trips records with WhatsApp numbers from driver_allocations
-- This is a one-time data fix to extract WhatsApp from notes JSON field

UPDATE daily_trips dt
SET whatsapp = (
  SELECT (da.notes::json->>'whatsapp')
  FROM driver_allocations da
  WHERE da.trip_id = dt.trip_no
  AND da.allocation_date = dt.trip_date
  LIMIT 1
)
WHERE dt.whatsapp IS NULL
AND EXISTS (
  SELECT 1 FROM driver_allocations da
  WHERE da.trip_id = dt.trip_no
  AND da.allocation_date = dt.trip_date
  AND da.notes IS NOT NULL
  AND da.notes::json->>'whatsapp' IS NOT NULL
);