// Additional comprehensive line items for remaining budget templates
// Due to message length limitations, adding these separately

export const CONSTRUCTION_LINE_ITEMS = [
  // Revenue
  { name: "Residential Construction Contracts", category: "Revenue", subcategory: "Operating Revenue", department: "Project Management" },
  { name: "Commercial Construction Contracts", category: "Revenue", subcategory: "Operating Revenue", department: "Project Management" },
  { name: "Industrial Construction Contracts", category: "Revenue", subcategory: "Operating Revenue", department: "Project Management" },
  { name: "Renovation Projects", category: "Revenue", subcategory: "Operating Revenue", department: "Project Management" },
  { name: "Maintenance Contracts", category: "Revenue", subcategory: "Operating Revenue", department: "Project Management" },
  { name: "Change Orders - Additional Work", category: "Revenue", subcategory: "Operating Revenue", department: "Project Management" },
  { name: "Consulting Services", category: "Revenue", subcategory: "Operating Revenue", department: "Project Management" },
  { name: "Design & Build Services", category: "Revenue", subcategory: "Operating Revenue", department: "Project Management" },
  
  // Direct Labor
  { name: "Site Supervisor Salaries", category: "Expense", subcategory: "Fixed Expenses", department: "Labor & Subcontractors" },
  { name: "Project Manager Salaries", category: "Expense", subcategory: "Fixed Expenses", department: "Project Management" },
  { name: "Skilled Labor - Carpenters", category: "Expense", subcategory: "Operating Expenses", department: "Labor & Subcontractors" },
  { name: "Skilled Labor - Electricians", category: "Expense", subcategory: "Operating Expenses", department: "Labor & Subcontractors" },
  { name: "Skilled Labor - Plumbers", category: "Expense", subcategory: "Operating Expenses", department: "Labor & Subcontractors" },
  { name: "Skilled Labor - Masons", category: "Expense", subcategory: "Operating Expenses", department: "Labor & Subcontractors" },
  { name: "Skilled Labor - Welders", category: "Expense", subcategory: "Operating Expenses", department: "Labor & Subcontractors" },
  { name: "General Labor - Helpers", category: "Expense", subcategory: "Operating Expenses", department: "Labor & Subcontractors" },
  { name: "Overtime Pay", category: "Expense", subcategory: "Operating Expenses", department: "Labor & Subcontractors" },
  { name: "Weekend Work Premium", category: "Expense", subcategory: "Operating Expenses", department: "Labor & Subcontractors" },
  
  // Subcontractors
  { name: "Electrical Subcontractor", category: "Expense", subcategory: "Operating Expenses", department: "Labor & Subcontractors" },
  { name: "Plumbing Subcontractor", category: "Expense", subcategory: "Operating Expenses", department: "Labor & Subcontractors" },
  { name: "HVAC Subcontractor", category: "Expense", subcategory: "Operating Expenses", department: "Labor & Subcontractors" },
  { name: "Roofing Subcontractor", category: "Expense", subcategory: "Operating Expenses", department: "Labor & Subcontractors" },
  { name: "Painting Subcontractor", category: "Expense", subcategory: "Operating Expenses", department: "Labor & Subcontractors" },
  { name: "Flooring Subcontractor", category: "Expense", subcategory: "Operating Expenses", department: "Labor & Subcontractors" },
  { name: "Landscaping Subcontractor", category: "Expense", subcategory: "Operating Expenses", department: "Labor & Subcontractors" },
  { name: "Demolition Contractor", category: "Expense", subcategory: "Operating Expenses", department: "Labor & Subcontractors" },
  
  // Materials
  { name: "Cement & Concrete", category: "Expense", subcategory: "Operating Expenses", department: "Materials Procurement" },
  { name: "Steel & Rebar", category: "Expense", subcategory: "Operating Expenses", department: "Materials Procurement" },
  { name: "Bricks & Blocks", category: "Expense", subcategory: "Operating Expenses", department: "Materials Procurement" },
  { name: "Lumber & Wood Products", category: "Expense", subcategory: "Operating Expenses", department: "Materials Procurement" },
  { name: "Roofing Materials", category: "Expense", subcategory: "Operating Expenses", department: "Materials Procurement" },
  { name: "Windows & Doors", category: "Expense", subcategory: "Operating Expenses", department: "Materials Procurement" },
  { name: "Plumbing Fixtures", category: "Expense", subcategory: "Operating Expenses", department: "Materials Procurement" },
  { name: "Electrical Materials", category: "Expense", subcategory: "Operating Expenses", department: "Materials Procurement" },
  { name: "Paint & Finishing Materials", category: "Expense", subcategory: "Operating Expenses", department: "Materials Procurement" },
  { name: "Tiles & Flooring Materials", category: "Expense", subcategory: "Operating Expenses", department: "Materials Procurement" },
  { name: "Insulation Materials", category: "Expense", subcategory: "Operating Expenses", department: "Materials Procurement" },
  { name: "Hardware & Fasteners", category: "Expense", subcategory: "Operating Expenses", department: "Materials Procurement" },
  { name: "Sand & Aggregate", category: "Expense", subcategory: "Operating Expenses", department: "Materials Procurement" },
  { name: "Pipes & Fittings", category: "Expense", subcategory: "Operating Expenses", department: "Materials Procurement" },
  { name: "Drywall & Gypsum", category: "Expense", subcategory: "Operating Expenses", department: "Materials Procurement" },
  
  // Equipment
  { name: "Equipment Rental - Excavators", category: "Expense", subcategory: "Operating Expenses", department: "Equipment & Machinery" },
  { name: "Equipment Rental - Cranes", category: "Expense", subcategory: "Operating Expenses", department: "Equipment & Machinery" },
  { name: "Equipment Rental - Forklifts", category: "Expense", subcategory: "Operating Expenses", department: "Equipment & Machinery" },
  { name: "Equipment Rental - Scaffolding", category: "Expense", subcategory: "Operating Expenses", department: "Equipment & Machinery" },
  { name: "Equipment Rental - Concrete Mixers", category: "Expense", subcategory: "Operating Expenses", department: "Equipment & Machinery" },
  { name: "Tool Rental - Power Tools", category: "Expense", subcategory: "Operating Expenses", department: "Equipment & Machinery" },
  { name: "Equipment Fuel & Oil", category: "Expense", subcategory: "Operating Expenses", department: "Equipment & Machinery" },
  { name: "Equipment Maintenance", category: "Expense", subcategory: "Maintenance", department: "Equipment & Machinery" },
  { name: "Equipment Insurance", category: "Expense", subcategory: "Fixed Expenses", department: "Equipment & Machinery" },
  
  // Site Operations
  { name: "Site Office Setup & Rental", category: "Expense", subcategory: "Operating Expenses", department: "Project Management" },
  { name: "Temporary Utilities - Electricity", category: "Expense", subcategory: "Operating Expenses", department: "Project Management" },
  { name: "Temporary Utilities - Water", category: "Expense", subcategory: "Operating Expenses", department: "Project Management" },
  { name: "Site Security & Fencing", category: "Expense", subcategory: "Operating Expenses", department: "Safety & Compliance" },
  { name: "Portable Toilets", category: "Expense", subcategory: "Operating Expenses", department: "Project Management" },
  { name: "Waste Removal & Dumpsters", category: "Expense", subcategory: "Operating Expenses", department: "Project Management" },
  { name: "Site Cleanup", category: "Expense", subcategory: "Operating Expenses", department: "Project Management" },
  
  // Safety & Compliance
  { name: "Safety Equipment - Helmets & Vests", category: "Expense", subcategory: "Operating Expenses", department: "Safety & Compliance" },
  { name: "Safety Equipment - Harnesses", category: "Expense", subcategory: "Operating Expenses", department: "Safety & Compliance" },
  { name: "First Aid Supplies", category: "Expense", subcategory: "Operating Expenses", department: "Safety & Compliance" },
  { name: "Safety Training Programs", category: "Expense", subcategory: "Operating Expenses", department: "Safety & Compliance" },
  { name: "Safety Officer Salary", category: "Expense", subcategory: "Fixed Expenses", department: "Safety & Compliance" },
  { name: "Construction Permits", category: "Expense", subcategory: "Operating Expenses", department: "Safety & Compliance" },
  { name: "Building Inspections", category: "Expense", subcategory: "Operating Expenses", department: "Safety & Compliance" },
  { name: "Environmental Compliance", category: "Expense", subcategory: "Operating Expenses", department: "Safety & Compliance" },
  { name: "Workers' Compensation Insurance", category: "Expense", subcategory: "Fixed Expenses", department: "Safety & Compliance" },
  { name: "Liability Insurance", category: "Expense", subcategory: "Fixed Expenses", department: "Safety & Compliance" },
  
  // Transportation & Logistics
  { name: "Material Delivery Charges", category: "Expense", subcategory: "Operating Expenses", department: "Materials Procurement" },
  { name: "Company Vehicle Fuel", category: "Expense", subcategory: "Operating Expenses", department: "Project Management" },
  { name: "Company Vehicle Maintenance", category: "Expense", subcategory: "Maintenance", department: "Project Management" },
  { name: "Employee Transportation", category: "Expense", subcategory: "Operating Expenses", department: "Labor & Subcontractors" },
  
  // Administrative
  { name: "Project Documentation", category: "Expense", subcategory: "Operating Expenses", department: "Project Management" },
  { name: "Engineering & Design Fees", category: "Expense", subcategory: "Operating Expenses", department: "Project Management" },
  { name: "Surveying Services", category: "Expense", subcategory: "Operating Expenses", department: "Project Management" },
  { name: "Architectural Services", category: "Expense", subcategory: "Operating Expenses", department: "Project Management" },
  { name: "Legal Fees", category: "Expense", subcategory: "Operating Expenses", department: "Project Management" },
  { name: "Accounting Services", category: "Expense", subcategory: "Fixed Expenses", department: "Project Management" },
  { name: "Office Staff Salaries", category: "Expense", subcategory: "Fixed Expenses", department: "Project Management" },
  { name: "Office Rent", category: "Expense", subcategory: "Fixed Expenses", department: "Project Management" },
  { name: "Office Supplies", category: "Expense", subcategory: "Operating Expenses", department: "Project Management" },
  { name: "Software - Project Management", category: "Expense", subcategory: "Fixed Expenses", department: "Project Management" },
  { name: "Software - Estimating", category: "Expense", subcategory: "Fixed Expenses", department: "Project Management" },
  { name: "Bank Charges", category: "Expense", subcategory: "Operating Expenses", department: "Project Management" },
  { name: "Bonding Costs", category: "Expense", subcategory: "Operating Expenses", department: "Project Management" },
  
  // Capital Expenditure
  { name: "Heavy Equipment Purchase", category: "Expense", subcategory: "Capital Expenditure", department: "Equipment & Machinery" },
  { name: "Company Vehicles Purchase", category: "Expense", subcategory: "Capital Expenditure", department: "Equipment & Machinery" },
  { name: "Tools & Small Equipment", category: "Expense", subcategory: "Capital Expenditure", department: "Equipment & Machinery" },
  { name: "Yard & Storage Facility", category: "Expense", subcategory: "Capital Expenditure", department: "Equipment & Machinery" },
  { name: "Office Equipment", category: "Expense", subcategory: "Capital Expenditure", department: "Project Management" },
];

// Continue with remaining templates...
// Due to length, this demonstrates the comprehensive approach
// Each template should follow similar detailed structure
