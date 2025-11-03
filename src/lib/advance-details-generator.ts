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
    return new Date(date).toLocaleDateString('en-GB');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const renderSignature = (sig?: { data: string; type: string }) => {
    if (!sig || !sig.data) return '<div style="height: 60px; border-bottom: 1px solid #9ca3af;"></div>';
    
    if (sig.type === 'text') {
      return `<div style="height: 60px; display: flex; align-items: center; border-bottom: 1px solid #9ca3af; font-family: 'Brush Script MT', cursive; font-size: 24px;">${sig.data}</div>`;
    }
    return `<img src="${sig.data}" alt="Signature" style="max-height: 60px; max-width: 100%; object-fit: contain;" />`;
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { margin: 20mm; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #1f2937;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background: white;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 20px;
        }
        .logo {
          max-width: 200px;
          margin-bottom: 15px;
        }
        .title {
          font-size: 28px;
          font-weight: bold;
          color: #2563eb;
          margin: 10px 0;
        }
        .info-section {
          background: #f9fafb;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .info-label {
          font-weight: 600;
          color: #4b5563;
        }
        .section-title {
          font-size: 18px;
          font-weight: bold;
          color: #2563eb;
          margin: 25px 0 15px 0;
          padding-bottom: 5px;
          border-bottom: 2px solid #e5e7eb;
        }
        .details-box {
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          background: white;
        }
        .field-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .field-label {
          font-weight: 600;
          color: #4b5563;
          min-width: 180px;
        }
        .field-value {
          text-align: right;
          color: #1f2937;
        }
        .total-section {
          background: #2563eb;
          color: white;
          padding: 20px;
          border-radius: 8px;
          margin: 30px 0;
          text-align: center;
        }
        .total-label {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 5px;
        }
        .total-amount {
          font-size: 32px;
          font-weight: bold;
        }
        .authorization-section {
          display: flex;
          justify-content: space-between;
          margin-top: 40px;
        }
        .auth-box {
          flex: 1;
          margin: 0 10px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 15px;
          text-align: center;
        }
        .auth-title {
          font-weight: 600;
          color: #2563eb;
          margin-bottom: 10px;
          font-size: 14px;
        }
        .auth-name {
          font-weight: 600;
          margin: 10px 0;
          min-height: 20px;
        }
        .auth-signature {
          margin: 15px 0;
          min-height: 60px;
        }
        .auth-date {
          font-size: 12px;
          color: #6b7280;
          margin-top: 10px;
        }
        .notes {
          margin-top: 30px;
          padding: 15px;
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          border-radius: 4px;
        }
        .notes-label {
          font-weight: 600;
          color: #92400e;
          margin-bottom: 5px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        ${logoUrl ? `<img src="${logoUrl}" alt="NCG Express" class="logo" />` : '<div style="height: 60px;"></div>'}
        <div class="title">ADVANCE PAYMENT DETAILS</div>
      </div>

      <div class="info-section">
        <div class="info-row">
          <span class="info-label">Quotation No:</span>
          <span>${data.quotationNo}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Date of Hire:</span>
          <span>${formatDate(data.hireDate)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Number of Days:</span>
          <span>${data.numberOfDays} ${data.numberOfDays === 1 ? 'Day' : 'Days'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Pickup Location:</span>
          <span>${data.pickupLocation}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Drop Location:</span>
          <span>${data.dropLocation}</span>
        </div>
      </div>

      <div class="section-title">DRIVER DETAILS</div>
      <div class="details-box">
        <div class="field-row">
          <span class="field-label">Driver Name:</span>
          <span class="field-value">${data.driverName}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Contact Number:</span>
          <span class="field-value">${data.driverContact}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Meal Allowance:</span>
          <span class="field-value">${formatCurrency(data.driverMealAllowance)}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Salary:</span>
          <span class="field-value">${formatCurrency(data.driverSalary)}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Highway Charges:</span>
          <span class="field-value">${formatCurrency(data.driverHighwayCharges)}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Other Charges:</span>
          <span class="field-value">${formatCurrency(data.driverOtherCharges)}</span>
        </div>
        <div style="margin-top: 20px;">
          <div class="field-label" style="margin-bottom: 10px;">Driver Signature:</div>
          ${renderSignature(data.driverSignature)}
        </div>
      </div>

      ${data.conductorName ? `
        <div class="section-title">CONDUCTOR/ASSISTANT DETAILS</div>
        <div class="details-box">
          <div class="field-row">
            <span class="field-label">Conductor Name:</span>
            <span class="field-value">${data.conductorName}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Contact Number:</span>
            <span class="field-value">${data.conductorContact || 'N/A'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Meal Allowance:</span>
            <span class="field-value">${formatCurrency(data.conductorMealAllowance)}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Salary:</span>
            <span class="field-value">${formatCurrency(data.conductorSalary)}</span>
          </div>
          <div style="margin-top: 20px;">
            <div class="field-label" style="margin-bottom: 10px;">Conductor Signature:</div>
            ${renderSignature(data.conductorSignature)}
          </div>
        </div>
      ` : ''}

      <div class="total-section">
        <div class="total-label">TOTAL AMOUNT</div>
        <div class="total-amount">${formatCurrency(data.totalAmount)}</div>
      </div>

      <div class="section-title">AUTHORIZATION</div>
      <div class="authorization-section">
        <div class="auth-box">
          <div class="auth-title">PREPARED BY</div>
          <div class="auth-name">${data.preparedBy}</div>
          <div class="auth-signature">
            ${renderSignature(data.preparedBySignature)}
          </div>
          <div class="auth-date">${formatDate(new Date())}</div>
        </div>

        ${data.checkedBy ? `
          <div class="auth-box">
            <div class="auth-title">CHECKED BY</div>
            <div class="auth-name">${data.checkedBy}</div>
            <div class="auth-signature">
              ${renderSignature(data.checkedBySignature)}
            </div>
            <div class="auth-date">${formatDate(new Date())}</div>
          </div>
        ` : ''}

        ${data.authorizedBy ? `
          <div class="auth-box">
            <div class="auth-title">AUTHORIZED BY</div>
            <div class="auth-name">${data.authorizedBy}</div>
            <div class="auth-signature">
              ${renderSignature(data.authorizedBySignature)}
            </div>
            <div class="auth-date">${formatDate(new Date())}</div>
          </div>
        ` : ''}
      </div>

      ${data.notes ? `
        <div class="notes">
          <div class="notes-label">Notes:</div>
          <div>${data.notes}</div>
        </div>
      ` : ''}
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
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
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

    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);

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
