import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { BusDailySummary } from '@/hooks/useDailyBusGroupedTrips';

interface GLRow {
  glCode: string;
  glName: string;
  debit: string;
  credit: string;
  ref1: string;
  sbu: string;
  route: string;
  bus: string;
}

interface GLExportOptions {
  busSummaries: BusDailySummary[];
  date: Date;
  exportMode: 'all' | 'filled';
}

// Revenue GL codes
const REVENUE_GL_CODES = {
  call_booking: { code: '41101001', name: 'CALL BOOKING' },
  agent_booking: { code: '41101002', name: 'AGENT BOOKING' },
  bus_collection: { code: '41101003', name: 'BUS COLLECTION' },
  luggage_income: { code: '41101004', name: 'LUGGAGE INCOME' },
  special_income: { code: '41106002', name: 'MISCELLANEOUS INCOME' },
};

// Expense GL codes
const EXPENSE_GL_CODES = {
  fuel_cost: { code: '51201001', name: 'FUEL EXPENSES' },
  repair: { code: '51201002', name: 'BUS MAINTENANCE & REPAIR' },
  tyre_tube: { code: '51201003', name: 'TYRE & TUBE EXPENSES' },
  salary: { code: '51201004', name: 'WAGES - DRIVERS & ASSISTA' },
  police: { code: '51201005', name: 'FINES AND PENALTIES' },
  food: { code: '51201006', name: 'STAFF MEALS & WELFARE' },
  emission_fitness: { code: '51201007', name: 'EMISSION REPORTS/ FITNESS' },
  permits_renewal: { code: '51201008', name: 'PERMITS RENEWAL CHARGES' },
  staff_accommodation: { code: '51201013', name: 'STAFF ACCOMMODATION' },
  highway_charges: { code: '51201014', name: 'HIGHWAY CHARGES' },
  accident_compensation: { code: '51201016', name: 'ACCIDENT COMPENSATION' },
  parking: { code: '51201017', name: 'PARKING FEE' },
  log_sheet: { code: '51201018', name: 'LOG SHEET CHARGES' },
  vehicle_hire: { code: '51201019', name: 'VEHICLE HIRE CHARGES' },
  ntc: { code: '51201020', name: 'NTC' },
  runner: { code: '51201021', name: 'RUNNER' },
  short_misc: { code: '51201022', name: 'SHORT - MISCELLANIOUS' },
  temporary_permit: { code: '51201024', name: 'TEMPORY PERMIT' },
  body_wash: { code: '51201025', name: 'BODY WASH AND SERVICE' },
  legal_court: { code: '51201026', name: 'LEGAL & COURT FEE' },
};

function formatRefColumn(date: Date, busNo: string): string {
  return `${format(date, 'dd/MM/yyyy')} Collection ${busNo}`;
}

function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

function aggregateIncomeByBus(busSummary: BusDailySummary): Record<string, number> {
  const aggregated: Record<string, number> = {
    bus_collection: 0,
    call_booking: 0,
    agent_booking: 0,
    luggage_income: 0,
    special_income: 0,
  };

  busSummary.trips.forEach(trip => {
    if (trip.income_details) {
      const incomeDetails = typeof trip.income_details === 'string' 
        ? JSON.parse(trip.income_details) 
        : trip.income_details;
      
      Object.keys(aggregated).forEach(key => {
        aggregated[key] += Number(incomeDetails[key] || 0);
      });
    }
  });

  return aggregated;
}

export function generateGLRows(options: GLExportOptions): GLRow[] {
  const { busSummaries, date, exportMode } = options;
  const rows: GLRow[] = [];

  busSummaries.forEach(busSummary => {
    const busNo = busSummary.bus_no;
    const route = busSummary.trips[0]?.route_id || '-';
    const ref1 = formatRefColumn(date, busNo);
    const sbu = 'PBS';

    // Aggregate revenue
    const revenueData = aggregateIncomeByBus(busSummary);

    // Add revenue rows (Credit column)
    Object.entries(REVENUE_GL_CODES).forEach(([key, glInfo]) => {
      const amount = revenueData[key] || 0;
      
      if (exportMode === 'filled' && amount === 0) return;

      rows.push({
        glCode: glInfo.code,
        glName: glInfo.name,
        debit: '-',
        credit: amount > 0 ? formatAmount(amount) : '-',
        ref1,
        sbu,
        route: String(route),
        bus: busNo,
      });
    });

    // Add expense rows (Debit column)
    const expenses = busSummary.daily_expenses;
    
    Object.entries(EXPENSE_GL_CODES).forEach(([key, glInfo]) => {
      const rawAmount = expenses?.[key as keyof typeof expenses] || 0;
      const amount = Number(rawAmount);
      
      if (exportMode === 'filled' && amount === 0) return;

      rows.push({
        glCode: glInfo.code,
        glName: glInfo.name,
        debit: amount > 0 ? formatAmount(amount) : '-',
        credit: '-',
        ref1,
        sbu,
        route: String(route),
        bus: busNo,
      });
    });
  });

  return rows;
}

export function exportToExcel(rows: GLRow[], date: Date): void {
  const worksheetData = [
    ['G/L Acct/BP Code', 'G/L Acct/BP Name', 'Debit', 'Credit', 'Ref. 1', 'SBU', 'Route', 'Bus'],
    ...rows.map(row => [
      row.glCode,
      row.glName,
      row.debit,
      row.credit,
      row.ref1,
      row.sbu,
      row.route,
      row.bus,
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 15 }, // GL Code
    { wch: 30 }, // GL Name
    { wch: 12 }, // Debit
    { wch: 12 }, // Credit
    { wch: 35 }, // Ref. 1
    { wch: 8 },  // SBU
    { wch: 15 }, // Route
    { wch: 12 }, // Bus
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'GL Export');

  const fileName = `GL_Export_${format(date, 'yyyy-MM-dd')}_${Date.now()}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export function calculateGLSummary(rows: GLRow[]): {
  totalRevenue: number;
  totalExpenses: number;
  busCount: number;
  entryCount: number;
} {
  const buses = new Set<string>();
  let totalRevenue = 0;
  let totalExpenses = 0;

  rows.forEach(row => {
    buses.add(row.bus);
    
    if (row.credit !== '-') {
      totalRevenue += parseFloat(row.credit);
    }
    
    if (row.debit !== '-') {
      totalExpenses += parseFloat(row.debit);
    }
  });

  return {
    totalRevenue,
    totalExpenses,
    busCount: buses.size,
    entryCount: rows.length,
  };
}
