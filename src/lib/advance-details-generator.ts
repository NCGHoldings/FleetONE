import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface AdvanceDetailsData {
  quotationNo: string;
  hireDate: Date;
  pickupLocation: string;
  dropLocation: string;
  numberOfDays: number;
  
  driverName: string;
  driverContact: string;
  driverMealAllowance: number;
  driverSalary: number;
  driverHighwayCharges: number;
  driverOtherCharges: number;
  driverSignature?: { data: string; type: string };
  
  conductorName?: string;
  conductorContact?: string;
  conductorMealAllowance: number;
  conductorSalary: number;
  conductorSignature?: { data: string; type: string };
  
  preparedBy: string;
  preparedBySignature?: { data: string; type: string };
  
  checkedBy?: string;
  checkedBySignature?: { data: string; type: string };
  
  authorizedBy?: string;
  authorizedBySignature?: { data: string; type: string };
  
  totalAmount: number;
  notes?: string;
}

export function generateAdvanceDetailsHTML(data: AdvanceDetailsData, logoUrl?: string): string {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const renderSignature = (sig?: { data: string; type: string }) => {
    if (!sig || !sig.data) {
      return '<div style="height: 50px; border-bottom: 1px solid #000; margin-top: 30px;"></div>';
    }
    
    if (sig.type === 'text') {
      return `<div style="height: 50px; display: flex; align-items: flex-end; margin-top: 30px; font-family: 'Brush Script MT', cursive; font-size: 22px; border-bottom: 1px solid #000;">${sig.data}</div>`;
    }
    return `<div style="margin-top: 20px;"><img src="${sig.data}" alt="Signature" style="max-height: 50px; max-width: 200px; display: block;" /></div><div style="border-bottom: 1px solid #000; margin-top: 5px;"></div>`;
  };

  const driverTotal = data.driverMealAllowance + data.driverSalary + data.driverHighwayCharges + data.driverOtherCharges;
  const conductorTotal = data.conductorMealAllowance + data.conductorSalary;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { 
          size: A4;
          margin: 15mm;
        }
        body {
          font-family: Arial, sans-serif;
          font-size: 11pt;
          line-height: 1.4;
          color: #000;
          margin: 0;
          padding: 0;
          background: white;
        }
        .document {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: white;
          padding: 20px;
          box-sizing: border-box;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          border-bottom: 3px solid #1e40af;
          padding-bottom: 15px;
        }
        .header img {
          max-height: 80px;
          max-width: 200px;
        }
        .header-title {
          text-align: right;
        }
        .header h1 {
          margin: 0 0 5px 0;
          font-size: 24pt;
          font-weight: bold;
          text-transform: uppercase;
          color: #1e40af;
        }
        .header-subtitle {
          margin: 0;
          font-size: 10pt;
          color: #666;
        }
        .info-section {
          margin-bottom: 20px;
        }
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        .info-table td {
          padding: 5px 8px;
          border: 1px solid #000;
          font-size: 10pt;
        }
        .info-table td:first-child {
          font-weight: bold;
          width: 35%;
          background: #f5f5f5;
        }
        .section-title {
          font-size: 12pt;
          font-weight: bold;
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          color: white;
          padding: 10px 15px;
          margin: 20px 0 10px 0;
          text-transform: uppercase;
          border-radius: 5px;
        }
        .details-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        .details-table td {
          padding: 6px 10px;
          border: 1px solid #000;
          font-size: 10pt;
        }
        .details-table td:first-child {
          font-weight: bold;
          width: 45%;
          background: #f3f4f6;
        }
        .details-table tr:nth-child(even) td:first-child {
          background: #e5e7eb;
        }
        .details-table td:last-child {
          text-align: right;
        }
        .total-row {
          background: #e8e8e8;
          font-weight: bold;
          font-size: 11pt;
        }
        .grand-total {
          background: #000;
          color: white;
          font-size: 12pt;
          font-weight: bold;
        }
        .signatures {
          margin-top: 40px;
          page-break-inside: avoid;
        }
        .signature-row {
          display: flex;
          justify-content: space-around;
          margin-top: 20px;
        }
        .signature-box {
          width: 30%;
          text-align: center;
        }
        .signature-label {
          font-weight: bold;
          font-size: 10pt;
          margin-bottom: 5px;
        }
        .signature-name {
          font-weight: bold;
          margin-top: 10px;
          font-size: 10pt;
        }
        .signature-date {
          font-size: 9pt;
          color: #666;
          margin-top: 5px;
        }
        .notes-section {
          margin-top: 20px;
          padding: 10px;
          border: 1px solid #000;
          background: #fffbf0;
          page-break-inside: avoid;
        }
        .notes-title {
          font-weight: bold;
          margin-bottom: 5px;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 9pt;
          color: #666;
          border-top: 1px solid #ccc;
          padding-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="document">
        <!-- Header -->
        <div class="header">
           ${logoUrl ? `<img src="${logoUrl}" alt="NCG Holdings" />` : '<div style="width: 200px;"></div>'}
          <div class="header-title">
            <h1>Advance Payment Details</h1>
            <p class="header-subtitle">NCG Holding (Pvt) Ltd - Transport Services</p>
          </div>
        </div>

        <!-- Trip Information -->
        <table class="info-table">
          <tr>
            <td>Quotation No.</td>
            <td>${data.quotationNo}</td>
          </tr>
          <tr>
            <td>Date of Hire</td>
            <td>${formatDate(data.hireDate)}</td>
          </tr>
          <tr>
            <td>Pickup Location</td>
            <td>${data.pickupLocation}</td>
          </tr>
          <tr>
            <td>Drop Location</td>
            <td>${data.dropLocation}</td>
          </tr>
          <tr>
            <td>Number of Days</td>
            <td>${data.numberOfDays} ${data.numberOfDays === 1 ? 'Day' : 'Days'}</td>
          </tr>
        </table>

        <!-- Driver Details -->
        <div class="section-title">Driver Details</div>
        <table class="details-table">
          <tr>
            <td>Driver Name</td>
            <td>${data.driverName}</td>
          </tr>
          <tr>
            <td>Contact Number</td>
            <td>${data.driverContact}</td>
          </tr>
          <tr>
            <td>Meal Allowance</td>
            <td>LKR ${formatCurrency(data.driverMealAllowance)}</td>
          </tr>
          <tr>
            <td>Salary</td>
            <td>LKR ${formatCurrency(data.driverSalary)}</td>
          </tr>
          <tr>
            <td>Highway Charges</td>
            <td>LKR ${formatCurrency(data.driverHighwayCharges)}</td>
          </tr>
          <tr>
            <td>Other Charges</td>
            <td>LKR ${formatCurrency(data.driverOtherCharges)}</td>
          </tr>
          <tr class="total-row">
            <td>Driver Total</td>
            <td>LKR ${formatCurrency(driverTotal)}</td>
          </tr>
        </table>

        <!-- Conductor Details (if applicable) -->
        ${data.conductorName ? `
        <div class="section-title">Conductor/Assistant Details</div>
        <table class="details-table">
          <tr>
            <td>Conductor Name</td>
            <td>${data.conductorName}</td>
          </tr>
          <tr>
            <td>Contact Number</td>
            <td>${data.conductorContact || 'N/A'}</td>
          </tr>
          <tr>
            <td>Meal Allowance</td>
            <td>LKR ${formatCurrency(data.conductorMealAllowance)}</td>
          </tr>
          <tr>
            <td>Salary</td>
            <td>LKR ${formatCurrency(data.conductorSalary)}</td>
          </tr>
          <tr class="total-row">
            <td>Conductor Total</td>
            <td>LKR ${formatCurrency(conductorTotal)}</td>
          </tr>
        </table>
        ` : ''}

        <!-- Grand Total -->
        <table class="details-table">
          <tr class="grand-total">
            <td>GRAND TOTAL</td>
            <td>LKR ${formatCurrency(data.totalAmount)}</td>
          </tr>
        </table>

        <!-- Notes -->
        ${data.notes ? `
        <div class="notes-section">
          <div class="notes-title">Notes:</div>
          <div>${data.notes}</div>
        </div>
        ` : ''}

        <!-- Signatures -->
        <div class="signatures">
          <div class="section-title">Authorization</div>
          <div class="signature-row">
            <div class="signature-box">
              <div class="signature-label">PREPARED BY</div>
              ${renderSignature(data.preparedBySignature)}
              <div class="signature-name">${data.preparedBy}</div>
              <div class="signature-date">${formatDate(new Date())}</div>
            </div>
            
            ${data.checkedBy ? `
            <div class="signature-box">
              <div class="signature-label">CHECKED BY</div>
              ${renderSignature(data.checkedBySignature)}
              <div class="signature-name">${data.checkedBy}</div>
              <div class="signature-date">${formatDate(new Date())}</div>
            </div>
            ` : ''}
            
            ${data.authorizedBy ? `
            <div class="signature-box">
              <div class="signature-label">AUTHORIZED BY</div>
              ${renderSignature(data.authorizedBySignature)}
              <div class="signature-name">${data.authorizedBy}</div>
              <div class="signature-date">${formatDate(new Date())}</div>
            </div>
            ` : ''}
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <div>NCG Holding (Pvt) Ltd - Transport Management System</div>
          <div>Page 1 of 1</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function generateAdvanceDetailsPDF(
  htmlElement: HTMLElement,
  filename: string = 'advance-details.pdf'
): Promise<{ success: boolean; pdfBase64?: string; error?: string }> {
  try {
    const canvas = await html2canvas(htmlElement, {
      scale: 1.5,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.85);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 10;

    pdf.addImage(imgData, 'JPEG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);

    const pdfBase64 = pdf.output('datauristring').split(',')[1];

    return {
      success: true,
      pdfBase64,
    };
  } catch (error) {
    console.error('Error generating PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate PDF',
    };
  }
}

export function downloadAdvanceDetailsPDF(pdfBase64: string, filename: string = 'advance-details.pdf') {
  const link = document.createElement('a');
  link.href = `data:application/pdf;base64,${pdfBase64}`;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
