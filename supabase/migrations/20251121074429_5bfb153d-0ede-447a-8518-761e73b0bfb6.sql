-- Fix NG 8247 bus route assignment for multi-day route detection
UPDATE buses 
SET route = 'Moratuwa - Jaffna' 
WHERE bus_no = 'NG 8247';