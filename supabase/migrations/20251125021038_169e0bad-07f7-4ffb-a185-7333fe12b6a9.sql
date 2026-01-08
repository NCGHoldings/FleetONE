-- Seed Budget Templates with comprehensive industry-specific structures

-- Insert Transport & Bus Company Template (Primary)
INSERT INTO budget_templates (
  template_name,
  industry_type,
  description,
  is_system_template,
  is_active,
  template_structure
) VALUES (
  'Transport & Bus Company Budget',
  'transportation',
  'Comprehensive budget template for bus transport operations including fleet, maintenance, fuel, and staff management.',
  true,
  true,
  '{
    "departments": [
      {
        "name": "Fleet Operations",
        "code": "FLEET",
        "categories": [
          {"name": "Daily Trip Income", "type": "revenue", "subcategory": "Operations"},
          {"name": "Special Hire Revenue", "type": "revenue", "subcategory": "Operations"},
          {"name": "School Bus Service", "type": "revenue", "subcategory": "Operations"},
          {"name": "Charter Services", "type": "revenue", "subcategory": "Operations"}
        ]
      },
      {
        "name": "Fuel Management",
        "code": "FUEL",
        "categories": [
          {"name": "Diesel Purchases", "type": "expense", "subcategory": "Fuel"},
          {"name": "Fuel Cards", "type": "expense", "subcategory": "Fuel"},
          {"name": "Fuel Efficiency Monitoring", "type": "expense", "subcategory": "Fuel"}
        ]
      },
      {
        "name": "Staff & Payroll",
        "code": "STAFF",
        "categories": [
          {"name": "Driver Salaries", "type": "expense", "subcategory": "Payroll"},
          {"name": "Conductor Salaries", "type": "expense", "subcategory": "Payroll"},
          {"name": "Mechanic Wages", "type": "expense", "subcategory": "Payroll"},
          {"name": "Staff Benefits", "type": "expense", "subcategory": "Payroll"}
        ]
      },
      {
        "name": "Maintenance & Repairs",
        "code": "MAINT",
        "categories": [
          {"name": "Preventive Maintenance", "type": "expense", "subcategory": "Maintenance"},
          {"name": "Emergency Repairs", "type": "expense", "subcategory": "Maintenance"},
          {"name": "Tyre & Tube Purchases", "type": "expense", "subcategory": "Maintenance"},
          {"name": "Spare Parts", "type": "expense", "subcategory": "Maintenance"},
          {"name": "Body Wash & Cleaning", "type": "expense", "subcategory": "Maintenance"},
          {"name": "Engine Overhauls", "type": "expense", "subcategory": "Maintenance"}
        ]
      },
      {
        "name": "Compliance & Permits",
        "code": "COMP",
        "categories": [
          {"name": "Vehicle Insurance", "type": "expense", "subcategory": "Compliance"},
          {"name": "Route Permits", "type": "expense", "subcategory": "Compliance"},
          {"name": "Vehicle Tax", "type": "expense", "subcategory": "Compliance"},
          {"name": "Emission Testing", "type": "expense", "subcategory": "Compliance"}
        ]
      },
      {
        "name": "Administration",
        "code": "ADMIN",
        "categories": [
          {"name": "Office Rent & Utilities", "type": "expense", "subcategory": "Administrative"},
          {"name": "Office Supplies", "type": "expense", "subcategory": "Administrative"},
          {"name": "IT & Software", "type": "expense", "subcategory": "Administrative"},
          {"name": "Legal & Professional Fees", "type": "expense", "subcategory": "Administrative"},
          {"name": "Marketing", "type": "expense", "subcategory": "Administrative"}
        ]
      }
    ]
  }'::jsonb
);

-- Insert General Business Template
INSERT INTO budget_templates (
  template_name,
  industry_type,
  description,
  is_system_template,
  is_active,
  template_structure
) VALUES (
  'General Business Budget',
  'general',
  'Comprehensive template covering all common budget categories for any business type.',
  true,
  true,
  '{
    "departments": [
      {
        "name": "Revenue",
        "code": "REV",
        "categories": [
          {"name": "Product Sales", "type": "revenue", "subcategory": "Sales"},
          {"name": "Service Revenue", "type": "revenue", "subcategory": "Sales"},
          {"name": "Other Income", "type": "revenue", "subcategory": "Other"}
        ]
      },
      {
        "name": "Operating Expenses",
        "code": "OPEX",
        "categories": [
          {"name": "Salaries & Wages", "type": "expense", "subcategory": "Personnel"},
          {"name": "Rent & Utilities", "type": "expense", "subcategory": "Facilities"},
          {"name": "Marketing & Advertising", "type": "expense", "subcategory": "Marketing"},
          {"name": "Office Expenses", "type": "expense", "subcategory": "Administrative"}
        ]
      },
      {
        "name": "Capital Expenditure",
        "code": "CAPEX",
        "categories": [
          {"name": "Equipment Purchases", "type": "expense", "subcategory": "Capital"},
          {"name": "Technology Investments", "type": "expense", "subcategory": "Capital"}
        ]
      }
    ]
  }'::jsonb
);

