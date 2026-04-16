/**
 * Account Code Mappings for Revenue and Expenses
 * Used for financial reporting and export functionality
 */

export interface AccountCodeMapping {
  code: string;
  name: string;
  fieldName: string;
}

// Revenue Account Codes (41xxx)
export const REVENUE_ACCOUNT_CODES: Record<string, AccountCodeMapping> = {
  bus_collection: {
    code: '41101003',
    name: 'BUS COLLECTION',
    fieldName: 'bus_collection'
  },
  call_booking: {
    code: '41101001',
    name: 'CALL BOOKING',
    fieldName: 'call_booking'
  },
  agent_booking: {
    code: '41101002',
    name: 'AGENT BOOKING',
    fieldName: 'agent_booking'
  },
  luggage_income: {
    code: '41101004',
    name: 'LUGGAGE INCOME',
    fieldName: 'luggage_income'
  },
  miscellaneous_income: {
    code: '41106002',
    name: 'MISCELLANEOUS INCOME',
    fieldName: 'miscellaneous_income'
  },
  others: {
    code: '41106002',
    name: 'MISCELLANEOUS INCOME',
    fieldName: 'others'
  }
};

// Expense Account Codes (51201xxx)
export const EXPENSE_ACCOUNT_CODES: Record<string, AccountCodeMapping> = {
  fuel: {
    code: '51201001',
    name: 'FUEL EXPENSES',
    fieldName: 'fuel'
  },
  repair: {
    code: '51201002',
    name: 'BUS MAINTENANCE & REPAIR',
    fieldName: 'repair'
  },
  tyre_tube: {
    code: '51201003',
    name: 'TYRE & TUBE EXPENSES',
    fieldName: 'tyre_tube'
  },
  salary: {
    code: '51201004',
    name: 'WAGES - DRIVERS & ASSISTA',
    fieldName: 'salary'
  },
  police: {
    code: '51201005',
    name: 'FINES AND PENALTIES',
    fieldName: 'police'
  },
  food: {
    code: '51201006',
    name: 'STAFF MEALS & WELFARE',
    fieldName: 'food'
  },
  emission_fitness: {
    code: '51201007',
    name: 'EMISSION REPORTS/ FITNESS',
    fieldName: 'emission_fitness'
  },
  permits_renewal: {
    code: '51201008',
    name: 'PERMITS RENEWAL CHARGES',
    fieldName: 'permits_renewal'
  },
  staff_accommodation: {
    code: '51201013',
    name: 'STAFF ACCOMMODATION',
    fieldName: 'staff_accommodation'
  },
  highway_charges: {
    code: '51201014',
    name: 'HIGHWAY CHARGES',
    fieldName: 'highway_charges'
  },
  accident_compensation: {
    code: '51201016',
    name: 'ACCIDENT COMPENSATION',
    fieldName: 'accident_compensation'
  },
  parking: {
    code: '51201017',
    name: 'PARKING FEE',
    fieldName: 'parking'
  },
  log_sheet: {
    code: '51201018',
    name: 'LOG SHEET CHARGES',
    fieldName: 'log_sheet'
  },
  vehicle_hire: {
    code: '51201019',
    name: 'VEHICLE HIRE CHARGES',
    fieldName: 'vehicle_hire'
  },
  ntc: {
    code: '51201020',
    name: 'NTC',
    fieldName: 'ntc'
  },
  runner: {
    code: '51201021',
    name: 'RUNNER',
    fieldName: 'runner'
  },
  short_misc: {
    code: '51201022',
    name: 'SHORT - MISCELLANIOUS',
    fieldName: 'short_misc'
  },
  temporary_permit: {
    code: '51201024',
    name: 'TEMPORY PERMIT',
    fieldName: 'temporary_permit'
  },
  body_wash: {
    code: '51201025',
    name: 'BODY WASH AND SERVICE',
    fieldName: 'body_wash'
  },
  legal_court: {
    code: '51201026',
    name: 'LEGAL & COURT FEE',
    fieldName: 'legal_court'
  },
  other: {
    code: '51201022',
    name: 'SHORT - MISCELLANIOUS',
    fieldName: 'other'
  }
};

/**
 * Get account code mapping by field name
 */
export function getRevenueAccountCode(fieldName: string): AccountCodeMapping | null {
  return REVENUE_ACCOUNT_CODES[fieldName] || null;
}

/**
 * Get expense account code mapping by field name
 */
export function getExpenseAccountCode(fieldName: string): AccountCodeMapping | null {
  return EXPENSE_ACCOUNT_CODES[fieldName] || null;
}

/**
 * Get all revenue account codes as array
 */
export function getAllRevenueAccountCodes(): AccountCodeMapping[] {
  return Object.values(REVENUE_ACCOUNT_CODES);
}

/**
 * Get all expense account codes as array
 */
export function getAllExpenseAccountCodes(): AccountCodeMapping[] {
  return Object.values(EXPENSE_ACCOUNT_CODES);
}

/**
 * Format amount for export (2 decimal places)
 */
export function formatExportAmount(amount: number | null | undefined): string {
  if (!amount || amount === 0) return '';
  return amount.toFixed(2);
}
