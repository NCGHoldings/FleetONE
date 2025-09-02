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
    // Use Sales Receipt format for advance payments with fixed padding
    return `
      <div style="font-family: Arial, sans-serif; font-size: 14px; margin: 0; padding: 20px; width: 210mm; min-height: 297mm; background: white; color: black; box-sizing: border-box;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <img src="${companyLogo}" alt="Company Logo" style="width: 150px;">
          <div style="text-align: right; font-size: 13px;">
            <b>NCG EXPRESS (PRIVATE) LIMITED</b><br>
            157/1, Kebellaowita, Wenwellkola, Polgasowita<br>
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
    // Use NCG Invoice format for final payments
    const discount = data.discountAmount || 0;
    const subTotal = data.totalAmount;
    const priceAfterDiscount = subTotal - discount;
    const previousAdvance = data.advanceAmount || 0;
    const balancePayment = priceAfterDiscount - previousAdvance;
    const itemDetail = data.itemDetail || `${data.pickupLocation} to ${data.dropLocation}`;
    const mileage = data.numberOfBuses * 100; // Placeholder mileage calculation

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>NCG Express Invoice</title>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  margin: 0;
                  padding: 20px;
                  background-color: white;
                  font-size: 12px;
              }
              
              .invoice-container {
                  max-width: 800px;
                  margin: 0 auto;
                  background: white;
                  border: 1px solid #000;
              }
              
              .header {
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-start;
                  padding: 20px;
                  border-bottom: 1px solid #000;
              }
              
              .logo-section {
                  display: flex;
                  align-items: center;
                  gap: 10px;
              }
              
              .logo {
                  width: 60px;
                  height: 40px;
                  background: #4A90E2;
                  border-radius: 5px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                  font-weight: bold;
                  font-size: 14px;
              }
              
              .company-name {
                  font-size: 16px;
                  font-weight: bold;
                  color: #4A90E2;
              }
              
              .company-info {
                  text-align: right;
                  font-size: 11px;
              }
              
              .invoice-title {
                  text-align: center;
                  font-size: 24px;
                  font-weight: bold;
                  margin: 20px 0;
              }
              
              .customer-info {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 20px;
                  padding: 0 20px;
                  margin-bottom: 20px;
              }
              
              .info-row {
                  display: flex;
                  justify-content: space-between;
                  margin: 5px 0;
                  border-bottom: 1px solid #ddd;
                  padding-bottom: 2px;
              }
              
              .info-label {
                  font-weight: bold;
                  width: 120px;
              }
              
              .service-details {
                  margin: 20px;
                  border: 1px solid #000;
              }
              
              .service-header {
                  display: grid;
                  grid-template-columns: 2fr 2fr 1fr 1fr;
                  background-color: #f5f5f5;
                  padding: 10px;
                  border-bottom: 1px solid #000;
                  font-weight: bold;
              }
              
              .service-row {
                  display: grid;
                  grid-template-columns: 2fr 2fr 1fr 1fr;
                  padding: 10px;
                  border-bottom: 1px solid #ddd;
              }
              
              .remark-section {
                  margin: 20px;
                  padding: 10px 0;
              }
              
              .totals-section {
                  margin: 20px;
                  float: right;
                  width: 300px;
                  border: 1px solid #000;
              }
              
              .total-row {
                  display: flex;
                  justify-content: space-between;
                  padding: 8px 15px;
                  border-bottom: 1px solid #ddd;
              }
              
              .total-row:last-child {
                  border-bottom: none;
                  font-weight: bold;
              }
              
              .payment-info {
                  clear: both;
                  margin: 20px;
                  border: 1px solid #000;
                  padding: 15px;
                  display: grid;
                  grid-template-columns: 2fr 1fr;
                  gap: 20px;
              }
              
              .signatures {
                  display: flex;
                  justify-content: space-between;
                  margin: 40px 20px;
                  padding-top: 20px;
              }
              
              .signature-section {
                  text-align: center;
                  width: 200px;
              }
              
              .signature-line {
                  border-top: 1px dotted #000;
                  margin: 30px 0 10px 0;
              }
              
              .footer-note {
                  text-align: center;
                  font-style: italic;
                  margin: 20px;
                  font-size: 11px;
              }
              
              .amount {
                  text-align: right;
              }
              
              .thank-you {
                  text-align: center;
                  font-weight: bold;
                  padding: 20px;
                  margin-left: 20px;
              }
          </style>
      </head>
      <body>
          <div class="invoice-container">
              <div class="header">
                  <div class="logo-section">
                      <div class="logo">NCG</div>
                      <div>
                          <div class="company-name">NCG<br>EXPRESS</div>
                      </div>
                  </div>
                  <div class="company-info">
                      <strong>NCG EXPRESS (PRIVATE) LIMITED</strong><br>
                      157/1, Kebellaowita, Wenwellkola, Polgasowita<br>
                      0777556322
                  </div>
              </div>
              
              <div class="invoice-title">INVOICE</div>
              
              <div class="customer-info">
                  <div class="left-column">
                      <div class="info-row">
                          <span class="info-label">Customer Code</span>
                          <span>NCG-${data.invoiceNo.split('-').pop()}</span>
                      </div>
                      <div class="info-row">
                          <span class="info-label">Customer Name</span>
                          <span>${data.customerName}</span>
                      </div>
                      <div class="info-row">
                          <span class="info-label">Branch</span>
                          <span>SHS</span>
                      </div>
                      <div class="info-row">
                          <span class="info-label">Contact Person</span>
                          <span>${data.customerName}</span>
                      </div>
                      <div class="info-row">
                          <span class="info-label">Contact Number</span>
                          <span>${data.customerPhone}</span>
                      </div>
                      <div class="info-row">
                          <span class="info-label">Address</span>
                          <span>${data.companyName || ''}</span>
                      </div>
                      <div class="info-row">
                          <span class="info-label">Mileage</span>
                          <span>${mileage}</span>
                      </div>
                  </div>
                  <div class="right-column">
                      <div class="info-row">
                          <span class="info-label">Invoice No</span>
                          <span>${data.invoiceNo}</span>
                      </div>
                      <div class="info-row">
                          <span class="info-label">Invoice Date</span>
                          <span>${currentDate}</span>
                      </div>
                      <div class="info-row">
                          <span class="info-label">Ref No</span>
                          <span>${data.quotationNo}</span>
                      </div>
                      <div class="info-row">
                          <span class="info-label">Dates of Hire</span>
                          <span>${format(data.pickupDate, 'dd/MM/yyyy')}</span>
                      </div>
                      <div class="info-row">
                          <span class="info-label">Quote No</span>
                          <span>${data.quotationNo}</span>
                      </div>
                      <div class="info-row">
                          <span class="info-label">Bus Type</span>
                          <span>${data.busType}</span>
                      </div>
                  </div>
              </div>
              
              <div class="service-details">
                  <div class="service-header">
                      <div>Description</div>
                      <div>Item Detail</div>
                      <div>Vehicle No</div>
                      <div>Amount</div>
                  </div>
                  <div class="service-row">
                      <div>${data.busType} - Special Hire Service</div>
                      <div>${itemDetail}</div>
                      <div>${data.vehicleNo || 'TBA'}</div>
                      <div class="amount">${subTotal.toLocaleString()}.00</div>
                  </div>
              </div>
              
              <div class="remark-section">
                  <strong>Remark :</strong> &nbsp;&nbsp;&nbsp; ${data.vehicleNo || 'TBA'} ${data.driverName ? `(D) ${data.driverName}` : ''} ${data.conductorName ? `(A) ${data.conductorName}` : ''}
              </div>
              
              <div class="totals-section">
                  <div class="total-row">
                      <span>Sub-Total</span>
                      <span>${subTotal.toLocaleString()}.00</span>
                  </div>
                  <div class="total-row">
                      <span>Discount</span>
                      <span>${discount.toLocaleString()}.00</span>
                  </div>
                  <div class="total-row">
                      <span>Price After Discount</span>
                      <span>${priceAfterDiscount.toLocaleString()}.00</span>
                  </div>
                  <div class="total-row">
                      <span>Advance Payment</span>
                      <span>${previousAdvance.toLocaleString()}.00</span>
                  </div>
                  <div class="total-row">
                      <span>Balance Payment</span>
                      <span>${balancePayment.toLocaleString()}.00</span>
                  </div>
              </div>
              
              <div class="payment-info">
                  <div>
                      <strong>Payment Info :</strong><br>
                      Account No &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; :193414017578<br>
                      Account Name &nbsp;&nbsp;&nbsp;&nbsp; :NCG Express (Pvt) Limited<br>
                      Bank & Branch &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; :Sampath Bank - Nugegoda<br>
                      <strong>Terms & Conditions :</strong><br>
                      1. Cheques are to be drawn in favour of <strong>NCG EXPRESS (PVT) LIMITED</strong> and A/C payee only.
                  </div>
                  <div class="thank-you">
                      Thank you for<br>
                      your business !
                  </div>
              </div>
              
              <div class="signatures">
                  <div class="signature-section">
                      <div class="signature-line"></div>
                      <div>Prepared By</div>
                      <div>${currentDate}</div>
                  </div>
                  <div class="signature-section">
                      <div class="signature-line"></div>
                      <div>Approved By</div>
                      <div>${currentDate}</div>
                  </div>
              </div>
              
              <div class="footer-note">
                  "This is a computer-generated invoice and does not require a physical signature."
              </div>
          </div>
      </body>
      </html>
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
  tempDiv.style.height = 'auto';
  document.body.appendChild(tempDiv);

  try {
    // Convert HTML to canvas with improved settings
    const canvas = await html2canvas(tempDiv.children[0] as HTMLElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 794, // A4 width in pixels at 96 DPI
      height: undefined, // Let it auto-calculate
      scrollX: 0,
      scrollY: 0,
      foreignObjectRendering: true,
      removeContainer: true
    });

    // Create PDF with proper margins
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    const imgData = canvas.toDataURL('image/png', 1.0);
    
    // Add image with no margins for clean edge-to-edge rendering
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    
    return pdf.output('blob');
  } finally {
    // Clean up
    document.body.removeChild(tempDiv);
  }
};