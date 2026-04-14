import XLSX from 'xlsx-js-style';
import { format } from 'date-fns';

const headerStyle = {
  font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
  fill: { fgColor: { rgb: '1a56db' } },
  alignment: { horizontal: 'center' as const },
  border: {
    top: { style: 'thin' as const, color: { rgb: '000000' } },
    bottom: { style: 'thin' as const, color: { rgb: '000000' } },
    left: { style: 'thin' as const, color: { rgb: '000000' } },
    right: { style: 'thin' as const, color: { rgb: '000000' } },
  },
};

const cellStyle = {
  border: {
    top: { style: 'thin' as const, color: { rgb: 'CCCCCC' } },
    bottom: { style: 'thin' as const, color: { rgb: 'CCCCCC' } },
    left: { style: 'thin' as const, color: { rgb: 'CCCCCC' } },
    right: { style: 'thin' as const, color: { rgb: 'CCCCCC' } },
  },
};

const currencyStyle = {
  ...cellStyle,
  numFmt: '#,##0.00',
  alignment: { horizontal: 'right' as const },
};

const titleStyle = {
  font: { bold: true, sz: 14, color: { rgb: '1a56db' } },
};

const subtitleStyle = {
  font: { bold: true, sz: 11 },
};

function addStyledSheet(wb: XLSX.WorkBook, name: string, headers: string[], rows: any[][], currencyCols: number[] = []) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  headers.forEach((_, i) => {
    const cell = XLSX.utils.encode_cell({ r: 0, c: i });
    if (ws[cell]) ws[cell].s = headerStyle;
  });

  rows.forEach((row, ri) => {
    row.forEach((_, ci) => {
      const cell = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
      if (ws[cell]) {
        ws[cell].s = currencyCols.includes(ci) ? currencyStyle : cellStyle;
      }
    });
  });

  ws['!cols'] = headers.map((h, i) => ({
    wch: Math.max(h.length, ...rows.map(r => String(r[i] || '').length), 12) + 2,
  }));

  XLSX.utils.book_append_sheet(wb, ws, name);
}

export interface GLExportOptions {
  includeSummary: boolean;
  includeEntries: boolean;
  includeLineItems: boolean;
  includeByBusinessUnit: boolean;
  includeBySourceModule: boolean;
}

export interface GLExportFilters {
  searchQuery: string;
  filterStatus: string;
  filterBusinessUnit: string;
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: string;
  maxAmount?: string;
}

export interface GLLineItem {
  journal_entry_id: string;
  entry_number?: string;
  account_code: string;
  account_name: string;
  description: string;
  debit: number;
  credit: number;
}

const BUSINESS_UNIT_LABELS: Record<string, string> = {
  SBO: "School Bus Operations",
  YUT: "Yutong Sales",
  SPH: "Special Hire",
  LTV: "Light Vehicle",
  SNT: "Sinotruck Sales",
};

