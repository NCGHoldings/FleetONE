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
        // Revenue Items
        { name: "Daily Trip Revenue - Route 1", category: "Revenue", subcategory: "Operating Revenue", department: "Route Operations" },
        { name: "Daily Trip Revenue - Route 2", category: "Revenue", subcategory: "Operating Revenue", department: "Route Operations" },
        { name: "Daily Trip Revenue - Route 3", category: "Revenue", subcategory: "Operating Revenue", department: "Route Operations" },
        { name: "Daily Trip Revenue - Route 4", category: "Revenue", subcategory: "Operating Revenue", department: "Route Operations" },
        { name: "Daily Trip Revenue - Route 5", category: "Revenue", subcategory: "Operating Revenue", department: "Route Operations" },
        { name: "Special Hire - Corporate Contracts", category: "Revenue", subcategory: "Operating Revenue", department: "Customer Service" },
        { name: "Special Hire - Wedding Services", category: "Revenue", subcategory: "Operating Revenue", department: "Customer Service" },
        { name: "Special Hire - Tourist Tours", category: "Revenue", subcategory: "Operating Revenue", department: "Customer Service" },
        { name: "Special Hire - Event Transportation", category: "Revenue", subcategory: "Operating Revenue", department: "Customer Service" },
        { name: "School Bus Service - Monthly Contracts", category: "Revenue", subcategory: "Operating Revenue", department: "Customer Service" },
        { name: "School Bus Service - Term Payments", category: "Revenue", subcategory: "Operating Revenue", department: "Customer Service" },
        { name: "Charter Services", category: "Revenue", subcategory: "Operating Revenue", department: "Customer Service" },
        { name: "Advertising Revenue - Bus Exterior", category: "Revenue", subcategory: "Operating Revenue", department: "Administration" },
        { name: "Advertising Revenue - Bus Interior", category: "Revenue", subcategory: "Operating Revenue", department: "Administration" },
        { name: "Luggage Income", category: "Revenue", subcategory: "Operating Revenue", department: "Route Operations" },
        { name: "Parcel Services", category: "Revenue", subcategory: "Operating Revenue", department: "Route Operations" },
        { name: "Miscellaneous Income", category: "Revenue", subcategory: "Operating Revenue", department: "Administration" },
        
        // Fuel & Lubricants
        { name: "Diesel Purchases", category: "Expense", subcategory: "Operating Expenses", department: "Fuel Management" },
        { name: "Petrol Purchases", category: "Expense", subcategory: "Operating Expenses", department: "Fuel Management" },
        { name: "Engine Oil", category: "Expense", subcategory: "Operating Expenses", department: "Fuel Management" },
        { name: "Gear Oil", category: "Expense", subcategory: "Operating Expenses", department: "Fuel Management" },
        { name: "Hydraulic Oil", category: "Expense", subcategory: "Operating Expenses", department: "Fuel Management" },
        { name: "Coolant & Antifreeze", category: "Expense", subcategory: "Operating Expenses", department: "Fuel Management" },
        { name: "Grease & Lubricants", category: "Expense", subcategory: "Operating Expenses", department: "Fuel Management" },
        { name: "Fuel Cards & Digital Payments", category: "Expense", subcategory: "Operating Expenses", department: "Fuel Management" },
        
        // Staff Salaries & Wages
        { name: "Driver Salaries - Basic Pay", category: "Expense", subcategory: "Fixed Expenses", department: "Staff & Payroll" },
        { name: "Driver Allowances - Meal", category: "Expense", subcategory: "Fixed Expenses", department: "Staff & Payroll" },
        { name: "Driver Allowances - Travel", category: "Expense", subcategory: "Fixed Expenses", department: "Staff & Payroll" },
        { name: "Driver Overtime", category: "Expense", subcategory: "Fixed Expenses", department: "Staff & Payroll" },
        { name: "Driver Bonuses & Incentives", category: "Expense", subcategory: "Fixed Expenses", department: "Staff & Payroll" },
        { name: "Conductor Salaries - Basic Pay", category: "Expense", subcategory: "Fixed Expenses", department: "Staff & Payroll" },
        { name: "Conductor Allowances", category: "Expense", subcategory: "Fixed Expenses", department: "Staff & Payroll" },
        { name: "Conductor Overtime", category: "Expense", subcategory: "Fixed Expenses", department: "Staff & Payroll" },
        { name: "Mechanic Wages", category: "Expense", subcategory: "Fixed Expenses", department: "Maintenance & Repairs" },
        { name: "Cleaner Wages", category: "Expense", subcategory: "Fixed Expenses", department: "Fleet Operations" },
        { name: "Security Staff Salaries", category: "Expense", subcategory: "Fixed Expenses", department: "Fleet Operations" },
        { name: "Administrative Staff Salaries", category: "Expense", subcategory: "Fixed Expenses", department: "Administration" },
        { name: "Management Salaries", category: "Expense", subcategory: "Fixed Expenses", department: "Administration" },
        { name: "Dispatcher Salaries", category: "Expense", subcategory: "Fixed Expenses", department: "Route Operations" },
        { name: "EPF Contributions", category: "Expense", subcategory: "Fixed Expenses", department: "Staff & Payroll" },
        { name: "ETF Contributions", category: "Expense", subcategory: "Fixed Expenses", department: "Staff & Payroll" },
        { name: "Staff Welfare & Benefits", category: "Expense", subcategory: "Fixed Expenses", department: "Staff & Payroll" },
        { name: "Staff Training & Development", category: "Expense", subcategory: "Discretionary", department: "Staff & Payroll" },
        { name: "Staff Medical Insurance", category: "Expense", subcategory: "Fixed Expenses", department: "Staff & Payroll" },
        { name: "Staff Uniform", category: "Expense", subcategory: "Operating Expenses", department: "Staff & Payroll" },
        
        // Maintenance & Repairs
        { name: "Preventive Maintenance - Scheduled Services", category: "Expense", subcategory: "Maintenance", department: "Maintenance & Repairs" },
        { name: "Engine Repairs", category: "Expense", subcategory: "Maintenance", department: "Maintenance & Repairs" },
        { name: "Transmission Repairs", category: "Expense", subcategory: "Maintenance", department: "Maintenance & Repairs" },
        { name: "Brake System Repairs", category: "Expense", subcategory: "Maintenance", department: "Maintenance & Repairs" },
        { name: "Suspension & Steering Repairs", category: "Expense", subcategory: "Maintenance", department: "Maintenance & Repairs" },
        { name: "Electrical System Repairs", category: "Expense", subcategory: "Maintenance", department: "Maintenance & Repairs" },
        { name: "Air Conditioning Repairs", category: "Expense", subcategory: "Maintenance", department: "Maintenance & Repairs" },
        { name: "Body Repairs & Panel Beating", category: "Expense", subcategory: "Maintenance", department: "Maintenance & Repairs" },
        { name: "Painting & Touch-ups", category: "Expense", subcategory: "Maintenance", department: "Maintenance & Repairs" },
        { name: "Upholstery Repairs", category: "Expense", subcategory: "Maintenance", department: "Maintenance & Repairs" },
        { name: "Glass & Windshield Repairs", category: "Expense", subcategory: "Maintenance", department: "Maintenance & Repairs" },
        { name: "Engine Overhaul", category: "Expense", subcategory: "Maintenance", department: "Maintenance & Repairs" },
        { name: "Gearbox Overhaul", category: "Expense", subcategory: "Maintenance", department: "Maintenance & Repairs" },
        { name: "Radiator Repairs", category: "Expense", subcategory: "Maintenance", department: "Maintenance & Repairs" },
        { name: "Exhaust System Repairs", category: "Expense", subcategory: "Maintenance", department: "Maintenance & Repairs" },
        { name: "Welding & Fabrication", category: "Expense", subcategory: "Maintenance", department: "Maintenance & Repairs" },
        
        // Spare Parts & Tyres
        { name: "Tyre Purchases - Front", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs" },
        { name: "Tyre Purchases - Rear", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs" },
        { name: "Inner Tubes", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs" },
        { name: "Tyre Repairs & Retreading", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs" },
        { name: "Brake Pads & Shoes", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs" },
        { name: "Air Filters", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs" },
        { name: "Oil Filters", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs" },
        { name: "Fuel Filters", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs" },
        { name: "Spark Plugs", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs" },
        { name: "Batteries", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs" },
        { name: "Wiper Blades", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs" },
        { name: "Light Bulbs & LED", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs" },
        { name: "Belts & Hoses", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs" },
        { name: "Bearings", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs" },
        { name: "Seals & Gaskets", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs" },
        { name: "Clutch Parts", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs" },
        { name: "Suspension Parts", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs" },
        { name: "Steering Parts", category: "Expense", subcategory: "Operating Expenses", department: "Maintenance & Repairs" },
        
        // Insurance & Licensing
        { name: "Vehicle Insurance - Comprehensive", category: "Expense", subcategory: "Fixed Expenses", department: "Fleet Operations" },
        { name: "Third Party Insurance", category: "Expense", subcategory: "Fixed Expenses", department: "Fleet Operations" },
        { name: "Revenue License", category: "Expense", subcategory: "Fixed Expenses", department: "Fleet Operations" },
        { name: "Route Permits", category: "Expense", subcategory: "Fixed Expenses", department: "Route Operations" },
        { name: "Temporary Permits", category: "Expense", subcategory: "Operating Expenses", department: "Route Operations" },
        { name: "Emission Test Fees", category: "Expense", subcategory: "Fixed Expenses", department: "Fleet Operations" },
        { name: "Fitness Certificate Fees", category: "Expense", subcategory: "Fixed Expenses", department: "Fleet Operations" },
        { name: "Vehicle Tax", category: "Expense", subcategory: "Fixed Expenses", department: "Fleet Operations" },
        
        // Operating Expenses
        { name: "Parking Charges", category: "Expense", subcategory: "Operating Expenses", department: "Fleet Operations" },
        { name: "Highway Tolls", category: "Expense", subcategory: "Operating Expenses", department: "Route Operations" },
        { name: "Police Fines & Penalties", category: "Expense", subcategory: "Operating Expenses", department: "Fleet Operations" },
        { name: "Court Fees & Legal Expenses", category: "Expense", subcategory: "Operating Expenses", department: "Administration" },
        { name: "Accident Compensation", category: "Expense", subcategory: "Operating Expenses", department: "Fleet Operations" },
        { name: "Body Wash & Cleaning", category: "Expense", subcategory: "Operating Expenses", department: "Fleet Operations" },
        { name: "Cleaning Materials", category: "Expense", subcategory: "Operating Expenses", department: "Fleet Operations" },
        { name: "Staff Food & Meals", category: "Expense", subcategory: "Operating Expenses", department: "Staff & Payroll" },
        { name: "Staff Accommodation", category: "Expense", subcategory: "Operating Expenses", department: "Staff & Payroll" },
        { name: "Vehicle Hire - Emergency", category: "Expense", subcategory: "Operating Expenses", department: "Fleet Operations" },
        { name: "NTC Charges", category: "Expense", subcategory: "Operating Expenses", department: "Route Operations" },
        { name: "Runner Services", category: "Expense", subcategory: "Operating Expenses", department: "Route Operations" },
        { name: "Log Sheet & Documentation", category: "Expense", subcategory: "Operating Expenses", department: "Route Operations" },
        { name: "Short & Miscellaneous", category: "Expense", subcategory: "Operating Expenses", department: "Administration" },
        
        // Administration Expenses
        { name: "Office Rent", category: "Expense", subcategory: "Fixed Expenses", department: "Administration" },
        { name: "Electricity & Water", category: "Expense", subcategory: "Fixed Expenses", department: "Administration" },
        { name: "Telephone & Internet", category: "Expense", subcategory: "Fixed Expenses", department: "Administration" },
        { name: "Office Supplies & Stationery", category: "Expense", subcategory: "Operating Expenses", department: "Administration" },
        { name: "Printing & Photocopying", category: "Expense", subcategory: "Operating Expenses", department: "Administration" },
        { name: "IT & Software Subscriptions", category: "Expense", subcategory: "Fixed Expenses", department: "Administration" },
        { name: "Computer & IT Equipment", category: "Expense", subcategory: "Capital Expenditure", department: "Administration" },
        { name: "Accounting & Audit Fees", category: "Expense", subcategory: "Fixed Expenses", department: "Administration" },
        { name: "Legal & Professional Fees", category: "Expense", subcategory: "Operating Expenses", department: "Administration" },
        { name: "Bank Charges & Fees", category: "Expense", subcategory: "Operating Expenses", department: "Administration" },
        { name: "Marketing & Advertising", category: "Expense", subcategory: "Discretionary", department: "Administration" },
        { name: "Website & Social Media", category: "Expense", subcategory: "Discretionary", department: "Administration" },
        
        // Capital Expenditure
        { name: "New Bus Purchases", category: "Expense", subcategory: "Capital Expenditure", department: "Fleet Operations" },
        { name: "Second-hand Bus Purchases", category: "Expense", subcategory: "Capital Expenditure", department: "Fleet Operations" },
        { name: "Bus Body Modifications", category: "Expense", subcategory: "Capital Expenditure", department: "Fleet Operations" },
        { name: "GPS Tracking Systems", category: "Expense", subcategory: "Capital Expenditure", department: "Fleet Operations" },
        { name: "CCTV Camera Installation", category: "Expense", subcategory: "Capital Expenditure", department: "Fleet Operations" },
        { name: "Workshop Equipment", category: "Expense", subcategory: "Capital Expenditure", department: "Maintenance & Repairs" },
        { name: "Garage & Workshop Improvements", category: "Expense", subcategory: "Capital Expenditure", department: "Maintenance & Repairs" },
        { name: "Office Furniture & Fixtures", category: "Expense", subcategory: "Capital Expenditure", department: "Administration" },
      ],
    },
  },
  {
    template_name: "Manufacturing Budget",
    industry_type: "manufacturing",
    description: "Complete budget template for manufacturing operations including production, procurement, and quality control.",
    template_structure: {
      departments: [
        { name: "Production", code: "PROD" },
        { name: "Quality Control", code: "QC" },
        { name: "Procurement", code: "PROC" },
        { name: "Warehouse & Logistics", code: "WARE" },
        { name: "Sales & Marketing", code: "SALES" },
        { name: "R&D", code: "RND" },
        { name: "Administration", code: "ADMIN" },
      ],
      categories: {
        revenue: ["Product Sales", "Service Revenue", "Consulting Fees"],
        direct_costs: ["Raw Materials", "Direct Labor", "Factory Overhead", "Packaging Materials"],
        operating_expenses: ["Utilities", "Equipment Maintenance", "Quality Testing", "Shipping & Logistics"],
        capital_expenditure: ["Production Equipment", "Facility Upgrades", "Technology Systems"],
        administrative: ["Office Expenses", "IT Infrastructure", "Professional Services"],
      },
      line_items: [
        // Revenue
        { name: "Product Sales - Finished Goods", category: "Revenue", subcategory: "Operating Revenue", department: "Sales & Marketing" },
        { name: "Product Sales - Semi-Finished Goods", category: "Revenue", subcategory: "Operating Revenue", department: "Sales & Marketing" },
        { name: "Custom Order Revenue", category: "Revenue", subcategory: "Operating Revenue", department: "Sales & Marketing" },
        { name: "Export Sales", category: "Revenue", subcategory: "Operating Revenue", department: "Sales & Marketing" },
        { name: "Domestic Sales", category: "Revenue", subcategory: "Operating Revenue", department: "Sales & Marketing" },
        { name: "Wholesale Revenue", category: "Revenue", subcategory: "Operating Revenue", department: "Sales & Marketing" },
        { name: "Retail Revenue", category: "Revenue", subcategory: "Operating Revenue", department: "Sales & Marketing" },
        { name: "Service & Repair Revenue", category: "Revenue", subcategory: "Operating Revenue", department: "Production" },
        { name: "Technical Consulting Fees", category: "Revenue", subcategory: "Operating Revenue", department: "R&D" },
        { name: "Waste & Scrap Sales", category: "Revenue", subcategory: "Operating Revenue", department: "Production" },
        { name: "Tooling & Mold Sales", category: "Revenue", subcategory: "Operating Revenue", department: "Production" },
        
        // Raw Materials & Direct Costs
        { name: "Raw Material - Primary Input", category: "Expense", subcategory: "Operating Expenses", department: "Procurement" },
        { name: "Raw Material - Secondary Input", category: "Expense", subcategory: "Operating Expenses", department: "Procurement" },
        { name: "Raw Material - Chemicals", category: "Expense", subcategory: "Operating Expenses", department: "Procurement" },
        { name: "Raw Material - Metals", category: "Expense", subcategory: "Operating Expenses", department: "Procurement" },
        { name: "Raw Material - Plastics", category: "Expense", subcategory: "Operating Expenses", department: "Procurement" },
        { name: "Raw Material - Textiles", category: "Expense", subcategory: "Operating Expenses", department: "Procurement" },
        { name: "Packaging Materials - Boxes", category: "Expense", subcategory: "Operating Expenses", department: "Procurement" },
        { name: "Packaging Materials - Labels", category: "Expense", subcategory: "Operating Expenses", department: "Procurement" },
        { name: "Packaging Materials - Wrapping", category: "Expense", subcategory: "Operating Expenses", department: "Procurement" },
        { name: "Packaging Materials - Pallets", category: "Expense", subcategory: "Operating Expenses", department: "Procurement" },
        { name: "Direct Labor - Production Workers", category: "Expense", subcategory: "Fixed Expenses", department: "Production" },
        { name: "Direct Labor - Machine Operators", category: "Expense", subcategory: "Fixed Expenses", department: "Production" },
        { name: "Direct Labor - Assembly Line Staff", category: "Expense", subcategory: "Fixed Expenses", department: "Production" },
        { name: "Direct Labor - Overtime", category: "Expense", subcategory: "Operating Expenses", department: "Production" },
        { name: "Direct Labor - Shift Allowances", category: "Expense", subcategory: "Fixed Expenses", department: "Production" },
        
        // Factory Overhead
        { name: "Factory Electricity", category: "Expense", subcategory: "Fixed Expenses", department: "Production" },
        { name: "Factory Water & Sewage", category: "Expense", subcategory: "Fixed Expenses", department: "Production" },
        { name: "Factory Gas & Fuel", category: "Expense", subcategory: "Operating Expenses", department: "Production" },
        { name: "Factory Rent & Lease", category: "Expense", subcategory: "Fixed Expenses", department: "Production" },
        { name: "Factory Security", category: "Expense", subcategory: "Fixed Expenses", department: "Production" },
        { name: "Factory Cleaning & Sanitation", category: "Expense", subcategory: "Operating Expenses", department: "Production" },
        { name: "Factory Insurance", category: "Expense", subcategory: "Fixed Expenses", department: "Production" },
        { name: "Production Supervisor Salaries", category: "Expense", subcategory: "Fixed Expenses", department: "Production" },
        { name: "Foreman Wages", category: "Expense", subcategory: "Fixed Expenses", department: "Production" },
        { name: "Production Planning Costs", category: "Expense", subcategory: "Operating Expenses", department: "Production" },
        
        // Quality Control
        { name: "QC Staff Salaries", category: "Expense", subcategory: "Fixed Expenses", department: "Quality Control" },
        { name: "Testing Materials & Consumables", category: "Expense", subcategory: "Operating Expenses", department: "Quality Control" },
        { name: "Laboratory Equipment Maintenance", category: "Expense", subcategory: "Maintenance", department: "Quality Control" },
        { name: "Calibration Services", category: "Expense", subcategory: "Operating Expenses", department: "Quality Control" },
        { name: "Third-Party Testing Fees", category: "Expense", subcategory: "Operating Expenses", department: "Quality Control" },
        { name: "Quality Certification Fees", category: "Expense", subcategory: "Fixed Expenses", department: "Quality Control" },
        { name: "Product Testing & Analysis", category: "Expense", subcategory: "Operating Expenses", department: "Quality Control" },
        { name: "Inspection Tools & Equipment", category: "Expense", subcategory: "Operating Expenses", department: "Quality Control" },
        
        // Equipment Maintenance
        { name: "Production Machine Maintenance", category: "Expense", subcategory: "Maintenance", department: "Production" },
        { name: "Preventive Maintenance Schedule", category: "Expense", subcategory: "Maintenance", department: "Production" },
        { name: "Emergency Repairs", category: "Expense", subcategory: "Maintenance", department: "Production" },
        { name: "Machine Parts & Spares", category: "Expense", subcategory: "Operating Expenses", department: "Production" },
        { name: "Tooling Replacement", category: "Expense", subcategory: "Operating Expenses", department: "Production" },
        { name: "Dies & Molds Maintenance", category: "Expense", subcategory: "Maintenance", department: "Production" },
        { name: "Conveyor Belt Maintenance", category: "Expense", subcategory: "Maintenance", department: "Production" },
        { name: "HVAC System Maintenance", category: "Expense", subcategory: "Maintenance", department: "Production" },
        { name: "Compressed Air System Maintenance", category: "Expense", subcategory: "Maintenance", department: "Production" },
        { name: "Electrical System Maintenance", category: "Expense", subcategory: "Maintenance", department: "Production" },
        
        // Warehouse & Logistics
        { name: "Warehouse Staff Salaries", category: "Expense", subcategory: "Fixed Expenses", department: "Warehouse & Logistics" },
        { name: "Forklift Operations & Maintenance", category: "Expense", subcategory: "Operating Expenses", department: "Warehouse & Logistics" },
        { name: "Warehouse Rent", category: "Expense", subcategory: "Fixed Expenses", department: "Warehouse & Logistics" },
        { name: "Warehouse Utilities", category: "Expense", subcategory: "Fixed Expenses", department: "Warehouse & Logistics" },
        { name: "Packing & Loading Supplies", category: "Expense", subcategory: "Operating Expenses", department: "Warehouse & Logistics" },
        { name: "Inventory Management Software", category: "Expense", subcategory: "Fixed Expenses", department: "Warehouse & Logistics" },
        { name: "Stock Taking & Audits", category: "Expense", subcategory: "Operating Expenses", department: "Warehouse & Logistics" },
        { name: "Shipping & Freight - Domestic", category: "Expense", subcategory: "Operating Expenses", department: "Warehouse & Logistics" },
        { name: "Shipping & Freight - Export", category: "Expense", subcategory: "Operating Expenses", department: "Warehouse & Logistics" },
        { name: "Courier Services", category: "Expense", subcategory: "Operating Expenses", department: "Warehouse & Logistics" },
        { name: "Customs & Import Duties", category: "Expense", subcategory: "Operating Expenses", department: "Warehouse & Logistics" },
        { name: "Transportation - Company Vehicles", category: "Expense", subcategory: "Operating Expenses", department: "Warehouse & Logistics" },
        { name: "Transportation - Third Party", category: "Expense", subcategory: "Operating Expenses", department: "Warehouse & Logistics" },
        
        // R&D
        { name: "R&D Staff Salaries", category: "Expense", subcategory: "Fixed Expenses", department: "R&D" },
        { name: "Research Materials", category: "Expense", subcategory: "Operating Expenses", department: "R&D" },
        { name: "Prototype Development", category: "Expense", subcategory: "Operating Expenses", department: "R&D" },
        { name: "Product Testing & Trials", category: "Expense", subcategory: "Operating Expenses", department: "R&D" },
        { name: "Patent & Trademark Fees", category: "Expense", subcategory: "Operating Expenses", department: "R&D" },
        { name: "Technical Subscriptions", category: "Expense", subcategory: "Fixed Expenses", department: "R&D" },
        { name: "R&D Equipment", category: "Expense", subcategory: "Capital Expenditure", department: "R&D" },
        
        // Sales & Marketing
        { name: "Sales Team Salaries", category: "Expense", subcategory: "Fixed Expenses", department: "Sales & Marketing" },
        { name: "Sales Commissions", category: "Expense", subcategory: "Operating Expenses", department: "Sales & Marketing" },
        { name: "Sales Travel & Entertainment", category: "Expense", subcategory: "Operating Expenses", department: "Sales & Marketing" },
        { name: "Advertising - Print Media", category: "Expense", subcategory: "Discretionary", department: "Sales & Marketing" },
        { name: "Advertising - Digital Media", category: "Expense", subcategory: "Discretionary", department: "Sales & Marketing" },
        { name: "Trade Shows & Exhibitions", category: "Expense", subcategory: "Discretionary", department: "Sales & Marketing" },
        { name: "Marketing Materials", category: "Expense", subcategory: "Operating Expenses", department: "Sales & Marketing" },
        { name: "Product Catalogs & Brochures", category: "Expense", subcategory: "Operating Expenses", department: "Sales & Marketing" },
        { name: "Website & E-commerce", category: "Expense", subcategory: "Fixed Expenses", department: "Sales & Marketing" },
        { name: "Customer Relationship Management", category: "Expense", subcategory: "Fixed Expenses", department: "Sales & Marketing" },
        
        // Administration
        { name: "Administrative Staff Salaries", category: "Expense", subcategory: "Fixed Expenses", department: "Administration" },
        { name: "Management Salaries", category: "Expense", subcategory: "Fixed Expenses", department: "Administration" },
        { name: "Office Rent", category: "Expense", subcategory: "Fixed Expenses", department: "Administration" },
        { name: "Office Utilities", category: "Expense", subcategory: "Fixed Expenses", department: "Administration" },
        { name: "Office Supplies", category: "Expense", subcategory: "Operating Expenses", department: "Administration" },
        { name: "Telephone & Internet", category: "Expense", subcategory: "Fixed Expenses", department: "Administration" },
        { name: "IT Support & Services", category: "Expense", subcategory: "Fixed Expenses", department: "Administration" },
        { name: "Software Licenses", category: "Expense", subcategory: "Fixed Expenses", department: "Administration" },
        { name: "Accounting & Bookkeeping", category: "Expense", subcategory: "Fixed Expenses", department: "Administration" },
        { name: "Legal Fees", category: "Expense", subcategory: "Operating Expenses", department: "Administration" },
        { name: "Audit Fees", category: "Expense", subcategory: "Fixed Expenses", department: "Administration" },
        { name: "Insurance - General Liability", category: "Expense", subcategory: "Fixed Expenses", department: "Administration" },
        { name: "Bank Charges", category: "Expense", subcategory: "Operating Expenses", department: "Administration" },
        { name: "Professional Development", category: "Expense", subcategory: "Discretionary", department: "Administration" },
        
        // Capital Expenditure
        { name: "Production Machinery Purchase", category: "Expense", subcategory: "Capital Expenditure", department: "Production" },
        { name: "CNC Machines", category: "Expense", subcategory: "Capital Expenditure", department: "Production" },
        { name: "Assembly Line Equipment", category: "Expense", subcategory: "Capital Expenditure", department: "Production" },
        { name: "Automation Systems", category: "Expense", subcategory: "Capital Expenditure", department: "Production" },
        { name: "Robotics", category: "Expense", subcategory: "Capital Expenditure", department: "Production" },
        { name: "Factory Building Purchase/Lease", category: "Expense", subcategory: "Capital Expenditure", department: "Production" },
        { name: "Factory Expansion", category: "Expense", subcategory: "Capital Expenditure", department: "Production" },
        { name: "Warehouse Expansion", category: "Expense", subcategory: "Capital Expenditure", department: "Warehouse & Logistics" },
        { name: "IT Infrastructure", category: "Expense", subcategory: "Capital Expenditure", department: "Administration" },
        { name: "ERP System Implementation", category: "Expense", subcategory: "Capital Expenditure", department: "Administration" },
        { name: "Office Furniture & Fixtures", category: "Expense", subcategory: "Capital Expenditure", department: "Administration" },
      ],
    },
  },
  {
    template_name: "Retail Business Budget",
    industry_type: "retail",
    description: "Budget template for retail operations covering sales, inventory, and store management.",
    template_structure: {
      departments: [
        { name: "Sales", code: "SALES" },
        { name: "Inventory Management", code: "INV" },
        { name: "Customer Service", code: "CUST" },
        { name: "Marketing", code: "MKTG" },
        { name: "Store Operations", code: "STORE" },
      ],
      categories: {
        revenue: ["Product Sales", "Service Revenue", "Online Sales", "Memberships"],
        cost_of_goods: ["Inventory Purchases", "Supplier Payments", "Shipping Costs"],
        operating_expenses: ["Store Rent", "Utilities", "Staff Salaries", "Marketing & Promotions", "POS Systems", "Security"],
        capital_expenditure: ["Store Renovations", "POS Equipment", "Inventory Systems"],
      },
      line_items: [
        // Revenue
        { name: "In-Store Sales - Electronics", category: "Revenue", subcategory: "Operating Revenue", department: "Sales" },
        { name: "In-Store Sales - Clothing", category: "Revenue", subcategory: "Operating Revenue", department: "Sales" },
        { name: "In-Store Sales - Groceries", category: "Revenue", subcategory: "Operating Revenue", department: "Sales" },
        { name: "In-Store Sales - Home & Garden", category: "Revenue", subcategory: "Operating Revenue", department: "Sales" },
        { name: "Online Sales - E-commerce", category: "Revenue", subcategory: "Operating Revenue", department: "Sales" },
        { name: "Online Sales - Mobile App", category: "Revenue", subcategory: "Operating Revenue", department: "Sales" },
        { name: "Gift Card Sales", category: "Revenue", subcategory: "Operating Revenue", department: "Sales" },
        { name: "Loyalty Program Memberships", category: "Revenue", subcategory: "Operating Revenue", department: "Customer Service" },
        { name: "Extended Warranty Sales", category: "Revenue", subcategory: "Operating Revenue", department: "Customer Service" },
        { name: "Installation Services", category: "Revenue", subcategory: "Operating Revenue", department: "Customer Service" },
        { name: "Delivery Fees", category: "Revenue", subcategory: "Operating Revenue", department: "Store Operations" },
        
        // Cost of Goods Sold
        { name: "Inventory Purchases - Supplier A", category: "Expense", subcategory: "Operating Expenses", department: "Inventory Management" },
        { name: "Inventory Purchases - Supplier B", category: "Expense", subcategory: "Operating Expenses", department: "Inventory Management" },
        { name: "Import Duties & Customs", category: "Expense", subcategory: "Operating Expenses", department: "Inventory Management" },
        { name: "Freight & Shipping - Inbound", category: "Expense", subcategory: "Operating Expenses", department: "Inventory Management" },
        { name: "Product Returns & Allowances", category: "Expense", subcategory: "Operating Expenses", department: "Customer Service" },
        { name: "Shrinkage & Inventory Loss", category: "Expense", subcategory: "Operating Expenses", department: "Inventory Management" },
        { name: "Damaged Goods Write-off", category: "Expense", subcategory: "Operating Expenses", department: "Inventory Management" },
        
        // Store Operations
        { name: "Store Rent - Main Location", category: "Expense", subcategory: "Fixed Expenses", department: "Store Operations" },
        { name: "Store Rent - Branch Locations", category: "Expense", subcategory: "Fixed Expenses", department: "Store Operations" },
        { name: "Utilities - Electricity", category: "Expense", subcategory: "Fixed Expenses", department: "Store Operations" },
        { name: "Utilities - Water & Sewage", category: "Expense", subcategory: "Fixed Expenses", department: "Store Operations" },
        { name: "Utilities - Heating & Cooling", category: "Expense", subcategory: "Fixed Expenses", department: "Store Operations" },
        { name: "Store Maintenance & Repairs", category: "Expense", subcategory: "Maintenance", department: "Store Operations" },
        { name: "Cleaning Services", category: "Expense", subcategory: "Operating Expenses", department: "Store Operations" },
        { name: "Security Services", category: "Expense", subcategory: "Fixed Expenses", department: "Store Operations" },
        { name: "Security Systems & Alarms", category: "Expense", subcategory: "Fixed Expenses", department: "Store Operations" },
        { name: "CCTV Monitoring", category: "Expense", subcategory: "Fixed Expenses", department: "Store Operations" },
        { name: "Fire Safety & Compliance", category: "Expense", subcategory: "Fixed Expenses", department: "Store Operations" },
        
        // Staff & Payroll
        { name: "Sales Staff Salaries", category: "Expense", subcategory: "Fixed Expenses", department: "Sales" },
        { name: "Sales Commissions & Bonuses", category: "Expense", subcategory: "Operating Expenses", department: "Sales" },
        { name: "Cashier Wages", category: "Expense", subcategory: "Fixed Expenses", department: "Sales" },
        { name: "Stock Clerks Wages", category: "Expense", subcategory: "Fixed Expenses", department: "Inventory Management" },
        { name: "Store Manager Salary", category: "Expense", subcategory: "Fixed Expenses", department: "Store Operations" },
        { name: "Assistant Manager Salary", category: "Expense", subcategory: "Fixed Expenses", department: "Store Operations" },
        { name: "Customer Service Staff", category: "Expense", subcategory: "Fixed Expenses", department: "Customer Service" },
        { name: "Security Staff Wages", category: "Expense", subcategory: "Fixed Expenses", department: "Store Operations" },
        { name: "Maintenance Staff Wages", category: "Expense", subcategory: "Fixed Expenses", department: "Store Operations" },
        { name: "Staff Training Programs", category: "Expense", subcategory: "Discretionary", department: "Store Operations" },
        { name: "Staff Uniforms", category: "Expense", subcategory: "Operating Expenses", department: "Store Operations" },
        { name: "Employee Benefits", category: "Expense", subcategory: "Fixed Expenses", department: "Store Operations" },
        
        // POS & Technology
        { name: "POS System License", category: "Expense", subcategory: "Fixed Expenses", department: "Sales" },
        { name: "POS Hardware Maintenance", category: "Expense", subcategory: "Operating Expenses", department: "Sales" },
        { name: "Inventory Management Software", category: "Expense", subcategory: "Fixed Expenses", department: "Inventory Management" },
        { name: "E-commerce Platform Fees", category: "Expense", subcategory: "Fixed Expenses", department: "Sales" },
        { name: "Payment Processing Fees", category: "Expense", subcategory: "Operating Expenses", department: "Sales" },
        { name: "Credit Card Merchant Fees", category: "Expense", subcategory: "Operating Expenses", department: "Sales" },
        { name: "Internet & WiFi", category: "Expense", subcategory: "Fixed Expenses", department: "Store Operations" },
        { name: "IT Support Services", category: "Expense", subcategory: "Fixed Expenses", department: "Store Operations" },
        
        // Marketing & Advertising
        { name: "Social Media Advertising", category: "Expense", subcategory: "Discretionary", department: "Marketing" },
        { name: "Google Ads & SEO", category: "Expense", subcategory: "Discretionary", department: "Marketing" },
        { name: "Print Advertising", category: "Expense", subcategory: "Discretionary", department: "Marketing" },
        { name: "Radio & TV Advertising", category: "Expense", subcategory: "Discretionary", department: "Marketing" },
        { name: "Email Marketing", category: "Expense", subcategory: "Discretionary", department: "Marketing" },
        { name: "In-Store Promotions", category: "Expense", subcategory: "Operating Expenses", department: "Marketing" },
        { name: "Loyalty Program Costs", category: "Expense", subcategory: "Operating Expenses", department: "Customer Service" },
        { name: "Gift with Purchase", category: "Expense", subcategory: "Operating Expenses", department: "Marketing" },
        { name: "Seasonal Decorations", category: "Expense", subcategory: "Operating Expenses", department: "Store Operations" },
        { name: "Signage & Displays", category: "Expense", subcategory: "Operating Expenses", department: "Marketing" },
        { name: "Photography & Videography", category: "Expense", subcategory: "Discretionary", department: "Marketing" },
        { name: "Marketing Agency Fees", category: "Expense", subcategory: "Discretionary", department: "Marketing" },
        
        // Customer Service
        { name: "Returns Processing", category: "Expense", subcategory: "Operating Expenses", department: "Customer Service" },
        { name: "Customer Complaints Resolution", category: "Expense", subcategory: "Operating Expenses", department: "Customer Service" },
        { name: "Warranty Claims", category: "Expense", subcategory: "Operating Expenses", department: "Customer Service" },
        { name: "Customer Surveys & Feedback", category: "Expense", subcategory: "Operating Expenses", department: "Customer Service" },
        
        // Supplies & Packaging
        { name: "Shopping Bags & Packaging", category: "Expense", subcategory: "Operating Expenses", department: "Store Operations" },
        { name: "Gift Wrapping Materials", category: "Expense", subcategory: "Operating Expenses", department: "Customer Service" },
        { name: "Receipt Paper & Printer Supplies", category: "Expense", subcategory: "Operating Expenses", department: "Sales" },
        { name: "Price Tags & Labels", category: "Expense", subcategory: "Operating Expenses", department: "Inventory Management" },
        { name: "Office Supplies", category: "Expense", subcategory: "Operating Expenses", department: "Store Operations" },
        
        // Insurance & Legal
        { name: "General Liability Insurance", category: "Expense", subcategory: "Fixed Expenses", department: "Store Operations" },
        { name: "Property Insurance", category: "Expense", subcategory: "Fixed Expenses", department: "Store Operations" },
        { name: "Business License & Permits", category: "Expense", subcategory: "Fixed Expenses", department: "Store Operations" },
        { name: "Legal Fees", category: "Expense", subcategory: "Operating Expenses", department: "Store Operations" },
        { name: "Accounting & Bookkeeping", category: "Expense", subcategory: "Fixed Expenses", department: "Store Operations" },
        
        // Capital Expenditure
        { name: "Store Renovation", category: "Expense", subcategory: "Capital Expenditure", department: "Store Operations" },
        { name: "New Store Opening", category: "Expense", subcategory: "Capital Expenditure", department: "Store Operations" },
        { name: "POS Equipment Purchase", category: "Expense", subcategory: "Capital Expenditure", department: "Sales" },
        { name: "Shelving & Display Units", category: "Expense", subcategory: "Capital Expenditure", department: "Store Operations" },
        { name: "Furniture & Fixtures", category: "Expense", subcategory: "Capital Expenditure", department: "Store Operations" },
        { name: "Refrigeration Equipment", category: "Expense", subcategory: "Capital Expenditure", department: "Store Operations" },
        { name: "Security System Upgrade", category: "Expense", subcategory: "Capital Expenditure", department: "Store Operations" },
        { name: "Delivery Vehicles", category: "Expense", subcategory: "Capital Expenditure", department: "Store Operations" },
        { name: "Warehouse Equipment", category: "Expense", subcategory: "Capital Expenditure", department: "Inventory Management" },
        { name: "IT Infrastructure", category: "Expense", subcategory: "Capital Expenditure", department: "Store Operations" },
      ],
    },
  },
  {
    template_name: "Service Company Budget",
    industry_type: "services",
    description: "Budget template for service-based businesses including consulting, professional services, and client management.",
    template_structure: {
      departments: [
        { name: "Service Delivery", code: "SERV" },
        { name: "Client Management", code: "CLIENT" },
        { name: "Operations", code: "OPS" },
        { name: "Business Development", code: "BD" },
      ],
      categories: {
        revenue: ["Professional Fees", "Consulting Revenue", "Retainer Contracts", "Project Revenue"],
        operating_expenses: ["Service Personnel Costs", "Professional Development", "Client Acquisition", "Technology & Tools", "Office Expenses"],
        capital_expenditure: ["Software Licenses", "Equipment", "Office Setup"],
      },
      line_items: [
        // Revenue
        { name: "Consulting Fees - Strategic", category: "Revenue", subcategory: "Operating Revenue", department: "Service Delivery" },
        { name: "Consulting Fees - Technical", category: "Revenue", subcategory: "Operating Revenue", department: "Service Delivery" },
        { name: "Consulting Fees - Management", category: "Revenue", subcategory: "Operating Revenue", department: "Service Delivery" },
        { name: "Project Revenue - Fixed Price", category: "Revenue", subcategory: "Operating Revenue", department: "Service Delivery" },
        { name: "Project Revenue - Time & Materials", category: "Revenue", subcategory: "Operating Revenue", department: "Service Delivery" },
        { name: "Retainer Contracts - Monthly", category: "Revenue", subcategory: "Operating Revenue", department: "Client Management" },
        { name: "Retainer Contracts - Annual", category: "Revenue", subcategory: "Operating Revenue", department: "Client Management" },
        { name: "Professional Fees - Legal", category: "Revenue", subcategory: "Operating Revenue", department: "Service Delivery" },
        { name: "Professional Fees - Accounting", category: "Revenue", subcategory: "Operating Revenue", department: "Service Delivery" },
        { name: "Professional Fees - Advisory", category: "Revenue", subcategory: "Operating Revenue", department: "Service Delivery" },
        { name: "Training & Workshop Revenue", category: "Revenue", subcategory: "Operating Revenue", department: "Service Delivery" },
        { name: "Certification Programs", category: "Revenue", subcategory: "Operating Revenue", department: "Service Delivery" },
        { name: "Speaking Engagements", category: "Revenue", subcategory: "Operating Revenue", department: "Business Development" },
        
        // Service Personnel
        { name: "Consultant Salaries - Senior", category: "Expense", subcategory: "Fixed Expenses", department: "Service Delivery" },
        { name: "Consultant Salaries - Mid-Level", category: "Expense", subcategory: "Fixed Expenses", department: "Service Delivery" },
        { name: "Consultant Salaries - Junior", category: "Expense", subcategory: "Fixed Expenses", department: "Service Delivery" },
        { name: "Freelance Consultant Fees", category: "Expense", subcategory: "Operating Expenses", department: "Service Delivery" },
        { name: "Project Manager Salaries", category: "Expense", subcategory: "Fixed Expenses", department: "Service Delivery" },
        { name: "Account Manager Salaries", category: "Expense", subcategory: "Fixed Expenses", department: "Client Management" },
        { name: "Business Development Staff", category: "Expense", subcategory: "Fixed Expenses", department: "Business Development" },
        { name: "Administrative Support Staff", category: "Expense", subcategory: "Fixed Expenses", department: "Operations" },
        { name: "Performance Bonuses", category: "Expense", subcategory: "Operating Expenses", department: "Operations" },
        { name: "Health Insurance & Benefits", category: "Expense", subcategory: "Fixed Expenses", department: "Operations" },
        { name: "Retirement Contributions", category: "Expense", subcategory: "Fixed Expenses", department: "Operations" },
        
        // Professional Development
        { name: "Training Courses & Certifications", category: "Expense", subcategory: "Discretionary", department: "Service Delivery" },
        { name: "Conference Attendance", category: "Expense", subcategory: "Discretionary", department: "Service Delivery" },
        { name: "Professional Memberships", category: "Expense", subcategory: "Fixed Expenses", department: "Service Delivery" },
        { name: "Online Learning Subscriptions", category: "Expense", subcategory: "Fixed Expenses", department: "Service Delivery" },
        { name: "Industry Publications", category: "Expense", subcategory: "Operating Expenses", department: "Service Delivery" },
        { name: "Team Building Activities", category: "Expense", subcategory: "Discretionary", department: "Operations" },
        
        // Technology & Tools
        { name: "Project Management Software", category: "Expense", subcategory: "Fixed Expenses", department: "Service Delivery" },
        { name: "CRM System", category: "Expense", subcategory: "Fixed Expenses", department: "Client Management" },
        { name: "Document Management Software", category: "Expense", subcategory: "Fixed Expenses", department: "Operations" },
        { name: "Video Conferencing Tools", category: "Expense", subcategory: "Fixed Expenses", department: "Operations" },
        { name: "Collaboration Tools", category: "Expense", subcategory: "Fixed Expenses", department: "Operations" },
        { name: "Cloud Storage Services", category: "Expense", subcategory: "Fixed Expenses", department: "Operations" },
        { name: "Cybersecurity Software", category: "Expense", subcategory: "Fixed Expenses", department: "Operations" },
        { name: "Industry-Specific Software", category: "Expense", subcategory: "Fixed Expenses", department: "Service Delivery" },
        { name: "IT Support & Maintenance", category: "Expense", subcategory: "Fixed Expenses", department: "Operations" },
        { name: "Website Hosting & Domain", category: "Expense", subcategory: "Fixed Expenses", department: "Business Development" },
        
        // Office & Facilities
        { name: "Office Rent", category: "Expense", subcategory: "Fixed Expenses", department: "Operations" },
        { name: "Co-working Space Fees", category: "Expense", subcategory: "Operating Expenses", department: "Operations" },
        { name: "Office Utilities", category: "Expense", subcategory: "Fixed Expenses", department: "Operations" },
        { name: "Internet & Phone", category: "Expense", subcategory: "Fixed Expenses", department: "Operations" },
        { name: "Office Supplies", category: "Expense", subcategory: "Operating Expenses", department: "Operations" },
        { name: "Printing & Copying", category: "Expense", subcategory: "Operating Expenses", department: "Operations" },
        { name: "Meeting Room Rentals", category: "Expense", subcategory: "Operating Expenses", department: "Operations" },
        { name: "Office Cleaning", category: "Expense", subcategory: "Fixed Expenses", department: "Operations" },
        { name: "Coffee & Refreshments", category: "Expense", subcategory: "Operating Expenses", department: "Operations" },
        
        // Client Acquisition & Marketing
        { name: "Digital Marketing", category: "Expense", subcategory: "Discretionary", department: "Business Development" },
        { name: "Content Marketing", category: "Expense", subcategory: "Discretionary", department: "Business Development" },
        { name: "LinkedIn Advertising", category: "Expense", subcategory: "Discretionary", department: "Business Development" },
        { name: "SEO & Website Optimization", category: "Expense", subcategory: "Discretionary", department: "Business Development" },
        { name: "Networking Events", category: "Expense", subcategory: "Operating Expenses", department: "Business Development" },
        { name: "Client Entertainment", category: "Expense", subcategory: "Operating Expenses", department: "Client Management" },
        { name: "Business Development Travel", category: "Expense", subcategory: "Operating Expenses", department: "Business Development" },
        { name: "Proposal Development Costs", category: "Expense", subcategory: "Operating Expenses", department: "Business Development" },
        { name: "Marketing Collateral", category: "Expense", subcategory: "Operating Expenses", department: "Business Development" },
        { name: "Case Study Production", category: "Expense", subcategory: "Operating Expenses", department: "Business Development" },
        
        // Project Delivery
        { name: "Client Travel & Accommodation", category: "Expense", subcategory: "Operating Expenses", department: "Service Delivery" },
        { name: "Project Materials & Resources", category: "Expense", subcategory: "Operating Expenses", department: "Service Delivery" },
        { name: "Subcontractor Fees", category: "Expense", subcategory: "Operating Expenses", department: "Service Delivery" },
        { name: "Research & Data Purchases", category: "Expense", subcategory: "Operating Expenses", department: "Service Delivery" },
        { name: "Client Gifts & Recognition", category: "Expense", subcategory: "Operating Expenses", department: "Client Management" },
        
        // Administrative
        { name: "Accounting Services", category: "Expense", subcategory: "Fixed Expenses", department: "Operations" },
        { name: "Legal Services", category: "Expense", subcategory: "Operating Expenses", department: "Operations" },
        { name: "Insurance - Professional Liability", category: "Expense", subcategory: "Fixed Expenses", department: "Operations" },
        { name: "Insurance - General Liability", category: "Expense", subcategory: "Fixed Expenses", department: "Operations" },
        { name: "Bank Fees & Charges", category: "Expense", subcategory: "Operating Expenses", department: "Operations" },
        { name: "Business Licenses & Permits", category: "Expense", subcategory: "Fixed Expenses", department: "Operations" },
        { name: "Payroll Processing Fees", category: "Expense", subcategory: "Operating Expenses", department: "Operations" },
        
        // Capital Expenditure
        { name: "Computer Equipment", category: "Expense", subcategory: "Capital Expenditure", department: "Operations" },
        { name: "Software Licenses - Perpetual", category: "Expense", subcategory: "Capital Expenditure", department: "Operations" },
        { name: "Office Furniture", category: "Expense", subcategory: "Capital Expenditure", department: "Operations" },
        { name: "Audio Visual Equipment", category: "Expense", subcategory: "Capital Expenditure", department: "Operations" },
        { name: "Office Setup - New Location", category: "Expense", subcategory: "Capital Expenditure", department: "Operations" },
        { name: "Company Vehicles", category: "Expense", subcategory: "Capital Expenditure", department: "Operations" },
      ],
    },
  },
  {
    template_name: "Construction Company Budget",
    industry_type: "construction",
    description: "Budget template for construction projects including labor, materials, equipment, and project management.",
    template_structure: {
      departments: [
        { name: "Project Management", code: "PM" },
        { name: "Labor & Subcontractors", code: "LABOR" },
        { name: "Materials Procurement", code: "MAT" },
        { name: "Equipment & Machinery", code: "EQUIP" },
        { name: "Safety & Compliance", code: "SAFE" },
      ],
      categories: {
        revenue: ["Project Contracts", "Service Fees", "Change Orders"],
        direct_costs: ["Labor Costs", "Materials", "Equipment Rental", "Subcontractor Fees"],
        operating_expenses: ["Site Supervision", "Safety Equipment", "Insurance", "Permits & Licenses"],
        capital_expenditure: ["Heavy Equipment Purchase", "Vehicles", "Tools & Machinery"],
      },
    },
  },
  {
    template_name: "Healthcare/Clinic Budget",
    industry_type: "healthcare",
    description: "Budget template for healthcare facilities including medical services, staffing, and facilities management.",
    template_structure: {
      departments: [
        { name: "Medical Services", code: "MED" },
        { name: "Nursing Staff", code: "NURSE" },
        { name: "Pharmacy", code: "PHARM" },
        { name: "Administration", code: "ADMIN" },
        { name: "Facilities", code: "FAC" },
      ],
      categories: {
        revenue: ["Patient Fees", "Insurance Reimbursements", "Pharmacy Sales", "Lab Services"],
        operating_expenses: ["Medical Staff Salaries", "Medical Supplies", "Pharmaceuticals", "Equipment Maintenance", "Facility Costs"],
        capital_expenditure: ["Medical Equipment", "Facility Upgrades", "IT Systems"],
      },
    },
  },
  {
    template_name: "Education/Training Budget",
    industry_type: "education",
    description: "Budget template for educational institutions covering programs, faculty, and facilities.",
    template_structure: {
      departments: [
        { name: "Academic Programs", code: "ACAD" },
        { name: "Instructors & Faculty", code: "FAC" },
        { name: "Student Services", code: "STUD" },
        { name: "Facilities Management", code: "FAC" },
      ],
      categories: {
        revenue: ["Tuition Fees", "Course Fees", "Grants & Donations", "Certifications"],
        operating_expenses: ["Faculty Salaries", "Course Materials", "Facility Rent", "IT Infrastructure", "Marketing"],
        capital_expenditure: ["Educational Equipment", "Technology Upgrades", "Facility Improvements"],
      },
    },
  },
  {
    template_name: "Hospitality/Restaurant Budget",
    industry_type: "hospitality",
    description: "Budget template for restaurants and hospitality businesses covering food, beverage, and operations.",
    template_structure: {
      departments: [
        { name: "Food & Beverage", code: "FB" },
        { name: "Kitchen Operations", code: "KITCHEN" },
        { name: "Front of House", code: "FOH" },
        { name: "Events & Catering", code: "EVENT" },
      ],
      categories: {
        revenue: ["Food Sales", "Beverage Sales", "Catering Revenue", "Event Bookings"],
        cost_of_goods: ["Food Purchases", "Beverage Purchases", "Kitchen Supplies"],
        operating_expenses: ["Staff Wages", "Rent & Utilities", "Marketing", "Equipment Maintenance"],
        capital_expenditure: ["Kitchen Equipment", "Furniture & Fixtures", "Renovations"],
      },
    },
  },
  {
    template_name: "Real Estate Budget",
    industry_type: "real_estate",
    description: "Budget template for real estate operations including property management, sales, and maintenance.",
    template_structure: {
      departments: [
        { name: "Property Management", code: "PM" },
        { name: "Sales & Leasing", code: "SALES" },
        { name: "Maintenance & Repairs", code: "MAINT" },
        { name: "Marketing", code: "MKTG" },
      ],
      categories: {
        revenue: ["Rental Income", "Sales Commissions", "Property Management Fees", "Leasing Fees"],
        operating_expenses: ["Property Maintenance", "Marketing & Advertising", "Staff Salaries", "Insurance", "Utilities"],
        capital_expenditure: ["Property Acquisitions", "Major Renovations", "Technology Systems"],
      },
    },
  },
  {
    template_name: "IT/Software Company Budget",
    industry_type: "technology",
    description: "Budget template for IT and software companies covering development, infrastructure, and support.",
    template_structure: {
      departments: [
        { name: "Development", code: "DEV" },
        { name: "Infrastructure", code: "INFRA" },
        { name: "Sales & Marketing", code: "SALES" },
        { name: "Customer Support", code: "SUPP" },
      ],
      categories: {
        revenue: ["Software Licenses", "Subscription Revenue", "Consulting Fees", "Support Contracts"],
        operating_expenses: ["Developer Salaries", "Cloud Infrastructure", "Software Tools", "Marketing", "Customer Support"],
        capital_expenditure: ["Servers & Hardware", "Development Tools", "Office Equipment"],
      },
    },
  },
  {
    template_name: "Agriculture/Farming Budget",
    industry_type: "agriculture",
    description: "Budget template for agricultural operations including crop production, livestock, and equipment.",
    template_structure: {
      departments: [
        { name: "Crop Production", code: "CROP" },
        { name: "Livestock Management", code: "LIVE" },
        { name: "Equipment & Machinery", code: "EQUIP" },
        { name: "Labor & Harvesting", code: "LABOR" },
      ],
      categories: {
        revenue: ["Crop Sales", "Livestock Sales", "Government Subsidies"],
        operating_expenses: ["Seeds & Fertilizers", "Feed & Veterinary", "Labor Costs", "Equipment Fuel", "Irrigation"],
        capital_expenditure: ["Farm Equipment", "Land Improvements", "Storage Facilities"],
      },
    },
  },
  {
    template_name: "General Business Budget",
    industry_type: "general",
    description: "Comprehensive template covering all common budget categories for any business type.",
    template_structure: {
      departments: [
        { name: "Operations", code: "OPS" },
        { name: "Sales & Marketing", code: "SALES" },
        { name: "Finance & Administration", code: "FIN" },
        { name: "Human Resources", code: "HR" },
      ],
      categories: {
        revenue: ["Product Sales", "Service Revenue", "Other Income"],
        operating_expenses: ["Salaries & Wages", "Rent & Utilities", "Marketing & Advertising", "Office Expenses", "Professional Services"],
        capital_expenditure: ["Equipment Purchases", "Technology Investments", "Facility Improvements"],
      },
    },
  },
];

export const seedBudgetTemplates = async () => {
  try {
    const { data, error } = await supabase
      .from("budget_templates")
      .insert(
        BUDGET_TEMPLATES.map(template => ({
          ...template,
          is_system_template: true,
          is_active: true,
        }))
      )
      .select();

    if (error) throw error;

    console.log(`Successfully seeded ${data.length} budget templates`);
    return data;
  } catch (error: any) {
    console.error("Error seeding budget templates:", error);
    throw error;
  }
};
