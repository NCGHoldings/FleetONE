UPDATE fleet_master_roster 
SET remark = 'Stopped' 
WHERE section = 'OLD RUNNING ROUTES' 
  AND (remark = 'Running' OR remark IS NULL);