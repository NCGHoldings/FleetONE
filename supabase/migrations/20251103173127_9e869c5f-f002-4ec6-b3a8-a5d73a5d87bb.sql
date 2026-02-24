-- Clear existing October 1-15, 2025 data to prepare for fresh import
DELETE FROM daily_trips 
WHERE trip_date >= '2025-10-01' AND trip_date <= '2025-10-15';

DELETE FROM driver_allocations 
WHERE allocation_date >= '2025-10-01' AND allocation_date <= '2025-10-15';