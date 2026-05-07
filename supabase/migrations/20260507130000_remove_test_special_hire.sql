-- Remove short_code from test companies to prevent them from being resolved as the live business units in document templates
UPDATE companies SET short_code = 'TEST_SPH' WHERE name ILIKE '%Test Special Hire%' AND short_code = 'SPH';
UPDATE companies SET short_code = 'TEST_YUT' WHERE name ILIKE '%Test Yutong%' AND short_code = 'YUT';
UPDATE companies SET short_code = 'TEST_SBO' WHERE name ILIKE '%Test School Bus%' AND short_code = 'SBO';
UPDATE companies SET short_code = 'TEST_LTV' WHERE name ILIKE '%Test Light Vehicle%' AND short_code = 'LTV';
UPDATE companies SET short_code = 'TEST_SNT' WHERE name ILIKE '%Test Sinotruck%' AND short_code = 'SNT';
