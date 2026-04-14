DELETE FROM fleet_master_roster 
WHERE bus_id IN (
  SELECT id FROM buses 
  WHERE category_id IN (
    'd4accac9-0ff0-4147-9f03-b316920e3c73',
    '6193b18f-3d26-4392-a03d-e43aa36b05f8'
  )
);