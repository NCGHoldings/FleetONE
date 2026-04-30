import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export interface ExportConfig {
  filename: string;
  title?: string;
  subtitle?: string;
  headers: string[];
  data: any[][];
}

/**
 * Export tabular data to a CSV file.
 */
export const exportToCSV = (config: ExportConfig) => {
  const { filename, headers, data } = config;
  
  const worksheetData = [headers, ...data];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
  
  // Create download
  XLSX.writeFile(workbook, `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
};

/**
 * Export tabular data to a highly stylized PDF file with company branding.
 */
export const exportToPDF = (config: ExportConfig) => {
  const { filename, title = "Data Report", subtitle = "", headers, data } = config;
  
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  
  // --- Header Section ---
  // Add Company Logo (Using text as fallback since we don't have base64 in this util yet)
  // In a real scenario, you'd load the base64 string of the logo.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(30, 58, 138); // Dark blue / primary color
  doc.text("FleetONE by NCG", 40, 50);

  // Add Report Title
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(title, 40, 80);

  // Add Subtitle / Date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const timestamp = format(new Date(), 'MMM dd, yyyy HH:mm a');
  doc.text(`${subtitle} | Generated on: ${timestamp}`, 40, 95);

  // Add horizontal line
  doc.setDrawColor(200, 200, 200);
  doc.line(40, 105, pageWidth - 40, 105);

  // --- Table Section ---
  autoTable(doc, {
    startY: 120,
    head: [headers],
    body: data,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 6,
      lineColor: [230, 230, 230],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [248, 250, 252], // Slate 50
      textColor: [15, 23, 42],    // Slate 900
      fontStyle: 'bold',
      lineColor: [203, 213, 225],
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    margin: { top: 40, right: 40, bottom: 40, left: 40 },
    didDrawPage: function (data) {
      // Footer
      const str = 'Page ' + doc.internal.getCurrentPageInfo().pageNumber;
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        str,
        data.settings.margin.left,
        doc.internal.pageSize.getHeight() - 20
      );
    },
  });

  // Save the PDF
  doc.save(`${filename}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
