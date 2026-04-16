-- Grant Sinotruck page permissions to Abi Money (admin)
INSERT INTO user_page_permissions (user_id, page_identifier, has_access, granted_by)
VALUES 
  ('2686cf9c-ccb6-4c72-9f9b-c79e9201a4ff', 'sinotruck_quotations', true, '2686cf9c-ccb6-4c72-9f9b-c79e9201a4ff'),
  ('2686cf9c-ccb6-4c72-9f9b-c79e9201a4ff', 'sinotruck_truck_models', true, '2686cf9c-ccb6-4c72-9f9b-c79e9201a4ff'),
  ('2686cf9c-ccb6-4c72-9f9b-c79e9201a4ff', 'sinotruck_customers', true, '2686cf9c-ccb6-4c72-9f9b-c79e9201a4ff')
ON CONFLICT (user_id, page_identifier) 
DO UPDATE SET 
  has_access = true, 
  updated_at = NOW();