export function exportGLToExcel(
  entries: any[],
  lineItems: GLLineItem[],
  filters: GLExportFilters,
  options: GLExportOptions
) {
  const wb = XLSX.utils.book_new();
  const now = format(new Date(), 'yyyy-MM-dd HH:mm');

  // Summary sheet
  if (options.includeSummary) {
    const totalDebit = entries.reduce((sum, e) => sum + (e.total_debit || 0), 0);
    const totalCredit = entries.reduce((sum, e) => sum + (e.total_credit || 0), 0);

    const summaryData: any[][] = [
      ['General Ledger Export Report', ''],
      [''],
      ['Generated At', now],
      ['Total Entries', entries.length],
      [''],
      ['Filter Criteria', ''],
      ['Status', filters.filterStatus === 'all' ? 'All' : filters.filterStatus],
      ['Business Unit', filters.filterBusinessUnit === 'all' ? 'All' : (BUSINESS_UNIT_LABELS[filters.filterBusinessUnit] || filters.filterBusinessUnit)],
      ['Search Query', filters.searchQuery || 'None'],
      ['Date From', filters.dateFrom ? format(filters.dateFrom, 'yyyy-MM-dd') : 'N/A'],
      ['Date To', filters.dateTo ? format(filters.dateTo, 'yyyy-MM-dd') : 'N/A'],
      ['Min Amount', filters.minAmount || 'N/A'],
      ['Max Amount', filters.maxAmount || 'N/A'],
      [''],
      ['Totals', ''],
      ['Total Debit', totalDebit],
      ['Total Credit', totalCredit],
      ['Difference', totalDebit - totalCredit],
    ];

    const ws = XLSX.utils.aoa_to_sheet(summaryData);
    // Style title
    const titleCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
    if (ws[titleCell]) ws[titleCell].s = titleStyle;
    // Style section headers
    [5, 14].forEach(row => {
      const cell = XLSX.utils.encode_cell({ r: row, c: 0 });
      if (ws[cell]) ws[cell].s = subtitleStyle;
    });
    // Currency format for totals
    [15, 16, 17].forEach(row => {
      const cell = XLSX.utils.encode_cell({ r: row, c: 1 });
      if (ws[cell]) ws[cell].s = currencyStyle;
    });
    ws['!cols'] = [{ wch: 20 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Summary');
  }

  // Journal Entries sheet
  if (options.includeEntries) {
    const headers = ['Entry #', 'Date', 'Business Unit', 'Description', 'Reference', 'Source Module', 'Debit', 'Credit', 'Status'];
    const rows = entries.map(e => [
      e.entry_number || '',
      e.entry_date ? format(new Date(e.entry_date), 'yyyy-MM-dd') : '',
      BUSINESS_UNIT_LABELS[e.business_unit_code] || e.business_unit_code || 'HQ',
      e.description || '',
      e.reference || '',
      e.source_module || '',
      e.total_debit || 0,
      e.total_credit || 0,
      e.status || '',
    ]);
    addStyledSheet(wb, 'Journal Entries', headers, rows, [6, 7]);
  }

  // Line Items sheet
  if (options.includeLineItems) {
    const headers = ['Entry #', 'Account Code', 'Account Name', 'Description', 'Debit', 'Credit'];
    const rows = lineItems.length > 0
      ? lineItems.map(l => [
          l.entry_number || '',
          l.account_code || '',
          l.account_name || '',
          l.description || '',
          l.debit || 0,
          l.credit || 0,
        ])
      : [['No line items found', '', '', '', '', '']];
    addStyledSheet(wb, 'Line Items', headers, rows, [4, 5]);
  }

  // By Business Unit sheet
  if (options.includeByBusinessUnit) {
    const buMap = new Map<string, { count: number; debit: number; credit: number }>();
    entries.forEach(e => {
      const bu = e.business_unit_code || 'HQ';
      const existing = buMap.get(bu) || { count: 0, debit: 0, credit: 0 };
      existing.count++;
      existing.debit += e.total_debit || 0;
      existing.credit += e.total_credit || 0;
      buMap.set(bu, existing);
    });
    const headers = ['Business Unit', 'Code', 'Entries', 'Total Debit', 'Total Credit'];
    const rows = Array.from(buMap.entries()).map(([code, data]) => [
      BUSINESS_UNIT_LABELS[code] || code,
      code,
      data.count,
      data.debit,
      data.credit,
    ]);
    addStyledSheet(wb, 'By Business Unit', headers, rows, [3, 4]);
  }

  // By Source Module sheet
  if (options.includeBySourceModule) {
    const smMap = new Map<string, { count: number; debit: number; credit: number }>();
    entries.forEach(e => {
      const sm = e.source_module || 'manual';
      const existing = smMap.get(sm) || { count: 0, debit: 0, credit: 0 };
      existing.count++;
      existing.debit += e.total_debit || 0;
      existing.credit += e.total_credit || 0;
      smMap.set(sm, existing);
    });
    const headers = ['Source Module', 'Entries', 'Total Debit', 'Total Credit'];
    const rows = Array.from(smMap.entries()).map(([module, data]) => [
      module,
      data.count,
      data.debit,
      data.credit,
    ]);
    addStyledSheet(wb, 'By Source Module', headers, rows, [2, 3]);
  }

  const fileName = `GL_Journal_Entries_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportGLToCSV(entries: any[], lineItems: GLLineItem[] = [], includeLineItems: boolean = false) {
  if (includeLineItems && lineItems.length > 0) {
    // Flat CSV: one row per line item with entry info repeated
    const headers = ['Entry #', 'Date', 'Business Unit', 'Description', 'Reference', 'Source Module', 'Status', 'Account Code', 'Account Name', 'Line Description', 'Debit', 'Credit'];
    const rows = lineItems.map(l => {
      const entry = entries.find(e => e.id === l.journal_entry_id);
      return [
        l.entry_number || '',
        entry?.entry_date ? format(new Date(entry.entry_date), 'yyyy-MM-dd') : '',
        BUSINESS_UNIT_LABELS[entry?.business_unit_code] || entry?.business_unit_code || 'HQ',
        `"${(entry?.description || '').replace(/"/g, '""')}"`,
        entry?.reference || '',
        entry?.source_module || '',
        entry?.status || '',
        l.account_code || '',
        l.account_name || '',
        `"${(l.description || '').replace(/"/g, '""')}"`,
        (l.debit || 0).toFixed(2),
        (l.credit || 0).toFixed(2),
      ];
    });
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csv);
  } else {
    const headers = ['Entry #', 'Date', 'Business Unit', 'Description', 'Reference', 'Source Module', 'Debit', 'Credit', 'Status'];
    const rows = entries.map(e => [
      e.entry_number || '',
      e.entry_date ? format(new Date(e.entry_date), 'yyyy-MM-dd') : '',
      BUSINESS_UNIT_LABELS[e.business_unit_code] || e.business_unit_code || 'HQ',
      `"${(e.description || '').replace(/"/g, '""')}"`,
      e.reference || '',
      e.source_module || '',
      (e.total_debit || 0).toFixed(2),
      (e.total_credit || 0).toFixed(2),
      e.status || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csv);
  }
}

function downloadCSV(csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `GL_Journal_Entries_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
