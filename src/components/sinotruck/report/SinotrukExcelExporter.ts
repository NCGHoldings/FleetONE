import XLSX from 'xlsx-js-style';
import { SinotrukReportData } from '@/hooks/useSinotrukExecutiveReport';

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

function addStyledSheet(wb: XLSX.WorkBook, name: string, headers: string[], rows: any[][]) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Style headers
  headers.forEach((_, i) => {
    const cell = XLSX.utils.encode_cell({ r: 0, c: i });
    if (ws[cell]) ws[cell].s = headerStyle;
  });

  // Style data cells
  rows.forEach((row, ri) => {
    row.forEach((_, ci) => {
      const cell = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
      if (ws[cell]) ws[cell].s = cellStyle;
    });
  });

  // Auto-width
  ws['!cols'] = headers.map((h, i) => ({
    wch: Math.max(h.length, ...rows.map(r => String(r[i] || '').length)) + 2,
  }));

  XLSX.utils.book_append_sheet(wb, ws, name);
}

export function exportSinotrukReport(data: SinotrukReportData) {
  const wb = XLSX.utils.book_new();

  // Executive Summary
  addStyledSheet(wb, 'Executive Summary', ['Metric', 'Value'], [
    ['Report Generated', new Date(data.generatedAt).toLocaleString()],
    ['Total Quotations', data.pipeline.totalQuotations],
    ['Conversion Rate', `${data.pipeline.conversionRate.toFixed(1)}%`],
    ['Total Orders', data.orders.totalOrders],
    ['Total Order Value', `LKR ${data.orders.totalOrderValue.toLocaleString()}`],
    ['Total Collected', `LKR ${data.orders.totalPaid.toLocaleString()}`],
    ['Outstanding Balance', `LKR ${data.orders.totalBalance.toLocaleString()}`],
    ['Collection Rate', `${data.payments.collectionRate.toFixed(1)}%`],
    ['Units Delivered', data.delivery.totalDelivered],
    ['Active Warranties', data.afterSales.activeWarranties],
    ['Open Tickets', data.afterSales.openTickets],
    ['Customer Rating', data.afterSales.avgFeedbackRating || 'N/A'],
  ]);

  // Sales Pipeline
  addStyledSheet(wb, 'Sales Pipeline', ['Status', 'Count'], [
    ['Draft', data.pipeline.draft],
    ['Sent', data.pipeline.sent],
    ['Confirmed', data.pipeline.confirmed],
    ['Rejected', data.pipeline.rejected],
    ['Expired', data.pipeline.expired],
  ]);

  // Monthly Trends
  addStyledSheet(wb, 'Monthly Trends', ['Month', 'Quotations', 'Orders', 'Deliveries', 'Revenue (LKR)'],
    data.monthlyTrends.map(m => [m.month, m.quotations, m.orders, m.deliveries, m.revenue])
  );

  // Bus Models
  addStyledSheet(wb, 'Bus Models', ['Model', 'Orders', 'Units', 'Total Value (LKR)', 'Avg Price (LKR)'],
    data.busModelPerformance.map(m => [m.model, m.orders, m.units, m.totalValue, Math.round(m.avgPrice)])
  );

  // Top Customers
  addStyledSheet(wb, 'Top Customers', ['Company', 'Contact', 'Orders', 'Total Value (LKR)'],
    data.topCustomers.map(c => [c.company_name, c.contact_person || '-', c.orderCount, c.totalValue])
  );

  // Operations
  addStyledSheet(wb, 'Operations', ['Stage', 'In Progress', 'Completed'], [
    ['Customs', data.operations.inCustoms, data.operations.customsCleared],
    ['Processing', data.operations.inProcessing, data.operations.processingComplete],
    ['RMV Registration', data.operations.inRMV, data.operations.rmvRegistered],
  ]);

  XLSX.writeFile(wb, `Sinotruk_Executive_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
