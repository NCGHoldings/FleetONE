
INSERT INTO financial_periods (id, period_name, start_date, end_date, fiscal_year, period_number, is_closed, is_locked, company_id)
VALUES
  (gen_random_uuid(), 'October 2025', '2025-10-01', '2025-10-31', 2026, 1, false, false, 'a0000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'November 2025', '2025-11-01', '2025-11-30', 2026, 2, false, false, 'a0000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'December 2025', '2025-12-01', '2025-12-31', 2026, 3, false, false, 'a0000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'January 2026', '2026-01-01', '2026-01-31', 2026, 4, false, false, 'a0000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'February 2026', '2026-02-01', '2026-02-28', 2026, 5, false, false, 'a0000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'March 2026', '2026-03-01', '2026-03-31', 2026, 6, false, false, 'a0000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'April 2026', '2026-04-01', '2026-04-30', 2026, 7, false, false, 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;