-- Insert Manufacturing Template
INSERT INTO budget_templates (
  template_name,
  industry_type,
  description,
  is_system_template,
  is_active,
  template_structure
) VALUES (
  'Manufacturing Budget',
  'manufacturing',
  'Complete budget template for manufacturing operations including production, procurement, and quality control.',
  true,
  true,
  '{
    "departments": [
      {
        "name": "Production",
        "code": "PROD",
        "categories": [
          {"name": "Product Sales", "type": "revenue", "subcategory": "Sales"},
          {"name": "Raw Materials", "type": "expense", "subcategory": "Direct Costs"},
          {"name": "Direct Labor", "type": "expense", "subcategory": "Direct Costs"},
          {"name": "Factory Overhead", "type": "expense", "subcategory": "Direct Costs"}
        ]
      },
      {
        "name": "Quality Control",
        "code": "QC",
        "categories": [
          {"name": "Quality Testing", "type": "expense", "subcategory": "Operations"},
          {"name": "Equipment Maintenance", "type": "expense", "subcategory": "Operations"}
        ]
      },
      {
        "name": "Procurement",
        "code": "PROC",
        "categories": [
          {"name": "Supplier Payments", "type": "expense", "subcategory": "Procurement"},
          {"name": "Shipping & Logistics", "type": "expense", "subcategory": "Procurement"}
        ]
      }
    ]
  }'::jsonb
);

-- Insert Retail Template
INSERT INTO budget_templates (
  template_name,
  industry_type,
  description,
  is_system_template,
  is_active,
  template_structure
) VALUES (
  'Retail Business Budget',
  'retail',
  'Budget template for retail operations covering sales, inventory, and store management.',
  true,
  true,
  '{
    "departments": [
      {
        "name": "Sales",
        "code": "SALES",
        "categories": [
          {"name": "Product Sales", "type": "revenue", "subcategory": "Sales"},
          {"name": "Online Sales", "type": "revenue", "subcategory": "Sales"}
        ]
      },
      {
        "name": "Inventory Management",
        "code": "INV",
        "categories": [
          {"name": "Inventory Purchases", "type": "expense", "subcategory": "Cost of Goods"},
          {"name": "Supplier Payments", "type": "expense", "subcategory": "Cost of Goods"}
        ]
      },
      {
        "name": "Store Operations",
        "code": "STORE",
        "categories": [
          {"name": "Store Rent", "type": "expense", "subcategory": "Operations"},
          {"name": "Staff Salaries", "type": "expense", "subcategory": "Operations"},
          {"name": "Marketing & Promotions", "type": "expense", "subcategory": "Marketing"}
        ]
      }
    ]
  }'::jsonb
);

-- Insert Service Company Template
INSERT INTO budget_templates (
  template_name,
  industry_type,
  description,
  is_system_template,
  is_active,
  template_structure
) VALUES (
  'Service Company Budget',
  'services',
  'Budget template for service-based businesses including consulting, professional services, and client management.',
  true,
  true,
  '{
    "departments": [
      {
        "name": "Service Delivery",
        "code": "SERV",
        "categories": [
          {"name": "Professional Fees", "type": "revenue", "subcategory": "Revenue"},
          {"name": "Consulting Revenue", "type": "revenue", "subcategory": "Revenue"},
          {"name": "Service Personnel Costs", "type": "expense", "subcategory": "Operations"}
        ]
      },
      {
        "name": "Client Management",
        "code": "CLIENT",
        "categories": [
          {"name": "Client Acquisition", "type": "expense", "subcategory": "Marketing"},
          {"name": "Technology & Tools", "type": "expense", "subcategory": "Operations"}
        ]
      }
    ]
  }'::jsonb
);