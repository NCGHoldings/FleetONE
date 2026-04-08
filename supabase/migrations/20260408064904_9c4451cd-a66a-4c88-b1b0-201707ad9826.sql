
UPDATE fleet_master_roster
SET trips_per_day = 2
WHERE bus_id IN (
  SELECT id FROM buses WHERE bus_no IN ('NG 8241', 'NG 8242')
);
