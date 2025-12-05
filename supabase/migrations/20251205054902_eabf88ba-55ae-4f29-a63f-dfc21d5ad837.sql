-- Update sub-category colors to use blue family for Public Bus
UPDATE bus_sub_categories 
SET color = '#4F46E5', updated_at = now()
WHERE code = 'super_luxury';

UPDATE bus_sub_categories 
SET color = '#3B82F6', updated_at = now()
WHERE code = 'semi_luxury';

UPDATE bus_sub_categories 
SET color = '#06B6D4', updated_at = now()
WHERE code = 'leyland';