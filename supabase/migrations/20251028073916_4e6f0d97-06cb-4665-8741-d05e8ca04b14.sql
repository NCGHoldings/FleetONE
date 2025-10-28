-- Seed governance data with companies, SBUs, frequency rules, submission rules, and sample items

-- Insert companies
INSERT INTO companies (name, sector, is_active) VALUES
('NAS', 'Transport', true),
('NSP', 'Parts & Service', true),
('NEX', 'Express Transport', true)
ON CONFLICT DO NOTHING;

-- Insert SBUs for NEX
INSERT INTO sbus (name, company_id, is_active)
SELECT 'PBS', id, true FROM companies WHERE name = 'NEX'
UNION ALL
SELECT 'SBS', id, true FROM companies WHERE name = 'NEX'
UNION ALL
SELECT 'SH', id, true FROM companies WHERE name = 'NEX'
UNION ALL
SELECT 'Activity Buses', id, true FROM companies WHERE name = 'NEX'
ON CONFLICT DO NOTHING;

-- Insert frequency rules
INSERT INTO frequency_rules (rule_type, params, description, is_active) VALUES
('DAILY', '{"includeWeekends": false}'::jsonb, 'Every weekday', true),
('WEEKLY_BY_WEEKDAY', '{"weekday": "MON"}'::jsonb, 'Every Monday', true),
('WEEKLY_BY_WEEKDAY', '{"weekday": "TUE"}'::jsonb, 'Every Tuesday', true),
('WEEKLY_BY_WEEKDAY', '{"weekday": "WED"}'::jsonb, 'Every Wednesday', true),
('WEEKLY_BY_WEEKDAY', '{"weekday": "THU"}'::jsonb, 'Every Thursday', true),
('WEEKLY_BY_WEEKDAY', '{"weekday": "FRI"}'::jsonb, 'Every Friday', true),
('BIWEEKLY_BY_WEEKDAY', '{"weekday": "WED", "intervalDays": 14, "startAnchor": "2025-01-08"}'::jsonb, 'Every two weeks on Wednesday', true),
('MONTHLY_BY_DAY', '{"day": 2}'::jsonb, '2nd of each month', true),
('MONTHLY_BY_DAY', '{"day": 5}'::jsonb, '5th of each month', true),
('MONTHLY_BY_DAY', '{"day": 8}'::jsonb, '8th of each month', true),
('MONTHLY_BY_DAY', '{"day": 15}'::jsonb, '15th of each month', true),
('MONTH_END', '{}'::jsonb, 'Last day of each month', true),
('MONTHLY_NTH_WEEKDAY', '{"weekNumber": 2, "weekday": "MON"}'::jsonb, '2nd week Monday of every month', true),
('MONTHLY_NTH_WEEKDAY', '{"weekNumber": 3, "weekday": "WED"}'::jsonb, '3rd week Wednesday of every month', true),
('RELATIVE_WINDOW', '{"window": "12-14", "fallbackWeekday": "WED"}'::jsonb, 'Between 12th and 14th of each month', true)
ON CONFLICT DO NOTHING;

-- Insert submission rules
INSERT INTO submission_rules (rule_type, params, description) VALUES
('SAME_AS_FREQUENCY', '{}'::jsonb, 'Same as frequency'),
('FIXED_DAY_EACH_MONTH', '{"day": 8}'::jsonb, '8th of each month'),
('FIXED_DAY_EACH_MONTH', '{"day": 15}'::jsonb, '15th of each month'),
('SAME_WEEKDAY', '{"weekday": "MON"}'::jsonb, 'Every Monday'),
('FOLLOWING_MONTH_DAY_N', '{"day": 5}'::jsonb, '5th of following month'),
('NONE', '{}'::jsonb, 'No submission tracking')
ON CONFLICT DO NOTHING;

-- Insert sample governance items for NAS
INSERT INTO governance_items (type, company_id, title, category, owner_name, owner_email, frequency_rule_id, submission_rule_id, notes)
SELECT 
  'REPORT',
  (SELECT id FROM companies WHERE name = 'NAS'),
  'Monthly Financial Statement (Performance Basis)',
  'Finance',
  'Finance Manager',
  'finance@nas.lk',
  (SELECT id FROM frequency_rules WHERE description = '8th of each month' LIMIT 1),
  (SELECT id FROM submission_rules WHERE description = 'Same as frequency' LIMIT 1),
  'Performance-based financial reporting'
