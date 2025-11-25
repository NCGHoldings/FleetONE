import { supabase } from "@/integrations/supabase/client";

export const BUDGET_TEMPLATES = [
  {
    template_name: "Transport & Bus Company Budget",
    industry_type: "transportation",
    description: "Comprehensive budget template for bus transport operations including fleet, maintenance, fuel, and staff management.",
    template_structure: {
      departments: [
        { name: "Fleet Operations", code: "FLEET" },
        { name: "Maintenance & Repairs", code: "MAINT" },
        { name: "Fuel Management", code: "FUEL" },
        { name: "Staff & Payroll", code: "STAFF" },
        { name: "Route Operations", code: "ROUTE" },
        { name: "Customer Service", code: "CUST" },
        { name: "Administration", code: "ADMIN" },
      ],
      categories: {
        revenue: ["Daily Trip Income", "Special Hire Revenue", "School Bus Service", "Charter Services", "Advertising Revenue"],
        operating_expenses: ["Fuel & Lubricants", "Driver Salaries", "Conductor Salaries", "Mechanic Wages", "Tyre & Tube Purchases", "Spare Parts", "Vehicle Insurance", "Route Permits", "Vehicle Tax"],
        maintenance: ["Preventive Maintenance", "Emergency Repairs", "Body Wash & Cleaning", "Engine Overhauls", "Brake System Maintenance"],
        capital_expenditure: ["New Vehicle Purchases", "Vehicle Modifications", "GPS/Tracking Systems", "Workshop Equipment"],
        administrative: ["Office Rent & Utilities", "Office Supplies", "IT & Software", "Legal & Professional Fees", "Marketing"],
      },
      line_items: [
        // Revenue Items (300-399)
        { name: "Daily Trip Revenue - Route 1", account_code: "301", category: "Revenue", subcategory: "Operating Revenue", department: "Route Operations", default_amount: 150000 },
        { name: "Daily Trip Revenue - Route 2", account_code: "302", category: "Revenue", subcategory: "Operating Revenue", department: "Route Operations", default_amount: 135000 },
        { name: "Daily Trip Revenue - Route 3", account_code: "303", category: "Revenue", subcategory: "Operating Revenue", department: "Route Operations", default_amount: 125000 },
        { name: "Daily Trip Revenue - Route 4", account_code: "304", category: "Revenue", subcategory: "Operating Revenue", department: "Route Operations", default_amount: 110000 },
        { name: "Daily Trip Revenue - Route 5", account_code: "305", category: "Revenue", subcategory: "Operating Revenue", department: "Route Operations", default_amount: 95000 },
        { name: "Special Hire - Corporate Contracts", account_code: "310", category: "Revenue", subcategory: "Operating Revenue", department: "Customer Service", default_amount: 200000 },
        { name: "Special Hire - Wedding Services", account_code: "311", category: "Revenue", subcategory: "Operating Revenue", department: "Customer Service", default_amount: 85000 },
        { name: "Special Hire - Tourist Tours", account_code: "312", category: "Revenue", subcategory: "Operating Revenue", department: "Customer Service", default_amount: 120000 },
        { name: "Special Hire - Event Transportation", account_code: "313", category: "Revenue", subcategory: "Operating Revenue", department: "Customer Service", default_amount: 75000 },
        { name: "School Bus Service - Monthly Contracts", account_code: "320", category: "Revenue", subcategory: "Operating Revenue", department: "Customer Service", default_amount: 180000 },
        { name: "School Bus Service - Term Payments", account_code: "321", category: "Revenue", subcategory: "Operating Revenue", department: "Customer Service", default_amount: 165000 },
        { name: "Charter Services", account_code: "330", category: "Revenue", subcategory: "Operating Revenue", department: "Customer Service", default_amount: 95000 },
        { name: "Advertising Revenue - Bus Exterior", account_code: "340", category: "Revenue", subcategory: "Operating Revenue", department: "Administration", default_amount: 45000 },
        { name: "Advertising Revenue - Bus Interior", account_code: "341", category: "Revenue", subcategory: "Operating Revenue", department: "Administration", default_amount: 25000 },
        { name: "Luggage Income", account_code: "350", category: "Revenue", subcategory: "Operating Revenue", department: "Route Operations", default_amount: 18000 },
        { name: "Parcel Services", account_code: "351", category: "Revenue", subcategory: "Operating Revenue", department: "Route Operations", default_amount: 12000 },
        { name: "Miscellaneous Income", account_code: "390", category: "Revenue", subcategory: "Operating Revenue", department: "Administration", default_amount: 8000 },
        
        // Fuel & Lubricants (400-419)
        { name: "Diesel Purchases", account_code: "400", category: "Expense", subcategory: "Operating Expenses", department: "Fuel Management", default_amount: 450000 },
        { name: "Petrol Purchases", account_code: "401", category: "Expense", subcategory: "Operating Expenses", department: "Fuel Management", default_amount: 25000 },
        { name: "Engine Oil", account_code: "402", category: "Expense", subcategory: "Operating Expenses", department: "Fuel Management", default_amount: 35000 },
        { name: "Gear Oil", account_code: "403", category: "Expense", subcategory: "Operating Expenses", department: "Fuel Management", default_amount: 15000 },
        { name: "Hydraulic Oil", account_code: "404", category: "Expense", subcategory: "Operating Expenses", department: "Fuel Management", default_amount: 12000 },
        { name: "Coolant & Antifreeze", account_code: "405", category: "Expense", subcategory: "Operating Expenses", department: "Fuel Management", default_amount: 8000 },
        { name: "Grease & Lubricants", account_code: "406", category: "Expense", subcategory: "Operating Expenses", department: "Fuel Management", default_amount: 6000 },
        { name: "Fuel Cards & Digital Payments", account_code: "407", category: "Expense", subcategory: "Operating Expenses", department: "Fuel Management", default_amount: 5000 },
        
        // Staff Salaries & Wages (420-449)
        { name: "Driver Salaries - Basic Pay", account_code: "420", category: "Expense", subcategory: "Fixed Expenses", department: "Staff & Payroll", default_amount: 180000 },
        { name: "Driver Allowances - Meal", account_code: "421", category: "Expense", subcategory: "Fixed Expenses", department: "Staff & Payroll", default_amount: 25000 },
        { name: "Driver Allowances - Travel", account_code: "422", category: "Expense", subcategory: "Fixed Expenses", department: "Staff & Payroll", default_amount: 18000 },
        { name: "Driver Overtime", account_code: "423", category: "Expense", subcategory: "Fixed Expenses", department: "Staff & Payroll", default_amount: 35000 },
        { name: "Driver Bonuses & Incentives", account_code: "424", category: "Expense", subcategory: "Fixed Expenses", department: "Staff & Payroll", default_amount: 45000 },
        { name: "Conductor Salaries - Basic Pay", account_code: "425", category: "Expense", subcategory: "Fixed Expenses", department: "Staff & Payroll", default_amount: 120000 },
        { name: "Conductor Allowances", account_code: "426", category: "Expense", subcategory: "Fixed Expenses", department: "Staff & Payroll", default_amount: 18000 },
        { name: "Conductor Overtime", account_code: "427", category: "Expense", subcategory: "Fixed Expenses", department: "Staff & Payroll", default_amount: 22000 },
        { name: "Mechanic Wages", account_code: "428", category: "Expense", subcategory: "Fixed Expenses", department: "Maintenance & Repairs", default_amount: 85000 },
        { name: "Cleaner Wages", account_code: "429", category: "Expense", subcategory: "Fixed Expenses", department: "Fleet Operations", default_amount: 35000 },
        { name: "Security Staff Salaries", account_code: "430", category: "Expense", subcategory: "Fixed Expenses", department: "Fleet Operations", default_amount: 45000 },
        { name: "Administrative Staff Salaries", account_code: "431", category: "Expense", subcategory: "Fixed Expenses", department: "Administration", default_amount: 95000 },
        { name: "Management Salaries", account_code: "432", category: "Expense", subcategory: "Fixed Expenses", department: "Administration", default_amount: 150000 },
        { name: "Dispatcher Salaries", account_code: "433", category: "Expense", subcategory: "Fixed Expenses", department: "Route Operations", default_amount: 65000 },
        { name: "EPF Contributions", account_code: "434", category: "Expense", subcategory: "Fixed Expenses", department: "Staff & Payroll", default_amount: 85000 },
        { name: "ETF Contributions", account_code: "435", category: "Expense", subcategory: "Fixed Expenses", department: "Staff & Payroll", default_amount: 25000 },
        { name: "Staff Welfare & Benefits", account_code: "436", category: "Expense", subcategory: "Fixed Expenses", department: "Staff & Payroll", default_amount: 45000 },
        { name: "Staff Training & Development", account_code: "437", category: "Expense", subcategory: "Discretionary", department: "Staff & Payroll", default_amount: 18000 },
        { name: "Staff Medical Insurance", account_code: "438", category: "Expense", subcategory: "Fixed Expenses", department: "Staff & Payroll", default_amount: 35000 },
        { name: "Staff Uniform", account_code: "439", category: "Expense", subcategory: "Operating Expenses", department: "Staff & Payroll", default_amount: 15000 },
        
        // Maintenance & Repairs (500-549)
        { name: "Preventive Maintenance - Scheduled Services", account_code: "500", category: "Expense", subcategory: "Maintenance", department: "Maintenance & Repairs", default_amount: 65000 },
        { name: "Engine Repairs", account_code: "501", category: "Expense", subcategory: "Maintenance", department: "Maintenance & Repairs", default_amount: 95000 },
        { name: "Transmission Repairs", account_code: "502", category: "Expense", subcategory: "Maintenance", department: "Maintenance & Repairs", default_amount: 75000 },
        { name: "Brake System Repairs", account_code: "503", category: "Expense", subcategory: "Maintenance", department: "Maintenance & Repairs", default_amount: 55000 },
        { name: "Suspension & Steering Repairs", account_code: "504", category: "Expense", subcategory: "Maintenance", department: "Maintenance & Repairs", default_amount: 45000 },
        { name: "Electrical System Repairs", account_code: "505", category: "Expense", subcategory: "Maintenance", department: "Maintenance & Repairs", default_amount: 38000 },
        { name: "Air Conditioning Repairs", account_code: "506", category: "Expense", subcategory: "Maintenance", department: "Maintenance & Repairs", default_amount: 42000 },
        { name: "Body Repairs & Panel Beating", account_code: "507", category: "Expense", subcategory: "Maintenance", department: "Maintenance & Repairs", default_amount: 65000 },
        { name: "Painting & Touch-ups", account_code: "508", category: "Expense", subcategory: "Maintenance", department: "Maintenance & Repairs", default_amount: 35000 },
        { name: "Upholstery Repairs", account_code: "509", category: "Expense", subcategory: "Maintenance", department: "Maintenance & Repairs", default_amount: 28000 },
        { name: "Glass & Windshield Repairs", account_code: "510", category: "Expense", subcategory: "Maintenance", department: "Maintenance & Repairs", default_amount: 22000 },
        { name: "Engine Overhaul", account_code: "511", category: "Expense", subcategory: "Maintenance", department: "Maintenance & Repairs", default_amount: 185000 },
        { name: "Gearbox Overhaul", account_code: "512", category: "Expense", subcategory: "Maintenance", department: "Maintenance & Repairs", default_amount: 125000 },
        { name: "Radiator Repairs", account_code: "513", category: "Expense", subcategory: "Maintenance", department: "Maintenance & Repairs", default_amount: 18000 },
        { name: "Exhaust System Repairs", account_code: "514", category: "Expense", subcategory: "Maintenance", department: "Maintenance & Repairs", default_amount: 15000 },
        { name: "Welding & Fabrication", account_code: "515", category: "Expense", subcategory: "Maintenance", department: "Maintenance & Repairs", default_amount: 25000 },
        
        // Spare Parts & Tyres (550-579)
        { name: "Tyre Purchases - Front", account_code: "550", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs", default_amount: 85000 },
        { name: "Tyre Purchases - Rear", account_code: "551", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs", default_amount: 125000 },
        { name: "Inner Tubes", account_code: "552", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs", default_amount: 22000 },
        { name: "Tyre Repairs & Retreading", account_code: "553", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs", default_amount: 35000 },
        { name: "Brake Pads & Shoes", account_code: "554", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs", default_amount: 45000 },
        { name: "Air Filters", account_code: "555", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs", default_amount: 12000 },
        { name: "Oil Filters", account_code: "556", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs", default_amount: 15000 },
        { name: "Fuel Filters", account_code: "557", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs", default_amount: 10000 },
        { name: "Spark Plugs", account_code: "558", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs", default_amount: 8000 },
        { name: "Batteries", account_code: "559", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs", default_amount: 35000 },
        { name: "Wiper Blades", account_code: "560", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs", default_amount: 5000 },
        { name: "Light Bulbs & LED", account_code: "561", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs", default_amount: 8000 },
        { name: "Belts & Hoses", account_code: "562", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs", default_amount: 18000 },
        { name: "Bearings", account_code: "563", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs", default_amount: 22000 },
        { name: "Seals & Gaskets", account_code: "564", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs", default_amount: 12000 },
        { name: "Clutch Parts", account_code: "565", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs", default_amount: 45000 },
        { name: "Suspension Parts", account_code: "566", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs", default_amount: 38000 },
        { name: "Steering Parts", account_code: "567", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs", default_amount: 28000 },
        
        // Insurance & Licensing (580-589)
        { name: "Vehicle Insurance - Comprehensive", account_code: "580", category: "Expense", subcategory: "Fixed Expenses", department: "Fleet Operations", default_amount: 125000 },
        { name: "Third Party Insurance", account_code: "581", category: "Expense", subcategory: "Fixed Expenses", department: "Fleet Operations", default_amount: 45000 },
        { name: "Revenue License", account_code: "582", category: "Expense", subcategory: "Fixed Expenses", department: "Fleet Operations", default_amount: 85000 },
        { name: "Route Permits", account_code: "583", category: "Expense", subcategory: "Fixed Expenses", department: "Route Operations", default_amount: 95000 },
        { name: "Temporary Permits", account_code: "584", category: "Expense", subcategory: "Operating Expenses", department: "Route Operations", default_amount: 15000 },
        { name: "Emission Test Fees", account_code: "585", category: "Expense", subcategory: "Fixed Expenses", department: "Fleet Operations", default_amount: 8000 },
        { name: "Fitness Certificate Fees", account_code: "586", category: "Expense", subcategory: "Fixed Expenses", department: "Fleet Operations", default_amount: 12000 },
        { name: "Vehicle Tax", account_code: "587", category: "Expense", subcategory: "Fixed Expenses", department: "Fleet Operations", default_amount: 65000 },
        
        // Operating Expenses (590-619)
        { name: "Parking Charges", account_code: "590", category: "Expense", subcategory: "Operating Expenses", department: "Fleet Operations", default_amount: 18000 },
        { name: "Highway Tolls", account_code: "591", category: "Expense", subcategory: "Operating Expenses", department: "Route Operations", default_amount: 22000 },
        { name: "Police Fines & Penalties", account_code: "592", category: "Expense", subcategory: "Operating Expenses", department: "Fleet Operations", default_amount: 12000 },
        { name: "Court Fees & Legal Expenses", account_code: "593", category: "Expense", subcategory: "Operating Expenses", department: "Administration", default_amount: 25000 },
        { name: "Accident Compensation", account_code: "594", category: "Expense", subcategory: "Operating Expenses", department: "Fleet Operations", default_amount: 45000 },
        { name: "Body Wash & Cleaning", account_code: "595", category: "Expense", subcategory: "Operating Expenses", department: "Fleet Operations", default_amount: 28000 },
        { name: "Cleaning Materials", account_code: "596", category: "Expense", subcategory: "Operating Expenses", department: "Fleet Operations", default_amount: 12000 },
        { name: "Staff Food & Meals", account_code: "597", category: "Expense", subcategory: "Operating Expenses", department: "Staff & Payroll", default_amount: 35000 },
        { name: "Staff Accommodation", account_code: "598", category: "Expense", subcategory: "Operating Expenses", department: "Staff & Payroll", default_amount: 55000 },
        { name: "Vehicle Hire - Emergency", account_code: "599", category: "Expense", subcategory: "Operating Expenses", department: "Fleet Operations", default_amount: 25000 },
        { name: "NTC Charges", account_code: "600", category: "Expense", subcategory: "Operating Expenses", department: "Route Operations", default_amount: 15000 },
        { name: "Runner Services", account_code: "601", category: "Expense", subcategory: "Operating Expenses", department: "Route Operations", default_amount: 8000 },
        { name: "Log Sheet & Documentation", account_code: "602", category: "Expense", subcategory: "Operating Expenses", department: "Route Operations", default_amount: 6000 },
        { name: "Short & Miscellaneous", account_code: "603", category: "Expense", subcategory: "Operating Expenses", department: "Administration", default_amount: 12000 },
        
        // Administration Expenses (620-649)
        { name: "Office Rent", account_code: "620", category: "Expense", subcategory: "Fixed Expenses", department: "Administration", default_amount: 85000 },
        { name: "Electricity & Water", account_code: "621", category: "Expense", subcategory: "Fixed Expenses", department: "Administration", default_amount: 25000 },
        { name: "Telephone & Internet", account_code: "622", category: "Expense", subcategory: "Fixed Expenses", department: "Administration", default_amount: 18000 },
        { name: "Office Supplies & Stationery", account_code: "623", category: "Expense", subcategory: "Operating Expenses", department: "Administration", default_amount: 12000 },
        { name: "Printing & Photocopying", account_code: "624", category: "Expense", subcategory: "Operating Expenses", department: "Administration", default_amount: 8000 },
        { name: "IT & Software Subscriptions", account_code: "625", category: "Expense", subcategory: "Fixed Expenses", department: "Administration", default_amount: 35000 },
        { name: "Computer & IT Equipment", account_code: "626", category: "Expense", subcategory: "Capital Expenditure", department: "Administration", default_amount: 65000 },
        { name: "Accounting & Audit Fees", account_code: "627", category: "Expense", subcategory: "Fixed Expenses", department: "Administration", default_amount: 45000 },
        { name: "Legal & Professional Fees", account_code: "628", category: "Expense", subcategory: "Operating Expenses", department: "Administration", default_amount: 35000 },
        { name: "Bank Charges & Fees", account_code: "629", category: "Expense", subcategory: "Operating Expenses", department: "Administration", default_amount: 8000 },
        { name: "Marketing & Advertising", account_code: "630", category: "Expense", subcategory: "Discretionary", department: "Administration", default_amount: 45000 },
        { name: "Website & Social Media", account_code: "631", category: "Expense", subcategory: "Discretionary", department: "Administration", default_amount: 18000 },
        
        // Capital Expenditure (700-729)
        { name: "New Bus Purchases", account_code: "700", category: "Expense", subcategory: "Capital Expenditure", department: "Fleet Operations", default_amount: 5500000 },
        { name: "Second-hand Bus Purchases", account_code: "701", category: "Expense", subcategory: "Capital Expenditure", department: "Fleet Operations", default_amount: 2500000 },
        { name: "Bus Body Modifications", account_code: "702", category: "Expense", subcategory: "Capital Expenditure", department: "Fleet Operations", default_amount: 350000 },
        { name: "GPS Tracking Systems", account_code: "703", category: "Expense", subcategory: "Capital Expenditure", department: "Fleet Operations", default_amount: 125000 },
        { name: "CCTV Camera Installation", account_code: "704", category: "Expense", subcategory: "Capital Expenditure", department: "Fleet Operations", default_amount: 85000 },
        { name: "Workshop Equipment", account_code: "705", category: "Expense", subcategory: "Capital Expenditure", department: "Maintenance & Repairs", default_amount: 450000 },
        { name: "Garage & Workshop Improvements", account_code: "706", category: "Expense", subcategory: "Capital Expenditure", department: "Maintenance & Repairs", default_amount: 250000 },
        { name: "Office Furniture & Fixtures", account_code: "707", category: "Expense", subcategory: "Capital Expenditure", department: "Administration", default_amount: 95000 },
      ],
    },
  },
  {
    template_name: "General Business Budget",
    industry_type: "general",
    description: "Versatile budget template suitable for most business types covering revenue, expenses, and capital investments.",
    template_structure: {
      departments: [
        { name: "Sales & Marketing", code: "SALES" },
        { name: "Operations", code: "OPS" },
        { name: "Finance & Accounting", code: "FIN" },
        { name: "Human Resources", code: "HR" },
        { name: "IT & Technology", code: "IT" },
        { name: "Administration", code: "ADMIN" },
      ],
      categories: {
        revenue: ["Product Sales", "Service Revenue", "Consulting Income", "Interest & Investment Income"],
        operating_expenses: ["Salaries & Wages", "Rent & Utilities", "Marketing & Advertising", "Professional Services"],
        capital_expenditure: ["Equipment Purchase", "Technology Infrastructure", "Office Improvements"],
      },
      line_items: [
        // Revenue (300-349)
        { name: "Product Sales - Domestic", account_code: "300", category: "Revenue", subcategory: "Operating Revenue", department: "Sales & Marketing", default_amount: 500000 },
        { name: "Product Sales - Export", account_code: "301", category: "Revenue", subcategory: "Operating Revenue", department: "Sales & Marketing", default_amount: 350000 },
        { name: "Service Revenue - Consulting", account_code: "310", category: "Revenue", subcategory: "Operating Revenue", department: "Sales & Marketing", default_amount: 250000 },
        { name: "Service Revenue - Support & Maintenance", account_code: "311", category: "Revenue", subcategory: "Operating Revenue", department: "Sales & Marketing", default_amount: 150000 },
        { name: "Subscription Revenue", account_code: "320", category: "Revenue", subcategory: "Operating Revenue", department: "Sales & Marketing", default_amount: 120000 },
        { name: "Licensing Fees", account_code: "321", category: "Revenue", subcategory: "Operating Revenue", department: "Sales & Marketing", default_amount: 80000 },
        { name: "Interest Income", account_code: "340", category: "Revenue", subcategory: "Operating Revenue", department: "Finance & Accounting", default_amount: 15000 },
        { name: "Investment Income", account_code: "341", category: "Revenue", subcategory: "Operating Revenue", department: "Finance & Accounting", default_amount: 25000 },
        { name: "Other Income", account_code: "390", category: "Revenue", subcategory: "Operating Revenue", department: "Administration", default_amount: 12000 },
        
        // Salaries & Wages (400-449)
        { name: "Executive Salaries", account_code: "400", category: "Expense", subcategory: "Fixed Expenses", department: "Human Resources", default_amount: 350000 },
        { name: "Management Salaries", account_code: "401", category: "Expense", subcategory: "Fixed Expenses", department: "Human Resources", default_amount: 250000 },
        { name: "Staff Salaries", account_code: "402", category: "Expense", subcategory: "Fixed Expenses", department: "Human Resources", default_amount: 450000 },
        { name: "Sales Team Salaries", account_code: "403", category: "Expense", subcategory: "Fixed Expenses", department: "Sales & Marketing", default_amount: 200000 },
        { name: "Sales Commissions", account_code: "404", category: "Expense", subcategory: "Operating Expenses", department: "Sales & Marketing", default_amount: 85000 },
        { name: "Bonuses & Incentives", account_code: "405", category: "Expense", subcategory: "Operating Expenses", department: "Human Resources", default_amount: 95000 },
        { name: "Employee Benefits", account_code: "410", category: "Expense", subcategory: "Fixed Expenses", department: "Human Resources", default_amount: 120000 },
        { name: "Health Insurance", account_code: "411", category: "Expense", subcategory: "Fixed Expenses", department: "Human Resources", default_amount: 85000 },
        { name: "Retirement Contributions", account_code: "412", category: "Expense", subcategory: "Fixed Expenses", department: "Human Resources", default_amount: 65000 },
        { name: "Training & Development", account_code: "413", category: "Expense", subcategory: "Discretionary", department: "Human Resources", default_amount: 35000 },
        { name: "Recruitment & Hiring", account_code: "414", category: "Expense", subcategory: "Operating Expenses", department: "Human Resources", default_amount: 45000 },
        { name: "Employee Welfare", account_code: "415", category: "Expense", subcategory: "Operating Expenses", department: "Human Resources", default_amount: 25000 },
        
        // Rent & Facilities (450-479)
        { name: "Office Rent", account_code: "450", category: "Expense", subcategory: "Fixed Expenses", department: "Administration", default_amount: 150000 },
        { name: "Electricity", account_code: "451", category: "Expense", subcategory: "Fixed Expenses", department: "Administration", default_amount: 45000 },
        { name: "Water & Sewage", account_code: "452", category: "Expense", subcategory: "Fixed Expenses", department: "Administration", default_amount: 12000 },
        { name: "Internet & Telecommunications", account_code: "453", category: "Expense", subcategory: "Fixed Expenses", department: "IT & Technology", default_amount: 35000 },
        { name: "Security Services", account_code: "454", category: "Expense", subcategory: "Fixed Expenses", department: "Administration", default_amount: 25000 },
        { name: "Cleaning Services", account_code: "455", category: "Expense", subcategory: "Fixed Expenses", department: "Administration", default_amount: 18000 },
        { name: "Building Maintenance", account_code: "456", category: "Expense", subcategory: "Maintenance", department: "Administration", default_amount: 35000 },
        { name: "Property Insurance", account_code: "457", category: "Expense", subcategory: "Fixed Expenses", department: "Administration", default_amount: 45000 },
        { name: "Property Tax", account_code: "458", category: "Expense", subcategory: "Fixed Expenses", department: "Administration", default_amount: 55000 },
        
        // Marketing & Advertising (480-509)
        { name: "Digital Marketing", account_code: "480", category: "Expense", subcategory: "Discretionary", department: "Sales & Marketing", default_amount: 85000 },
        { name: "Social Media Advertising", account_code: "481", category: "Expense", subcategory: "Discretionary", department: "Sales & Marketing", default_amount: 45000 },
        { name: "Print Advertising", account_code: "482", category: "Expense", subcategory: "Discretionary", department: "Sales & Marketing", default_amount: 25000 },
        { name: "TV & Radio Advertising", account_code: "483", category: "Expense", subcategory: "Discretionary", department: "Sales & Marketing", default_amount: 95000 },
        { name: "Trade Shows & Events", account_code: "484", category: "Expense", subcategory: "Discretionary", department: "Sales & Marketing", default_amount: 65000 },
        { name: "Marketing Materials", account_code: "485", category: "Expense", subcategory: "Operating Expenses", department: "Sales & Marketing", default_amount: 35000 },
        { name: "Website Development & Maintenance", account_code: "486", category: "Expense", subcategory: "Fixed Expenses", department: "IT & Technology", default_amount: 45000 },
        { name: "SEO & Content Marketing", account_code: "487", category: "Expense", subcategory: "Discretionary", department: "Sales & Marketing", default_amount: 28000 },
        { name: "Public Relations", account_code: "488", category: "Expense", subcategory: "Discretionary", department: "Sales & Marketing", default_amount: 35000 },
        { name: "Market Research", account_code: "489", category: "Expense", subcategory: "Operating Expenses", department: "Sales & Marketing", default_amount: 25000 },
        
        // Professional Services (510-539)
        { name: "Legal Fees", account_code: "510", category: "Expense", subcategory: "Operating Expenses", department: "Administration", default_amount: 55000 },
        { name: "Accounting & Bookkeeping", account_code: "511", category: "Expense", subcategory: "Fixed Expenses", department: "Finance & Accounting", default_amount: 45000 },
        { name: "Audit Fees", account_code: "512", category: "Expense", subcategory: "Fixed Expenses", department: "Finance & Accounting", default_amount: 35000 },
        { name: "Tax Advisory Services", account_code: "513", category: "Expense", subcategory: "Operating Expenses", department: "Finance & Accounting", default_amount: 28000 },
        { name: "Business Consulting", account_code: "514", category: "Expense", subcategory: "Discretionary", department: "Administration", default_amount: 65000 },
        { name: "IT Consulting", account_code: "515", category: "Expense", subcategory: "Operating Expenses", department: "IT & Technology", default_amount: 45000 },
        { name: "HR Consulting", account_code: "516", category: "Expense", subcategory: "Operating Expenses", department: "Human Resources", default_amount: 25000 },
        
        // Office & Admin (540-569)
        { name: "Office Supplies", account_code: "540", category: "Expense", subcategory: "Operating Expenses", department: "Administration", default_amount: 22000 },
        { name: "Stationery & Printing", account_code: "541", category: "Expense", subcategory: "Operating Expenses", department: "Administration", default_amount: 12000 },
        { name: "Postage & Courier", account_code: "542", category: "Expense", subcategory: "Operating Expenses", department: "Administration", default_amount: 8000 },
        { name: "Bank Charges & Fees", account_code: "543", category: "Expense", subcategory: "Operating Expenses", department: "Finance & Accounting", default_amount: 15000 },
        { name: "Credit Card Processing Fees", account_code: "544", category: "Expense", subcategory: "Operating Expenses", department: "Finance & Accounting", default_amount: 18000 },
        { name: "Interest on Loans", account_code: "545", category: "Expense", subcategory: "Fixed Expenses", department: "Finance & Accounting", default_amount: 45000 },
        { name: "Depreciation", account_code: "546", category: "Expense", subcategory: "Fixed Expenses", department: "Finance & Accounting", default_amount: 85000 },
        { name: "Insurance - General Liability", account_code: "547", category: "Expense", subcategory: "Fixed Expenses", department: "Administration", default_amount: 55000 },
        { name: "Insurance - Professional Liability", account_code: "548", category: "Expense", subcategory: "Fixed Expenses", department: "Administration", default_amount: 35000 },
        
        // IT & Technology (570-599)
        { name: "Software Licenses", account_code: "570", category: "Expense", subcategory: "Fixed Expenses", department: "IT & Technology", default_amount: 65000 },
        { name: "Cloud Services & Hosting", account_code: "571", category: "Expense", subcategory: "Fixed Expenses", department: "IT & Technology", default_amount: 45000 },
        { name: "IT Support & Maintenance", account_code: "572", category: "Expense", subcategory: "Fixed Expenses", department: "IT & Technology", default_amount: 35000 },
        { name: "Cybersecurity", account_code: "573", category: "Expense", subcategory: "Fixed Expenses", department: "IT & Technology", default_amount: 28000 },
        { name: "Data Backup & Recovery", account_code: "574", category: "Expense", subcategory: "Fixed Expenses", department: "IT & Technology", default_amount: 18000 },
        { name: "Hardware Maintenance", account_code: "575", category: "Expense", subcategory: "Operating Expenses", department: "IT & Technology", default_amount: 25000 },
        
        // Capital Expenditure (700-729)
        { name: "Computer Equipment", account_code: "700", category: "Expense", subcategory: "Capital Expenditure", department: "IT & Technology", default_amount: 150000 },
        { name: "Office Furniture", account_code: "701", category: "Expense", subcategory: "Capital Expenditure", department: "Administration", default_amount: 85000 },
        { name: "Vehicles", account_code: "702", category: "Expense", subcategory: "Capital Expenditure", department: "Operations", default_amount: 350000 },
        { name: "Machinery & Equipment", account_code: "703", category: "Expense", subcategory: "Capital Expenditure", department: "Operations", default_amount: 450000 },
        { name: "Building Improvements", account_code: "704", category: "Expense", subcategory: "Capital Expenditure", department: "Administration", default_amount: 250000 },
        { name: "Technology Infrastructure", account_code: "705", category: "Expense", subcategory: "Capital Expenditure", department: "IT & Technology", default_amount: 185000 },
      ],
    },
  },
];

export const seedBudgetTemplates = async () => {
  try {
    console.log("Starting budget template seeding...");
    
    const templatesWithMetadata = BUDGET_TEMPLATES.map(template => ({
      ...template,
      is_system_template: true,
      is_active: true,
    }));

    const { data, error } = await supabase
      .from("budget_templates")
      .insert(templatesWithMetadata)
      .select();

    if (error) {
      console.error("Error seeding budget templates:", error);
      throw error;
    }

    console.log(`Successfully seeded ${data.length} budget templates`);
    return data;
  } catch (error) {
    console.error("Failed to seed budget templates:", error);
    throw error;
  }
};
