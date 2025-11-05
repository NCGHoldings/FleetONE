// Database expense categories (21 fields) matching daily_bus_expenses schema
export const DB_EXPENSE_CATEGORIES = [
  { key: 'fuel_cost', label: 'Diesel (ඩීසල්)' },
  { key: 'salary', label: 'Salary (වැටුප්)' },
  { key: 'food', label: 'Food (කෑම)' },
  { key: 'parking', label: 'Parking (යාත්රා)' },
  { key: 'body_wash', label: 'Body Wash (විදවණ)' },
  { key: 'police', label: 'Police (පොලීසිය)' },
  { key: 'repair', label: 'Repair (අළුත්වැඩියා)' },
  { key: 'tyre_tube', label: 'Tyre/Tube (ටයර්)' },
  { key: 'emission_fitness', label: 'Emission/Fitness' },
  { key: 'permits_renewal', label: 'Permits Renewal' },
  { key: 'staff_accommodation', label: 'Staff Accommodation' },
  { key: 'highway_charges', label: 'Highway Charges' },
  { key: 'accident_compensation', label: 'Accident Compensation' },
  { key: 'log_sheet', label: 'Log Sheet' },
  { key: 'vehicle_hire', label: 'Vehicle Hire' },
  { key: 'ntc', label: 'NTC' },
  { key: 'runner', label: 'Runner' },
  { key: 'short_misc', label: 'Short/Misc' },
  { key: 'temporary_permit', label: 'Temporary Permit' },
  { key: 'legal_court', label: 'Legal/Court' },
  { key: 'other', label: 'Other' },
] as const;

// Known OCR expense field keys that we explicitly map
export const KNOWN_OCR_EXPENSE_KEYS = [
  'fuel_cost',
  'driver_salary',
  'conductor_salary',
  'food',
  'parking',
  'body_wash',
  'police',
  'repair',
  'grease',
  'highway_toll',
  'phone',
  'oil',
  'tyre_tube',
  'labour',
  'spare_parts',
  'permit',
  'insurance',
  'other'
];

export interface OCRExpenseFields {
  fuel_cost?: number;
  driver_salary?: number;
  conductor_salary?: number;
  food?: number;
  parking?: number;
  body_wash?: number;
  police?: number;
  repair?: number;
  grease?: number;
  highway_toll?: number;
  phone?: number;
  oil?: number;
  tyre_tube?: number;
  labour?: number;
  spare_parts?: number;
  permit?: number;
  insurance?: number;
  other?: number;
  [key: string]: number | undefined;
}

export interface DBExpenseFields {
  fuel_cost: number;
  salary: number; // Combined driver + conductor
  food: number;
  parking: number;
  body_wash: number;
  police: number;
  repair: number;
  tyre_tube: number;
  emission_fitness: number;
  permits_renewal: number;
  staff_accommodation: number;
  highway_charges: number;
  accident_compensation: number;
  log_sheet: number;
  vehicle_hire: number;
  ntc: number;
  runner: number;
  short_misc: number;
  temporary_permit: number;
  legal_court: number;
  other: number;
}

// Helper to create empty DB expense object (all zeros)
export function emptyDBExpenseObject(): DBExpenseFields {
  return {
    fuel_cost: 0,
    salary: 0,
    food: 0,
    parking: 0,
    body_wash: 0,
    police: 0,
    repair: 0,
    tyre_tube: 0,
    emission_fitness: 0,
    permits_renewal: 0,
    staff_accommodation: 0,
    highway_charges: 0,
    accident_compensation: 0,
    log_sheet: 0,
    vehicle_hire: 0,
    ntc: 0,
    runner: 0,
    short_misc: 0,
    temporary_permit: 0,
    legal_court: 0,
    other: 0,
  };
}

export function mapOCRExpensesToDB(ocrExpenses: OCRExpenseFields): DBExpenseFields {
  // Calculate sum of any unknown/unmapped fields to add to 'other'
  const unknownSum = Object.entries(ocrExpenses)
    .filter(([key]) => !KNOWN_OCR_EXPENSE_KEYS.includes(key))
    .reduce((sum, [, value]) => sum + (value || 0), 0);
  
  console.log('🔍 Unknown OCR expense fields sum:', unknownSum);
  
  return {
    // Direct mappings
    fuel_cost: ocrExpenses.fuel_cost || 0,
    food: ocrExpenses.food || 0,
    parking: ocrExpenses.parking || 0,
    body_wash: ocrExpenses.body_wash || 0,
    police: ocrExpenses.police || 0,
    
    // CRITICAL: Combine driver_salary + conductor_salary into salary
    salary: (ocrExpenses.driver_salary || 0) + (ocrExpenses.conductor_salary || 0),
    
    // Combine repair + grease into repair field
    repair: (ocrExpenses.repair || 0) + (ocrExpenses.grease || 0),
    
    // Field name mappings
    highway_charges: ocrExpenses.highway_toll || 0,
    short_misc: ocrExpenses.phone || 0,
    tyre_tube: ocrExpenses.tyre_tube || 0,
    
    // Fields not typically extracted by OCR (default to 0)
    emission_fitness: 0,
    permits_renewal: ocrExpenses.permit || 0,
    staff_accommodation: 0,
    accident_compensation: 0,
    log_sheet: 0,
    vehicle_hire: 0,
    ntc: 0,
    runner: 0,
    temporary_permit: 0,
    legal_court: 0,
    
    // Other expenses + any unmapped fields
    other: (ocrExpenses.other || 0) + unknownSum,
  };
}
