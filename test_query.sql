SELECT is_active, COUNT(*) 
FROM school_students 
WHERE branch_id = 'dd387300-dc45-4c1e-ae24-933750c78a8e' 
GROUP BY is_active;