WHERE NOT EXISTS (SELECT 1 FROM governance_items WHERE title = 'Monthly Financial Statement (Performance Basis)');

INSERT INTO governance_items (type, company_id, title, category, owner_name, owner_email, frequency_rule_id, submission_rule_id, notes)
SELECT
  'REPORT',
  (SELECT id FROM companies WHERE name = 'NAS'),
  'Cashflow Statement (Budgeted Vs Actuals)',
  'Finance',
  'Finance Manager',
  'finance@nas.lk',
  (SELECT id FROM frequency_rules WHERE description = '8th of each month' LIMIT 1),
  (SELECT id FROM submission_rules WHERE description = 'Same as frequency' LIMIT 1),
  'Monthly cashflow analysis'
WHERE NOT EXISTS (SELECT 1 FROM governance_items WHERE title = 'Cashflow Statement (Budgeted Vs Actuals)');

INSERT INTO governance_items (type, company_id, title, category, owner_name, owner_email, frequency_rule_id, submission_rule_id, notes)
SELECT
  'REPORT',
  (SELECT id FROM companies WHERE name = 'NAS'),
  'Department wise Revenue & GP for the week',
  'Finance',
  'Finance Manager',
  'finance@nas.lk',
  (SELECT id FROM frequency_rules WHERE description = 'Every Monday' LIMIT 1),
  (SELECT id FROM submission_rules WHERE description = 'Every Monday' LIMIT 1),
  'Weekly revenue analysis by department'
WHERE NOT EXISTS (SELECT 1 FROM governance_items WHERE title = 'Department wise Revenue & GP for the week');

-- Insert sample governance items for NSP
INSERT INTO governance_items (type, company_id, title, category, owner_name, owner_email, frequency_rule_id, submission_rule_id, notes)
SELECT
  'REPORT',
  (SELECT id FROM companies WHERE name = 'NSP'),
  'Accounts Receivables Aging',
  'Finance',
  'AR Manager',
  'ar@nsp.lk',
  (SELECT id FROM frequency_rules WHERE description = 'Every Monday' LIMIT 1),
  (SELECT id FROM submission_rules WHERE description = 'Every Monday' LIMIT 1),
  'Weekly AR aging report'
WHERE NOT EXISTS (SELECT 1 FROM governance_items WHERE title = 'Accounts Receivables Aging');

INSERT INTO governance_items (type, company_id, title, category, owner_name, owner_email, frequency_rule_id, submission_rule_id, notes)
SELECT
  'REPORT',
  (SELECT id FROM companies WHERE name = 'NSP'),
  'Monthly Reports',
  'Finance',
  'Finance Manager',
  'finance@nsp.lk',
  (SELECT id FROM frequency_rules WHERE description = '8th of each month' LIMIT 1),
  (SELECT id FROM submission_rules WHERE description = '8th of each month' LIMIT 1),
  'Monthly financial reporting'
WHERE NOT EXISTS (SELECT 1 FROM governance_items WHERE title = 'Monthly Reports');

-- Insert sample governance items for NEX.PBS
INSERT INTO governance_items (type, company_id, sbu_id, title, category, owner_name, owner_email, frequency_rule_id, submission_rule_id, notes)
SELECT
  'REPORT',
  (SELECT id FROM companies WHERE name = 'NEX'),
  (SELECT id FROM sbus WHERE name = 'PBS' AND company_id = (SELECT id FROM companies WHERE name = 'NEX')),
  'Route/Bus income & expenses (Daily)',
  'Ops',
  'Operations Manager',
  'ops@nex.lk',
  (SELECT id FROM frequency_rules WHERE description = 'Every weekday' LIMIT 1),
  (SELECT id FROM submission_rules WHERE description = 'Same as frequency' LIMIT 1),
  'Daily operational reporting for PBS'
WHERE NOT EXISTS (SELECT 1 FROM governance_items WHERE title = 'Route/Bus income & expenses (Daily)');

INSERT INTO governance_items (type, company_id, sbu_id, title, category, owner_name, owner_email, frequency_rule_id, submission_rule_id, notes)
SELECT
  'REPORT',
  (SELECT id FROM companies WHERE name = 'NEX'),
  (SELECT id FROM sbus WHERE name = 'PBS' AND company_id = (SELECT id FROM companies WHERE name = 'NEX')),
  'Profitability report (Bus wise & Routewise)',
  'Finance',
  'Finance Manager',
  'finance@nex.lk',
  (SELECT id FROM frequency_rules WHERE description = '15th of each month' LIMIT 1),
  (SELECT id FROM submission_rules WHERE description = '15th of each month' LIMIT 1),
  'Monthly profitability analysis'
