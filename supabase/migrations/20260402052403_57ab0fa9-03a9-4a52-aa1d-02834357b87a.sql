
INSERT INTO bank_accounts (company_id, account_code, account_name, bank_name, account_number, account_type, currency, is_active, gl_account_id)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'BA-SEY-CA', 'SEYLAN BANK C/A - 012012866667001', 'Seylan Bank PLC', '0120-12866667-001', 'current', 'LKR', true, '9b3a2559-e73f-45ae-82e3-3c2326a582f1'),
  ('a0000000-0000-0000-0000-000000000001', 'BA-SEY-SA', 'SEYLAN BANK S/A - 012012866667108', 'Seylan Bank PLC', '0120-12866667-108', 'savings', 'LKR', true, 'db72b43a-b377-42e1-b1d8-9f3798b6a534'),
  ('a0000000-0000-0000-0000-000000000001', 'BA-SAM-CA', 'SAMPATH BANK C/A - 000310032026', 'Sampath Bank PLC', '0003 1003 2026', 'current', 'LKR', true, '631cd199-4928-4c62-9f6c-f9c5492f723a'),
  ('a0000000-0000-0000-0000-000000000001', 'BA-COM-CA', 'COMMERCIAL BANK C/A - 1000516089', 'Commercial Bank of Ceylon PLC', '1000516089', 'current', 'LKR', true, '829019e2-e498-4c6e-a616-2423f047a535'),
  ('a0000000-0000-0000-0000-000000000001', 'BA-COM-MM', 'COMMERCIAL BANK M/M - 2000511791', 'Commercial Bank of Ceylon PLC', '2000511791', 'current', 'LKR', true, 'b920e224-53a2-4825-96dc-11c044132bb7'),
  ('a0000000-0000-0000-0000-000000000001', 'BA-NTB-CA', 'NTB BANK C/A - 100530011672', 'Nations Trust Bank PLC', '100530011672', 'current', 'LKR', true, 'd4ac0d6c-005a-4e20-9819-bfc183721d74'),
  ('a0000000-0000-0000-0000-000000000001', 'BA-NTB-SA', 'NTB BANK S/A - 200530116107', 'Nations Trust Bank PLC', '200530116107', 'savings', 'LKR', true, '06b0f3d1-35c9-4234-a69f-a62dccf44c24'),
  ('a0000000-0000-0000-0000-000000000001', 'BA-HNB-PF', 'HNB BANK P/F - 129010014521', 'Hatton National Bank PLC', '129010014521', 'current', 'LKR', true, 'b98c6b55-437f-4a63-92b7-a0b6773238c0'),
  ('a0000000-0000-0000-0000-000000000001', 'BA-PB-CA', 'PEOPLES BANK C/A - 004-1-001-7-0002813', 'Peoples Bank', '004-1-001-7-0002813', 'current', 'LKR', true, '66d4025b-80ea-43b6-b2c9-11398505951a'),
  ('a0000000-0000-0000-0000-000000000001', 'BA-PB-SA', 'PEOPLES BANK S/A', 'Peoples Bank', '', 'savings', 'LKR', true, 'ab8b1f91-9f76-417f-a1a8-44ad934e752d');

SELECT pg_notify('pgrst', 'reload schema');
