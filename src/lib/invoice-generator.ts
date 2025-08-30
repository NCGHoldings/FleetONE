import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';

export interface InvoiceData {
  invoiceNo: string;
  invoiceType: 'advance' | 'final';
  quotationNo: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  companyName?: string;
  pickupLocation: string;
  dropLocation: string;
  pickupDate: Date;
  dropDate: Date;
  busType: string;
  numberOfBuses: number;
  numberOfPassengers: number;
  totalAmount: number;
  advanceAmount?: number;
  balanceAmount?: number;
  paidAmount: number;
  companyLogo?: string;
}

export const generateInvoiceHTML = (data: InvoiceData): string => {
  const isAdvanceInvoice = data.invoiceType === 'advance';
  const currentDate = format(new Date(), 'dd/MM/yyyy');
  
  return `
    <div style="width: 210mm; min-height: 297mm; margin: 0; padding: 20mm; font-family: Arial, sans-serif; background: white; color: black;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px;">
        <div style="flex: 1;">
          ${data.companyLogo ? `<img src="${data.companyLogo}" style="max-width: 120px; max-height: 80px; margin-bottom: 10px;" alt="Company Logo">` : ''}
          <h1 style="margin: 0; color: #2563eb; font-size: 28px; font-weight: bold;">Your Company Name</h1>
          <p style="margin: 5px 0; color: #64748b; font-size: 14px;">Address Line 1<br>City, Postal Code<br>Phone: +94 XX XXX XXXX<br>Email: info@company.com</p>
        </div>
        <div style="text-align: right;">
          <h2 style="margin: 0; color: #dc2626; font-size: 24px; font-weight: bold;">${isAdvanceInvoice ? 'ADVANCE PAYMENT' : 'FINAL INVOICE'}</h2>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 10px;">
            <p style="margin: 0; font-weight: bold;">Invoice No: ${data.invoiceNo}</p>
            <p style="margin: 5px 0 0 0;">Date: ${currentDate}</p>
          </div>
        </div>
      </div>

      <!-- Customer Information -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
        <div style="flex: 1; margin-right: 20px;">
          <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 18px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">BILL TO</h3>
          <p style="margin: 0; font-weight: bold; font-size: 16px;">${data.customerName}</p>
          ${data.companyName ? `<p style="margin: 5px 0;">${data.companyName}</p>` : ''}
          <p style="margin: 5px 0;">Phone: ${data.customerPhone}</p>
          ${data.customerEmail ? `<p style="margin: 5px 0;">Email: ${data.customerEmail}</p>` : ''}
        </div>
        <div style="flex: 1;">
          <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 18px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">SERVICE DETAILS</h3>
          <p style="margin: 0;"><strong>Quotation:</strong> ${data.quotationNo}</p>
          <p style="margin: 5px 0;"><strong>Service Type:</strong> Special Hire</p>
          <p style="margin: 5px 0;"><strong>Bus Type:</strong> ${data.busType}</p>
          <p style="margin: 5px 0;"><strong>Number of Buses:</strong> ${data.numberOfBuses}</p>
          <p style="margin: 5px 0;"><strong>Passengers:</strong> ${data.numberOfPassengers}</p>
        </div>
      </div>

      <!-- Trip Details -->
      <div style="margin-bottom: 30px;">
        <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 18px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">TRIP INFORMATION</h3>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <div style="flex: 1; margin-right: 20px;">
              <p style="margin: 0; font-weight: bold; color: #16a34a;">FROM</p>
              <p style="margin: 5px 0; font-size: 16px;">${data.pickupLocation}</p>
              <p style="margin: 0; color: #64748b;">Date: ${format(data.pickupDate, 'dd/MM/yyyy')}</p>
            </div>
            <div style="flex: 1;">
              <p style="margin: 0; font-weight: bold; color: #dc2626;">TO</p>
              <p style="margin: 5px 0; font-size: 16px;">${data.dropLocation}</p>
              <p style="margin: 0; color: #64748b;">Date: ${format(data.dropDate, 'dd/MM/yyyy')}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Financial Summary -->
      <div style="margin-bottom: 30px;">
        <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 18px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">PAYMENT DETAILS</h3>
        <table style="width: 100%; border-collapse: collapse; background: white; border: 1px solid #e5e7eb;">
          <tr style="background: #f3f4f6;">
            <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">Description</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; text-align: right;">Amount (LKR)</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">Total Service Charge</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">${data.totalAmount.toLocaleString()}.00</td>
          </tr>
          ${isAdvanceInvoice ? `
          <tr>
            <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #16a34a;">Advance Payment (This Invoice)</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #16a34a;">${data.paidAmount.toLocaleString()}.00</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #dc2626;">Remaining Balance</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #dc2626;">${(data.totalAmount - data.paidAmount).toLocaleString()}.00</td>
          </tr>
          ` : `
          ${data.advanceAmount ? `
          <tr>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">Previous Advance Payment</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">${data.advanceAmount.toLocaleString()}.00</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #16a34a;">Final Payment (This Invoice)</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #16a34a;">${data.paidAmount.toLocaleString()}.00</td>
          </tr>
          <tr style="background: #16a34a; color: white;">
            <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">TOTAL PAID</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${(data.advanceAmount ? data.advanceAmount + data.paidAmount : data.paidAmount).toLocaleString()}.00</td>
          </tr>
          `}
        </table>
      </div>

      <!-- Terms and Footer -->
      <div style="margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
        <h4 style="margin: 0 0 10px 0; color: #374151;">Terms & Conditions:</h4>
        <ul style="margin: 0; padding-left: 20px; color: #64748b; font-size: 12px;">
          <li>Payment must be made as per the agreed schedule</li>
          <li>Service is subject to terms and conditions mentioned in the quotation</li>
          <li>Any changes to the service schedule must be notified 24 hours in advance</li>
          <li>Company reserves the right to modify terms with prior notice</li>
        </ul>
        
        <div style="margin-top: 30px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
          <p style="margin: 0;">Thank you for choosing our services!</p>
          <p style="margin: 5px 0 0 0;">This is a computer generated invoice and does not require signature.</p>
        </div>
      </div>
    </div>
  `;
};

export const generateInvoicePDF = async (data: InvoiceData): Promise<Blob> => {
  // Create a temporary div with the invoice HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = generateInvoiceHTML(data);
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.top = '-9999px';
  tempDiv.style.width = '210mm';
  document.body.appendChild(tempDiv);

  try {
    // Convert HTML to canvas
    const canvas = await html2canvas(tempDiv.children[0] as HTMLElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 794, // A4 width in pixels at 96 DPI
      height: 1123 // A4 height in pixels at 96 DPI
    });

    // Create PDF
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    
    return pdf.output('blob');
  } finally {
    // Clean up
    document.body.removeChild(tempDiv);
  }
};