WHERE NOT EXISTS (SELECT 1 FROM governance_items WHERE title = 'Profitability report (Bus wise & Routewise)');

-- Insert sample governance events
INSERT INTO governance_items (type, company_id, title, category, owner_name, owner_email, frequency_rule_id, notes)
SELECT
  'EVENT',
  (SELECT id FROM companies WHERE name = 'NAS'),
  'Cash Flows Meetings',
  'Finance',
  'CFO',
  'cfo@nas.lk',
  (SELECT id FROM frequency_rules WHERE description = 'Between 12th and 14th of each month' LIMIT 1),
  'Monthly cash flow review meeting'
WHERE NOT EXISTS (SELECT 1 FROM governance_items WHERE title = 'Cash Flows Meetings');

INSERT INTO governance_items (type, company_id, title, category, owner_name, owner_email, frequency_rule_id, notes, location)
SELECT
  'EVENT',
  (SELECT id FROM companies WHERE name = 'NAS'),
  'KPI Review Meetings',
  'Board',
  'GM',
  'gm@nas.lk',
  (SELECT id FROM frequency_rules WHERE description = '3rd week Wednesday of every month' LIMIT 1),
  'Monthly KPI review meeting',
  'Board Room'
WHERE NOT EXISTS (SELECT 1 FROM governance_items WHERE title = 'KPI Review Meetings');

INSERT INTO governance_items (type, company_id, title, category, owner_name, owner_email, frequency_rule_id, notes, location)
SELECT
  'EVENT',
  (SELECT id FROM companies WHERE name = 'NEX'),
  'OMP Meeting',
  'Ops',
  'Operations Manager',
  'ops@nex.lk',
  (SELECT id FROM frequency_rules WHERE description = 'Every Tuesday' LIMIT 1),
  'Weekly operational management meeting',
  'Main Office'
WHERE NOT EXISTS (SELECT 1 FROM governance_items WHERE title = 'OMP Meeting');

INSERT INTO governance_items (type, company_id, title, category, owner_name, owner_email, frequency_rule_id, notes, location)
SELECT
  'EVENT',
  (SELECT id FROM companies WHERE name = 'NEX'),
  'NEX Operations Meeting',
  'Ops',
  'Operations Manager',
  'ops@nex.lk',
  (SELECT id FROM frequency_rules WHERE description = 'Every two weeks on Wednesday' LIMIT 1),
  'Bi-weekly operations review',
  'Conference Room'
WHERE NOT EXISTS (SELECT 1 FROM governance_items WHERE title = 'NEX Operations Meeting');

INSERT INTO governance_items (type, company_id, title, category, owner_name, owner_email, frequency_rule_id, notes, location)
SELECT
  'EVENT',
  (SELECT id FROM companies WHERE name = 'NAS'),
  'Management Board Meetings',
  'Board',
  'Board Secretary',
  'board@nas.lk',
  (SELECT id FROM frequency_rules WHERE description = '2nd of each month' LIMIT 1),
  'Monthly management board meeting',
  'Board Room'
WHERE NOT EXISTS (SELECT 1 FROM governance_items WHERE title = 'Management Board Meetings');

-- Insert some Sri Lankan holidays for testing
INSERT INTO holidays (holiday_date, holiday_name, type, country) VALUES
('2025-01-01', 'New Year''s Day', 'Mercantile', 'LK'),
('2025-01-14', 'Thai Pongal', 'Public', 'LK'),
('2025-02-04', 'Independence Day', 'Public', 'LK'),
('2025-03-14', 'Maha Shivarathri', 'Public', 'LK'),
('2025-04-13', 'Sinhala & Tamil New Year Eve', 'Public', 'LK'),
('2025-04-14', 'Sinhala & Tamil New Year Day', 'Public', 'LK'),
('2025-05-01', 'May Day', 'Public', 'LK'),
('2025-05-12', 'Vesak Full Moon Poya Day', 'Public', 'LK'),
('2025-05-13', 'Day following Vesak', 'Public', 'LK'),
('2025-06-10', 'Poson Full Moon Poya Day', 'Public', 'LK'),
('2025-08-15', 'Deepavali', 'Public', 'LK'),
('2025-12-25', 'Christmas Day', 'Public', 'LK')
ON CONFLICT (holiday_date) DO NOTHING;