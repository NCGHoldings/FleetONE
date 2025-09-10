-- Remove the fake branches that were not requested
DELETE FROM school_students WHERE branch_id IN (
  SELECT id FROM school_branches 
  WHERE branch_code IN ('COL01', 'KAN01', 'GAL01', 'NEG01')
);

DELETE FROM school_branches 
WHERE branch_code IN ('COL01', 'KAN01', 'GAL01', 'NEG01');