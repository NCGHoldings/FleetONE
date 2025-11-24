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
