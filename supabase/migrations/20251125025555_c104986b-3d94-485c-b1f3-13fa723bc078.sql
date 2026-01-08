-- Seed Transport & Bus Company template with comprehensive 100+ line items
-- Split into multiple chunks to avoid PostgreSQL 100-argument function limit
DO $$
DECLARE
  v_template_id uuid;
  v_line_items jsonb;
BEGIN
  -- Get or create the Transport template
  SELECT id INTO v_template_id
  FROM budget_templates
  WHERE template_name = 'Transport & Bus Company Budget'
  LIMIT 1;

  IF v_template_id IS NULL THEN
    INSERT INTO budget_templates (
      template_name,
      industry_type,
      description,
      is_system_template,
      template_structure
    ) VALUES (
      'Transport & Bus Company Budget',
      'Transport',
      'Comprehensive budget template for transport and bus operations',
      true,
      '{}'::jsonb
    ) RETURNING id INTO v_template_id;
  END IF;

  -- Build line items in chunks
  v_line_items := '[]'::jsonb;
  
  -- REVENUE ITEMS (8 items)
  v_line_items := v_line_items || jsonb_build_array(
    jsonb_build_object('name', 'Daily Trip Income', 'category', 'Revenue', 'subcategory', 'Operating Revenue', 'department', 'Fleet Operations'),
    jsonb_build_object('name', 'Special Hire Revenue', 'category', 'Revenue', 'subcategory', 'Operating Revenue', 'department', 'Fleet Operations'),
    jsonb_build_object('name', 'School Bus Service Income', 'category', 'Revenue', 'subcategory', 'Operating Revenue', 'department', 'Fleet Operations'),
    jsonb_build_object('name', 'Charter Services Revenue', 'category', 'Revenue', 'subcategory', 'Operating Revenue', 'department', 'Fleet Operations'),
    jsonb_build_object('name', 'Advertising Revenue', 'category', 'Revenue', 'subcategory', 'Other Income', 'department', 'Customer Service'),
    jsonb_build_object('name', 'Commission Income', 'category', 'Revenue', 'subcategory', 'Other Income', 'department', 'Administration'),
    jsonb_build_object('name', 'Interest Income', 'category', 'Revenue', 'subcategory', 'Other Income', 'department', 'Administration'),
    jsonb_build_object('name', 'Rental Income', 'category', 'Revenue', 'subcategory', 'Other Income', 'department', 'Administration')
  );
  
  -- FIXED EXPENSES (8 items)
  v_line_items := v_line_items || jsonb_build_array(
    jsonb_build_object('name', 'Management Salaries', 'category', 'Expense', 'subcategory', 'Fixed Expenses', 'department', 'Administration'),
    jsonb_build_object('name', 'Office Rent', 'category', 'Expense', 'subcategory', 'Fixed Expenses', 'department', 'Administration'),
    jsonb_build_object('name', 'Vehicle Insurance', 'category', 'Expense', 'subcategory', 'Fixed Expenses', 'department', 'Fleet Operations'),
    jsonb_build_object('name', 'Health Insurance', 'category', 'Expense', 'subcategory', 'Fixed Expenses', 'department', 'Staff & Payroll'),
    jsonb_build_object('name', 'Property Insurance', 'category', 'Expense', 'subcategory', 'Fixed Expenses', 'department', 'Administration'),
    jsonb_build_object('name', 'Depreciation - Vehicles', 'category', 'Expense', 'subcategory', 'Fixed Expenses', 'department', 'Fleet Operations'),
    jsonb_build_object('name', 'Depreciation - Equipment', 'category', 'Expense', 'subcategory', 'Fixed Expenses', 'department', 'Administration'),
    jsonb_build_object('name', 'Loan Interest Payments', 'category', 'Expense', 'subcategory', 'Fixed Expenses', 'department', 'Administration')
  );
  
  -- OPERATING EXPENSES - FUEL & STAFF (12 items)
  v_line_items := v_line_items || jsonb_build_array(
    jsonb_build_object('name', 'Diesel Fuel', 'category', 'Expense', 'subcategory', 'Operating Expenses', 'department', 'Fuel Management'),
    jsonb_build_object('name', 'Fuel Cards & Management', 'category', 'Expense', 'subcategory', 'Operating Expenses', 'department', 'Fuel Management'),
    jsonb_build_object('name', 'Driver Salaries', 'category', 'Expense', 'subcategory', 'Operating Expenses', 'department', 'Staff & Payroll'),
    jsonb_build_object('name', 'Conductor Salaries', 'category', 'Expense', 'subcategory', 'Operating Expenses', 'department', 'Staff & Payroll'),
    jsonb_build_object('name', 'Mechanic Wages', 'category', 'Expense', 'subcategory', 'Operating Expenses', 'department', 'Staff & Payroll'),
    jsonb_build_object('name', 'Cleaner Wages', 'category', 'Expense', 'subcategory', 'Operating Expenses', 'department', 'Staff & Payroll'),
    jsonb_build_object('name', 'Security Staff Wages', 'category', 'Expense', 'subcategory', 'Operating Expenses', 'department', 'Staff & Payroll'),
    jsonb_build_object('name', 'EPF Contributions', 'category', 'Expense', 'subcategory', 'Operating Expenses', 'department', 'Staff & Payroll'),
    jsonb_build_object('name', 'ETF Contributions', 'category', 'Expense', 'subcategory', 'Operating Expenses', 'department', 'Staff & Payroll'),
    jsonb_build_object('name', 'Staff Benefits & Allowances', 'category', 'Expense', 'subcategory', 'Operating Expenses', 'department', 'Staff & Payroll'),
    jsonb_build_object('name', 'Overtime Pay', 'category', 'Expense', 'subcategory', 'Operating Expenses', 'department', 'Staff & Payroll'),
    jsonb_build_object('name', 'Staff Meals & Refreshments', 'category', 'Expense', 'subcategory', 'Operating Expenses', 'department', 'Staff & Payroll')
  );
  
  -- OPERATING EXPENSES - PERMITS & LICENSES (8 items)
  v_line_items := v_line_items || jsonb_build_array(
    jsonb_build_object('name', 'Route Permits', 'category', 'Expense', 'subcategory', 'Operating Expenses', 'department', 'Fleet Operations'),
    jsonb_build_object('name', 'Vehicle Revenue Licenses', 'category', 'Expense', 'subcategory', 'Operating Expenses', 'department', 'Fleet Operations'),
    jsonb_build_object('name', 'Vehicle Registration Fees', 'category', 'Expense', 'subcategory', 'Operating Expenses', 'department', 'Fleet Operations'),
    jsonb_build_object('name', 'Emission Testing', 'category', 'Expense', 'subcategory', 'Operating Expenses', 'department', 'Fleet Operations'),
    jsonb_build_object('name', 'Fitness Certificates', 'category', 'Expense', 'subcategory', 'Operating Expenses', 'department', 'Fleet Operations'),
    jsonb_build_object('name', 'Driver License Renewals', 'category', 'Expense', 'subcategory', 'Operating Expenses', 'department', 'Fleet Operations'),
    jsonb_build_object('name', 'NTC Fees', 'category', 'Expense', 'subcategory', 'Operating Expenses', 'department', 'Fleet Operations'),
    jsonb_build_object('name', 'Temporary Permits', 'category', 'Expense', 'subcategory', 'Operating Expenses', 'department', 'Fleet Operations')
  );
  
  -- MAINTENANCE EXPENSES (21 items)
  v_line_items := v_line_items || jsonb_build_array(
    jsonb_build_object('name', 'Preventive Maintenance', 'category', 'Expense', 'subcategory', 'Maintenance', 'department', 'Maintenance & Repairs'),
    jsonb_build_object('name', 'Emergency Repairs', 'category', 'Expense', 'subcategory', 'Maintenance', 'department', 'Maintenance & Repairs'),
    jsonb_build_object('name', 'Tyre Purchases', 'category', 'Expense', 'subcategory', 'Maintenance', 'department', 'Maintenance & Repairs'),
    jsonb_build_object('name', 'Tube Purchases', 'category', 'Expense', 'subcategory', 'Maintenance', 'department', 'Maintenance & Repairs'),
    jsonb_build_object('name', 'Spare Parts - Engine', 'category', 'Expense', 'subcategory', 'Maintenance', 'department', 'Maintenance & Repairs'),
    jsonb_build_object('name', 'Spare Parts - Transmission', 'category', 'Expense', 'subcategory', 'Maintenance', 'department', 'Maintenance & Repairs'),
    jsonb_build_object('name', 'Spare Parts - Electrical', 'category', 'Expense', 'subcategory', 'Maintenance', 'department', 'Maintenance & Repairs'),
    jsonb_build_object('name', 'Spare Parts - Body & Interior', 'category', 'Expense', 'subcategory', 'Maintenance', 'department', 'Maintenance & Repairs'),
    jsonb_build_object('name', 'Brake System Repairs', 'category', 'Expense', 'subcategory', 'Maintenance', 'department', 'Maintenance & Repairs'),
    jsonb_build_object('name', 'Suspension Repairs', 'category', 'Expense', 'subcategory', 'Maintenance', 'department', 'Maintenance & Repairs'),
    jsonb_build_object('name', 'Engine Overhauls', 'category', 'Expense', 'subcategory', 'Maintenance', 'department', 'Maintenance & Repairs'),
    jsonb_build_object('name', 'Transmission Service', 'category', 'Expense', 'subcategory', 'Maintenance', 'department', 'Maintenance & Repairs'),
    jsonb_build_object('name', 'Air Conditioning Service', 'category', 'Expense', 'subcategory', 'Maintenance', 'department', 'Maintenance & Repairs'),
    jsonb_build_object('name', 'Body Wash & Cleaning', 'category', 'Expense', 'subcategory', 'Maintenance', 'department', 'Maintenance & Repairs'),
    jsonb_build_object('name', 'Painting & Body Work', 'category', 'Expense', 'subcategory', 'Maintenance', 'department', 'Maintenance & Repairs'),
    jsonb_build_object('name', 'Seat Repairs & Upholstery', 'category', 'Expense', 'subcategory', 'Maintenance', 'department', 'Maintenance & Repairs'),
    jsonb_build_object('name', 'Battery Replacement', 'category', 'Expense', 'subcategory', 'Maintenance', 'department', 'Maintenance & Repairs'),
    jsonb_build_object('name', 'Oil Changes & Filters', 'category', 'Expense', 'subcategory', 'Maintenance', 'department', 'Maintenance & Repairs'),
    jsonb_build_object('name', 'Coolant & Fluids', 'category', 'Expense', 'subcategory', 'Maintenance', 'department', 'Maintenance & Repairs'),
    jsonb_build_object('name', 'Windshield Repairs', 'category', 'Expense', 'subcategory', 'Maintenance', 'department', 'Maintenance & Repairs'),
    jsonb_build_object('name', 'Light & Electrical Repairs', 'category', 'Expense', 'subcategory', 'Maintenance', 'department', 'Maintenance & Repairs')
  );
  
  -- DISCRETIONARY EXPENSES - Part 1 (20 items)
  v_line_items := v_line_items || jsonb_build_array(
    jsonb_build_object('name', 'Accounting Fees', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Administration'),
    jsonb_build_object('name', 'Legal Fees', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Administration'),
    jsonb_build_object('name', 'Consulting Fees', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Administration'),
    jsonb_build_object('name', 'Advertising & Marketing', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Customer Service'),
    jsonb_build_object('name', 'Promotional Materials', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Customer Service'),
    jsonb_build_object('name', 'Bank Charges & Fees', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Administration'),
    jsonb_build_object('name', 'Business Meals', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Administration'),
    jsonb_build_object('name', 'Casual Labor', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Staff & Payroll'),
    jsonb_build_object('name', 'Coffee & Pantry Supplies', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Administration'),
    jsonb_build_object('name', 'Computer & IT Expenses', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Administration'),
    jsonb_build_object('name', 'Software Subscriptions', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Administration'),
    jsonb_build_object('name', 'Delivery & Postage', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Administration'),
    jsonb_build_object('name', 'Furniture & Office Equipment', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Administration'),
    jsonb_build_object('name', 'Gifts & Awards', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Administration'),
    jsonb_build_object('name', 'Library & Subscriptions', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Administration'),
    jsonb_build_object('name', 'Meeting Expenses', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Administration'),
    jsonb_build_object('name', 'Office Supplies & Stationery', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Administration'),
    jsonb_build_object('name', 'Personnel Training', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Staff & Payroll'),
    jsonb_build_object('name', 'Driver Training Programs', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Staff & Payroll'),
    jsonb_build_object('name', 'Safety Training', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Staff & Payroll')
  );
  
  -- DISCRETIONARY EXPENSES - Part 2 (20 items)
  v_line_items := v_line_items || jsonb_build_array(
    jsonb_build_object('name', 'Printing & Duplicating', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Administration'),
    jsonb_build_object('name', 'Professional Development', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Administration'),
    jsonb_build_object('name', 'Building Repairs & Maintenance', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Administration'),
    jsonb_build_object('name', 'Security Services', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Administration'),
    jsonb_build_object('name', 'Telephone & Mobile', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Administration'),
    jsonb_build_object('name', 'Internet & Data Services', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Administration'),
    jsonb_build_object('name', 'Travel & Transportation', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Administration'),
    jsonb_build_object('name', 'Utilities - Electricity', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Administration'),
    jsonb_build_object('name', 'Utilities - Water', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Administration'),
    jsonb_build_object('name', 'Waste Management', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Administration'),
    jsonb_build_object('name', 'Uniform & Protective Gear', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Staff & Payroll'),
    jsonb_build_object('name', 'Parking Charges', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Fleet Operations'),
    jsonb_build_object('name', 'Highway Charges & Tolls', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Fleet Operations'),
    jsonb_build_object('name', 'Accident Compensation', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Fleet Operations'),
    jsonb_build_object('name', 'Police Fines & Penalties', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Fleet Operations'),
    jsonb_build_object('name', 'Legal & Court Fees', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Administration'),
    jsonb_build_object('name', 'Log Sheet Expenses', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Fleet Operations'),
    jsonb_build_object('name', 'Runner Services', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Fleet Operations'),
    jsonb_build_object('name', 'Staff Accommodation', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Staff & Payroll'),
    jsonb_build_object('name', 'Vehicle Hire & Rental', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Fleet Operations')
  );
  
  -- DISCRETIONARY EXPENSES - Part 3 + CAPITAL EXPENDITURE (12 items)
  v_line_items := v_line_items || jsonb_build_array(
    jsonb_build_object('name', 'Miscellaneous Expenses', 'category', 'Expense', 'subcategory', 'Discretionary', 'department', 'Administration'),
    jsonb_build_object('name', 'New Bus Purchases', 'category', 'Expense', 'subcategory', 'Capital Expenditure', 'department', 'Fleet Operations'),
    jsonb_build_object('name', 'Used Vehicle Purchases', 'category', 'Expense', 'subcategory', 'Capital Expenditure', 'department', 'Fleet Operations'),
    jsonb_build_object('name', 'Body Modifications', 'category', 'Expense', 'subcategory', 'Capital Expenditure', 'department', 'Fleet Operations'),
    jsonb_build_object('name', 'GPS & Tracking Systems', 'category', 'Expense', 'subcategory', 'Capital Expenditure', 'department', 'Fleet Operations'),
    jsonb_build_object('name', 'CCTV Systems', 'category', 'Expense', 'subcategory', 'Capital Expenditure', 'department', 'Fleet Operations'),
    jsonb_build_object('name', 'Workshop Equipment', 'category', 'Expense', 'subcategory', 'Capital Expenditure', 'department', 'Maintenance & Repairs'),
    jsonb_build_object('name', 'Diagnostic Tools', 'category', 'Expense', 'subcategory', 'Capital Expenditure', 'department', 'Maintenance & Repairs'),
    jsonb_build_object('name', 'Office Computers & Hardware', 'category', 'Expense', 'subcategory', 'Capital Expenditure', 'department', 'Administration'),
    jsonb_build_object('name', 'Building Improvements', 'category', 'Expense', 'subcategory', 'Capital Expenditure', 'department', 'Administration'),
    jsonb_build_object('name', 'Land Purchases', 'category', 'Expense', 'subcategory', 'Capital Expenditure', 'department', 'Administration'),
    jsonb_build_object('name', 'Parking Facility Development', 'category', 'Expense', 'subcategory', 'Capital Expenditure', 'department', 'Administration')
  );
  
  -- CASH FLOW ITEMS (4 items)
  v_line_items := v_line_items || jsonb_build_array(
    jsonb_build_object('name', 'Loan Proceeds Received', 'category', 'Cash Flow', 'subcategory', 'Cash Inflows', 'department', 'Administration'),
    jsonb_build_object('name', 'Accounts Receivable Collections', 'category', 'Cash Flow', 'subcategory', 'Cash Inflows', 'department', 'Administration'),
    jsonb_build_object('name', 'Loan Principal Payments', 'category', 'Cash Flow', 'subcategory', 'Cash Outflows', 'department', 'Administration'),
    jsonb_build_object('name', 'Owner''s Draw / Dividends', 'category', 'Cash Flow', 'subcategory', 'Cash Outflows', 'department', 'Administration')
  );
  
  -- Update template with comprehensive structure
  UPDATE budget_templates
  SET template_structure = jsonb_build_object(
    'departments', jsonb_build_array(
      jsonb_build_object('name', 'Fleet Operations', 'code', 'FLEET', 'description', 'Daily operations and trip management'),
      jsonb_build_object('name', 'Maintenance & Repairs', 'code', 'MAINT', 'description', 'Vehicle maintenance and repair services'),
      jsonb_build_object('name', 'Fuel Management', 'code', 'FUEL', 'description', 'Fuel procurement and consumption'),
      jsonb_build_object('name', 'Staff & Payroll', 'code', 'HR', 'description', 'Employee salaries and benefits'),
      jsonb_build_object('name', 'Administration', 'code', 'ADMIN', 'description', 'Administrative and office operations'),
      jsonb_build_object('name', 'Customer Service', 'code', 'CS', 'description', 'Customer relations and support')
    ),
    'line_items', v_line_items
  )
  WHERE id = v_template_id;

END $$;