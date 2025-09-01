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
  // New optional fields to align with NCG invoice template
  vehicleNo?: string;
  driverName?: string;
  conductorName?: string;
  itemDetail?: string;
  discountAmount?: number;
}

export const generateInvoiceHTML = (data: InvoiceData): string => {
  const isAdvanceInvoice = data.invoiceType === 'advance';
  const currentDate = format(new Date(), 'dd/MM/yyyy');
  const companyLogo = data.companyLogo || '/lovable-uploads/52e834c4-cfda-4ea3-9da7-aac1f23e1162.png';

  if (isAdvanceInvoice) {
    // Use Sales Receipt format for advance payments
    return `
      <div style="font-family: Arial, sans-serif; font-size: 14px; margin: 40px; width: 210mm; min-height: 297mm; background: white; color: black;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <img src="${companyLogo}" alt="Company Logo" style="width: 150px;">
          <div style="text-align: right; font-size: 13px;">
            <b>NCG EXPRESS (PRIVATE) LIMITED</b><br>
            157Y, Kebellawita, Weniwelkola, Polgasowita<br>
            0777556322
          </div>
        </div>

        <h2 style="text-align: center; margin: 20px 0; text-decoration: underline;">SALES RECEIPT</h2>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #000;">
          <tr>
            <td style="border: 1px solid #000; padding: 8px;"><b>Receipt No.</b><br> ${data.invoiceNo}</td>
            <td style="border: 1px solid #000; padding: 8px;"><b>Date</b><br> ${currentDate}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 8px;"><b>Payment Ref</b><br> ${data.customerName}, ${data.quotationNo}</td>
            <td style="border: 1px solid #000; padding: 8px;"><b>Transaction No.</b><br> ${data.invoiceNo.split('-').pop()}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 8px;"><b>Customer</b><br> ${data.companyName || data.customerName}</td>
            <td style="border: 1px solid #000; padding: 8px;"></td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #000;">
          <tr style="background: #f0f0f0;">
            <th style="border: 1px solid #000; padding: 8px; text-align: left;">Account Name</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: left;">Transfer Date</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: left;">Reference</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: left;">Amount</th>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 8px;">ADVANCE PAYMENT</td>
            <td style="border: 1px solid #000; padding: 8px;">${currentDate}</td>
            <td style="border: 1px solid #000; padding: 8px;">${data.quotationNo}</td>
            <td style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold;">${data.paidAmount.toLocaleString()}.00</td>
          </tr>
        </table>

        <p style="text-align: right; font-weight: bold; margin: 10px 0;">Advance Payment Total: LKR ${data.paidAmount.toLocaleString()}.00</p>
        <p style="text-align: right; font-weight: bold; margin: 10px 0;">Total Payment Amount: LKR ${data.paidAmount.toLocaleString()}.00</p>
        <p style="text-align: right; font-weight: bold; margin: 10px 0; color: #b91c1c;">Balance Due: LKR ${(data.totalAmount - data.paidAmount).toLocaleString()}.00</p>

        <p style="font-style: italic; margin: 15px 0;">Trip Details: ${format(data.pickupDate, 'dd/MM/yyyy')} - ${format(data.dropDate, 'dd/MM/yyyy')} | ${data.pickupLocation} to ${data.dropLocation} | ${data.numberOfPassengers} Pax | ${data.busType}</p>

        <p style="font-size: 12px; margin: 10px 0;">
          *Note: Please make sure to place the name, signature and date in the given space accordingly.
        </p>

        <div style="margin-top: 30px; display: flex; justify-content: space-between;">
          <div style="width: 45%;">
            <b>Prepared by :</b><br>
            <p style="margin: 5px 0;">Name: ...............................</p>
            <p style="margin: 5px 0;">Signature: ......................................</p>
            <p style="margin: 5px 0;">Date: ......${currentDate}.............</p>
          </div>
          <div style="width: 45%;">
            <b>Received by :</b><br>
            <p style="margin: 5px 0;">Name: ......................................</p>
            <p style="margin: 5px 0;">Signature: ......................................</p>
            <p style="margin: 5px 0;">Date: ......................................</p>
          </div>
        </div>

        <div style="margin-top: 40px; text-align: center; font-size: 12px;">
          Page 1 of 1 <br>
          NCG Express Transport Management System
        </div>

      </div>
    `;
  } else {
    // Use Invoice format for final payments
    const discount = data.discountAmount || 0;
    const subTotal = data.totalAmount;
    const totalAfterDiscount = Math.max(subTotal - discount, 0);
    const previousAdvance = data.advanceAmount || 0;
    const totalPaid = previousAdvance + data.paidAmount;
    const itemDetail = data.itemDetail || `Date(s): ${format(data.pickupDate, 'dd/MM/yyyy')} - ${format(data.dropDate, 'dd/MM/yyyy')} | ${data.numberOfPassengers} Pax | ${data.numberOfBuses} Bus(es) | ${data.busType}`;

    return `
      <div style="width: 210mm; min-height: 297mm; margin: 0; padding: 16mm; font-family: Arial, sans-serif; background: white; color: #111827;">
        <!-- Header -->
        <header style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
          <div style="flex: 1;">
            <img src="${companyLogo}" alt="Company Logo" style="max-height: 80px; object-fit: contain; margin-bottom: 8px;"/>
            <div style="font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">NCG EXPRESS</div>
            <div style="font-size: 12px; color: #6B7280; line-height: 1.4;">
              157Y, Kebellawita, Weniwelkola, Polgasowita<br/>
              0777556322
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 24px; font-weight: 800; color: #1f2937; text-transform: uppercase;">
              FINAL INVOICE
            </div>
            <div style="margin-top: 8px; background: #F3F4F6; padding: 12px; border-radius: 8px; font-size: 12px;">
              <div><strong>Invoice No:</strong> ${data.invoiceNo}</div>
              <div><strong>Date:</strong> ${currentDate}</div>
              <div><strong>Quotation No:</strong> ${data.quotationNo}</div>
            </div>
          </div>
        </header>

        <!-- Parties -->
        <section style="display: flex; gap: 16px; margin-bottom: 16px;">
          <article style="flex:1; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px;">
            <div style="font-size: 12px; color: #6B7280; font-weight: 700;">Bill To</div>
            <div style="font-size: 16px; font-weight: 700; margin-top: 4px;">${data.customerName}</div>
            ${data.companyName ? `<div style=\"margin-top:4px; font-size: 14px;\">${data.companyName}</div>` : ''}
            <div style="margin-top: 4px; font-size: 14px;">${data.customerPhone}${data.customerEmail ? ` | ${data.customerEmail}` : ''}</div>
          </article>
          <article style="flex:1; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px;">
            <div style="font-size: 12px; color: #6B7280; font-weight: 700;">Trip</div>
            <div style="margin-top: 4px; font-size: 14px;"><strong>From:</strong> ${data.pickupLocation}</div>
            <div style="margin-top: 2px; font-size: 14px;"><strong>To:</strong> ${data.dropLocation}</div>
            <div style="margin-top: 2px; font-size: 14px;"><strong>Date(s):</strong> ${format(data.pickupDate, 'dd/MM/yyyy')} - ${format(data.dropDate, 'dd/MM/yyyy')}</div>
          </article>
        </section>

        <!-- Items table -->
        <section>
          <table style="width:100%; border-collapse: collapse; border: 1px solid #E5E7EB;">
            <thead>
              <tr style="background:#F9FAFB;">
                <th style="text-align:left; padding:10px; border-bottom:1px solid #E5E7EB; font-size:12px; color:#6B7280; width:28%">Description</th>
                <th style="text-align:left; padding:10px; border-bottom:1px solid #E5E7EB; font-size:12px; color:#6B7280; width:44%">Item Detail</th>
                <th style="text-align:left; padding:10px; border-bottom:1px solid #E5E7EB; font-size:12px; color:#6B7280; width:14%">Vehicle No</th>
                <th style="text-align:right; padding:10px; border-bottom:1px solid #E5E7EB; font-size:12px; color:#6B7280; width:14%">Amount (LKR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:10px; border-bottom:1px solid #F3F4F6; font-weight:600;">Special Hire</td>
                <td style="padding:10px; border-bottom:1px solid #F3F4F6;">
                  ${itemDetail}
                  ${data.driverName || data.conductorName ? `<div style=\"margin-top:4px; font-size:12px; color:#6B7280;\">${data.driverName ? `Driver: ${data.driverName}` : ''}${data.driverName && data.conductorName ? ' | ' : ''}${data.conductorName ? `Conductor: ${data.conductorName}` : ''}</div>` : ''}
                </td>
                <td style="padding:10px; border-bottom:1px solid #F3F4F6;">${data.vehicleNo || '-'}</td>
                <td style="padding:10px; border-bottom:1px solid #F3F4F6; text-align:right;">${subTotal.toLocaleString()}.00</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- Summary -->
        <section style="margin-top: 16px; display:flex; justify-content:flex-end;">
          <table style="width: 60%; border-collapse: collapse;">
            <tbody>
              <tr>
                <td style="padding:8px; color:#6B7280;">Sub-total</td>
                <td style="padding:8px; text-align:right;">${subTotal.toLocaleString()}.00</td>
              </tr>
              <tr>
                <td style="padding:8px; color:#6B7280;">Discount</td>
                <td style="padding:8px; text-align:right;">${discount.toLocaleString()}.00</td>
              </tr>
              <tr style="border-top:1px solid #E5E7EB;">
                <td style="padding:8px; font-weight:700;">Price after discount</td>
                <td style="padding:8px; text-align:right; font-weight:700;">${totalAfterDiscount.toLocaleString()}.00</td>
              </tr>
              ${previousAdvance ? `
              <tr>
                <td style="padding:8px;">Previous Advance Payment</td>
                <td style="padding:8px; text-align:right;">${previousAdvance.toLocaleString()}.00</td>
              </tr>` : ''}
              <tr>
                <td style="padding:8px; font-weight:700; color:#065f46;">Final Payment (this invoice)</td>
                <td style="padding:8px; text-align:right; font-weight:700; color:#065f46;">${data.paidAmount.toLocaleString()}.00</td>
              </tr>
              <tr style="background:#059669; color:white;">
                <td style="padding:8px; font-weight:700;">Total Paid</td>
                <td style="padding:8px; text-align:right; font-weight:700;">${totalPaid.toLocaleString()}.00</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- Footer -->
        <footer style="margin-top: 24px; border-top: 1px solid #E5E7EB; padding-top: 12px; font-size: 12px; color:#6B7280;">
          <div>Thank you for your business.</div>
          <div style="margin-top: 6px;">This is a computer-generated document and does not require a signature.</div>
        </footer>
      </div>
    `;
  }
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