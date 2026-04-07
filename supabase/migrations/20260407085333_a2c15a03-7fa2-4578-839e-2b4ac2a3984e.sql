ALTER TABLE special_hire_signature_settings 
  DROP CONSTRAINT IF EXISTS special_hire_signature_settings_signature_role_check;

ALTER TABLE special_hire_signature_settings 
  ADD CONSTRAINT special_hire_signature_settings_signature_role_check 
  CHECK (signature_role = ANY (ARRAY['prepared_by','checked_by','approved_by','signature_page']::text[]));