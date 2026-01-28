import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { convertNumberToWords } from './number-to-words';

export interface SinotruckOrderInvoiceData {
  invoice_no: string;
  quotation_no: string;
  invoice_date: string;
  customer_name: string;
  company_name?: string;
  address: string;
  contact?: string;
  attn?: string;
  make: string;
  truck_model: string;
  year_of_manufacture: number;
  country_of_origin: string;
  vehicle_condition: string;
  fuel_type: string;
  engine_capacity?: number;
  color_scheme: string;
  engine_number: string;
  chassis_number: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  total: number;
  invoice_status: 'draft' | 'approved';
  // Invoice category
  invoice_category?: 'direct_invoice' | 'proforma_invoice';
  proforma_amount_percentage?: number;
  proforma_amount?: number;
  finance_company_name?: string;
  finance_company_address?: string;
  proforma_purpose?: string;
  // Payment tracking
  paymentsReceived?: Array<{
    payment_date: string;
    amount: number;
    reference_no?: string;
    payment_method?: string;
  }>;
  totalPaid?: number;
  balanceDue?: number;
  lastPaymentDate?: string;
  // Signatures
  preparedBy?: {
    approver_name: string;
    signature_data?: string;
    approval_date: string;
  };
  approvedBy?: {
    approver_name: string;
    signature_data?: string;
    approval_date: string;
  };
  receivedBy?: {
    approver_name: string;
    signature_data?: string;
    approval_date: string;
  };
}

export function generateSinotruckOrderInvoiceHTML(data: SinotruckOrderInvoiceData): string {
  const isDraft = data.invoice_status === 'draft';
  const isProforma = data.invoice_category === 'proforma_invoice';
  const displayAmount = isProforma && data.proforma_amount ? data.proforma_amount : data.total;
  const amountInWords = convertNumberToWords(displayAmount);
  const invoiceTitle = isProforma ? 'PROFORMA INVOICE' : 'INVOICE';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=1200" />
<title>NCG Holdings - Sinotruck Invoice</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Calibri", "Segoe UI", sans-serif;
    background: #fff;
    color: #000;
    -webkit-print-color-adjust: exact;
  }

  ${isDraft ? `
  .draft-watermark {
    position: absolute;
    top: 45%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-45deg);
    font-size: 100px;
    font-weight: bold;
    color: rgba(255, 0, 0, 0.12);
    z-index: 9999;
    pointer-events: none;
  }
  ` : ''}

  ${isProforma ? `
  .proforma-badge {
    position: absolute;
    top: 120px;
    right: 40px;
    background: linear-gradient(135deg, #dc2626, #b91c1c);
    color: white;
    padding: 10px 25px;
    font-size: 16px;
    font-weight: bold;
    border-radius: 6px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .proforma-info {
    background: #fef2f2;
    border: 2px solid #dc2626;
    border-radius: 8px;
    padding: 16px;
    margin: 20px 40px 0;
  }
  .proforma-info h4 {
    color: #dc2626;
    margin: 0 0 10px 0;
    font-size: 16px;
  }
  .proforma-info p {
    margin: 4px 0;
    font-size: 14px;
    color: #991b1b;
  }
  ` : ''}

  .invoice-container { width: 900px; margin: 0 auto; }
  .page {
    width: 900px;
    min-height: 1270px;
    margin: 0 auto;
    border: 2px solid #dc2626;
    position: relative;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    page-break-after: always;
  }
  .page:last-child { page-break-after: avoid; }
  .page-content { flex: 1; padding: 0; }

  .header-section { width: 100%; margin: 0; padding: 0; }
  .header-image { width: 100%; display: block; }

  .section { padding: 20px 40px 0; }

  .meta { display: flex; justify-content: space-between; flex-wrap: wrap; }
  .meta-left, .meta-right { width: 48%; font-size: 17px; color: #dc2626; }
  .meta-left .row, .meta-right .row { margin: 6px 0; display: flex; justify-content: space-between; }
  .meta-left .label, .meta-right .label { font-weight: 700; }
  .attn { margin-top: 12px; font-weight: 700; color: #dc2626; font-size: 17px; }

  table.invoice-table {
    width: calc(100% - 80px);
    margin: 18px 40px 0;
    border-collapse: collapse;
    border: 2px solid #dc2626;
  }
  table.invoice-table thead th {
    background: #dc2626;
    color: #fff;
    font-size: 18px;
    text-align: center;
    padding: 14px;
    border-right: 1px solid #fff;
  }
  table.invoice-table thead th:last-child { border-right: none; }

  .invoice-body { background: #fef2f2; }
  .invoice-body td { border: 1px solid #dc2626; vertical-align: top; }

  .details-table { width: 100%; border-collapse: collapse; border: 2px solid #dc2626; }
  .details-table td {
    border: 1px solid #dc2626;
    padding: 8px 12px;
    font-size: 16px;
  }
  .details-table td:first-child { width: 45%; font-weight: 700; text-transform: uppercase; }

  .price, .qty, .total {
    text-align: center;
    font-size: 18px;
    font-weight: 700;
    background: #fecaca;
    padding: 14px;
  }

  .bottom-section { display: flex; justify-content: space-between; margin: 20px 40px 0; gap: 25px; }
  .amount-words {
    flex: 1.2;
    background: #fef2f2;
    border: 2px solid #dc2626;
    padding: 18px 20px;
    font-size: 17px;
    font-weight: 700;
    text-transform: uppercase;
  }
  .amount-words span { display: block; margin-top: 8px; font-size: 20px; }

  .totals { flex: 0.8; display: flex; flex-direction: column; }
  .totals-row {
    display: flex;
    border: 2px solid #dc2626;
    background: #fef2f2;
  }
  .totals-row .label {
    flex: 1;
    border-right: 2px solid #dc2626;
    text-align: center;
    font-weight: 700;
    padding: 14px 0;
    font-size: 17px;
  }
  .totals-row .value { width: 200px; text-align: center; font-size: 18px; font-weight: 700; padding: 14px 0; }

  .page-indicator { position: absolute; bottom: 15px; right: 40px; font-size: 12px; color: #666; font-style: italic; }

  /* Page 2 Styles */
  .bank-details { margin: 25px 40px 0; }
  .bank-details h3 {
    margin: 0 0 18px 0;
    color: #dc2626;
    font-size: 18px;
    border-bottom: 2px solid #dc2626;
    padding-bottom: 10px;
  }
  .bank-details table { width: 100%; border-collapse: collapse; }
  .bank-details td { padding: 10px 14px; border-bottom: 1px solid #e0e0e0; font-size: 16px; }
  .bank-details td:first-child { font-weight: 700; color: #dc2626; width: 220px; }

  .payment-history-section { margin: 30px 40px 0; }
  .payment-history-section h3 {
    background: #dc2626;
    color: white;
    padding: 12px 16px;
    margin: 0 0 18px 0;
    border-radius: 4px;
    font-size: 18px;
  }
  .payment-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  .payment-table th {
    background: #fef2f2;
    padding: 12px;
    text-align: left;
    border: 1px solid #dc2626;
    font-weight: 700;
    font-size: 15px;
  }
  .payment-table td { padding: 10px 12px; border: 1px solid #dc2626; background: #f9f9f9; font-size: 15px; }

  .payment-summary {
    width: 100%;
    border-collapse: collapse;
    background: #fef2f2;
    border: 2px solid #dc2626;
  }
  .payment-summary td { padding: 14px 16px; font-weight: 700; border-bottom: 1px solid #dc2626; font-size: 16px; }
  .payment-summary td:last-child { text-align: right; }
  .payment-summary tr:last-child td { border-bottom: none; background: #dc2626; color: white; font-size: 18px; }

  .signature-section { margin: 40px 40px 0; }
  .signature-section h3 {
    margin: 0 0 20px 0;
    color: #dc2626;
    font-size: 18px;
    border-bottom: 2px solid #dc2626;
    padding-bottom: 10px;
  }
  .signature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; }
  .signature-box { text-align: center; }
  .signature-line { border-top: 2px solid #333; padding-top: 10px; margin-top: 80px; font-weight: 700; }
  .signature-name { font-size: 14px; color: #666; margin-top: 5px; }
  .signature-date { font-size: 12px; color: #999; margin-top: 3px; }
  .signature-image { max-height: 70px; max-width: 150px; object-fit: contain; margin-bottom: 10px; }

  .terms-section { margin: 30px 40px 0; }
  .terms-section h3 {
    margin: 0 0 15px 0;
    color: #dc2626;
    font-size: 16px;
  }
  .terms-section ol { margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8; }
  .terms-section li { margin-bottom: 5px; }

  .footer-section {
    margin-top: auto;
    padding: 20px 40px;
    background: #dc2626;
    color: white;
    text-align: center;
    font-size: 14px;
  }
</style>
</head>
<body>
<div class="invoice-container">
  <!-- PAGE 1 -->
  <div class="page">
    ${isDraft ? '<div class="draft-watermark">DRAFT</div>' : ''}
    ${isProforma ? '<div class="proforma-badge">PROFORMA</div>' : ''}
    
    <div class="page-content">
      <div class="header-section">
        <img src="https://ncg-fleetflow.lovable.app/lovable-uploads/c2a8d40e-c5fd-421b-a6b9-43dca02eb90a.png" class="header-image" alt="NCG Holdings Header" />
      </div>

      <div class="section">
        <h2 style="text-align: center; color: #dc2626; margin: 0 0 20px 0; font-size: 24px;">${invoiceTitle}</h2>
        
        <div class="meta">
          <div class="meta-left">
            <div class="row"><span class="label">Invoice No:</span><span>${data.invoice_no}</span></div>
            <div class="row"><span class="label">Date:</span><span>${new Date(data.invoice_date).toLocaleDateString()}</span></div>
            <div class="row"><span class="label">Quotation Ref:</span><span>${data.quotation_no}</span></div>
          </div>
          <div class="meta-right">
            <div class="row"><span class="label">Customer:</span><span>${data.customer_name}</span></div>
            ${data.company_name ? `<div class="row"><span class="label">Company:</span><span>${data.company_name}</span></div>` : ''}
            <div class="row"><span class="label">Address:</span><span>${data.address}</span></div>
            ${data.contact ? `<div class="row"><span class="label">Contact:</span><span>${data.contact}</span></div>` : ''}
          </div>
        </div>
        ${data.attn ? `<div class="attn">Attn: ${data.attn}</div>` : ''}
      </div>

      ${isProforma ? `
      <div class="proforma-info">
        <h4>Proforma Invoice Details</h4>
        <p><strong>Finance Company:</strong> ${data.finance_company_name || 'N/A'}</p>
        ${data.finance_company_address ? `<p><strong>Address:</strong> ${data.finance_company_address}</p>` : ''}
        <p><strong>Amount:</strong> ${data.proforma_amount_percentage}% of Total = LKR ${data.proforma_amount?.toLocaleString()}</p>
        ${data.proforma_purpose ? `<p><strong>Purpose:</strong> ${data.proforma_purpose}</p>` : ''}
      </div>
      ` : ''}

      <table class="invoice-table">
        <thead>
          <tr>
            <th style="width:60%">DESCRIPTION</th>
            <th style="width:15%">UNIT PRICE</th>
            <th style="width:10%">QTY</th>
            <th style="width:15%">TOTAL</th>
          </tr>
        </thead>
        <tbody class="invoice-body">
          <tr>
            <td style="padding:0">
              <table class="details-table">
                <tr><td>MAKE</td><td>${data.make}</td></tr>
                <tr><td>MODEL</td><td>${data.truck_model}</td></tr>
                <tr><td>YEAR OF MANUFACTURE</td><td>${data.year_of_manufacture}</td></tr>
                <tr><td>COUNTRY OF ORIGIN</td><td>${data.country_of_origin}</td></tr>
                <tr><td>VEHICLE CONDITION</td><td>${data.vehicle_condition}</td></tr>
                <tr><td>FUEL TYPE</td><td>${data.fuel_type}</td></tr>
                ${data.engine_capacity ? `<tr><td>ENGINE CAPACITY</td><td>${data.engine_capacity} CC</td></tr>` : ''}
                <tr><td>COLOR SCHEME</td><td>${data.color_scheme}</td></tr>
                <tr><td>ENGINE NUMBER</td><td>${data.engine_number}</td></tr>
                <tr><td>CHASSIS NUMBER</td><td>${data.chassis_number}</td></tr>
              </table>
            </td>
            <td class="price">LKR ${data.unit_price.toLocaleString()}</td>
            <td class="qty">${data.quantity}</td>
            <td class="total">LKR ${data.subtotal.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <div class="bottom-section">
        <div class="amount-words">
          Amount in Words:
          <span>${amountInWords}</span>
        </div>
        <div class="totals">
          <div class="totals-row">
            <div class="label">SUB TOTAL</div>
            <div class="value">LKR ${data.subtotal.toLocaleString()}</div>
          </div>
          <div class="totals-row" style="background:#dc2626; color:white;">
            <div class="label" style="border-color:#fff; color:white;">${isProforma ? 'PROFORMA AMOUNT' : 'TOTAL'}</div>
            <div class="value" style="color:white;">LKR ${displayAmount.toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="page-indicator">Page 1 of 2</div>
  </div>

  <!-- PAGE 2 -->
  <div class="page">
    <div class="page-content">
      <div class="header-section">
        <img src="https://ncg-fleetflow.lovable.app/lovable-uploads/c2a8d40e-c5fd-421b-a6b9-43dca02eb90a.png" class="header-image" alt="NCG Holdings Header" />
      </div>

      <div class="bank-details">
        <h3>BANK DETAILS</h3>
        <table>
          <tr><td>Account Name</td><td>NCG Holdings (Pvt) Ltd</td></tr>
          <tr><td>Bank</td><td>Commercial Bank PLC</td></tr>
          <tr><td>Branch</td><td>Nugegoda</td></tr>
          <tr><td>Account Number</td><td>8720245395</td></tr>
          <tr><td>Swift Code</td><td>CABOROLH</td></tr>
        </table>
      </div>

      ${data.paymentsReceived && data.paymentsReceived.length > 0 ? `
      <div class="payment-history-section">
        <h3>PAYMENT HISTORY</h3>
        <table class="payment-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Reference</th>
              <th>Method</th>
              <th style="text-align:right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${data.paymentsReceived.map((p, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${new Date(p.payment_date).toLocaleDateString()}</td>
                <td>${p.reference_no || '-'}</td>
                <td>${p.payment_method || '-'}</td>
                <td style="text-align:right">LKR ${p.amount.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <table class="payment-summary">
          <tr><td>Invoice Amount</td><td>LKR ${data.total.toLocaleString()}</td></tr>
          <tr><td>Total Paid</td><td>LKR ${(data.totalPaid || 0).toLocaleString()}</td></tr>
          <tr><td>Balance Due</td><td>LKR ${(data.balanceDue || 0).toLocaleString()}</td></tr>
        </table>
      </div>
      ` : ''}

      <div class="signature-section">
        <h3>AUTHORIZED SIGNATURES</h3>
        <div class="signature-grid">
          <div class="signature-box">
            ${data.preparedBy?.signature_data ? `<img src="${data.preparedBy.signature_data}" class="signature-image" />` : ''}
            <div class="signature-line">Prepared By</div>
            ${data.preparedBy ? `
              <div class="signature-name">${data.preparedBy.approver_name}</div>
              <div class="signature-date">${new Date(data.preparedBy.approval_date).toLocaleDateString()}</div>
            ` : ''}
          </div>
          <div class="signature-box">
            ${data.approvedBy?.signature_data ? `<img src="${data.approvedBy.signature_data}" class="signature-image" />` : ''}
            <div class="signature-line">Approved By</div>
            ${data.approvedBy ? `
              <div class="signature-name">${data.approvedBy.approver_name}</div>
              <div class="signature-date">${new Date(data.approvedBy.approval_date).toLocaleDateString()}</div>
            ` : ''}
          </div>
          <div class="signature-box">
            ${data.receivedBy?.signature_data ? `<img src="${data.receivedBy.signature_data}" class="signature-image" />` : ''}
            <div class="signature-line">Received By</div>
            ${data.receivedBy ? `
              <div class="signature-name">${data.receivedBy.approver_name}</div>
              <div class="signature-date">${new Date(data.receivedBy.approval_date).toLocaleDateString()}</div>
            ` : ''}
          </div>
        </div>
      </div>

      <div class="terms-section">
        <h3>TERMS AND CONDITIONS</h3>
        <ol>
          <li>This invoice is valid for 30 days from the date of issue.</li>
          <li>Payment must be made in full before vehicle delivery.</li>
          <li>All prices are in Sri Lankan Rupees (LKR) and inclusive of applicable taxes.</li>
          <li>Vehicle specifications may vary based on availability.</li>
          <li>Warranty terms are as per manufacturer guidelines.</li>
          <li>NCG Holdings reserves the right to cancel orders for non-payment.</li>
          <li>Customer is responsible for registration and insurance costs.</li>
          <li>Delivery timelines are estimates and subject to availability.</li>
          <li>Any disputes shall be resolved under Sri Lankan jurisdiction.</li>
        </ol>
      </div>
    </div>

    <div class="footer-section">
      <p>NCG Holdings (Pvt) Ltd | Sinotruck Authorized Dealer | Tel: +94 11 234 5678 | info@ncgholdings.lk</p>
    </div>
    <div class="page-indicator">Page 2 of 2</div>
  </div>
</div>
</body>
</html>`;
}

export async function generateSinotruckOrderInvoicePDF(data: SinotruckOrderInvoiceData): Promise<Blob> {
  // Create a hidden container for rendering
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = '900px';
  document.body.appendChild(container);

  // Generate HTML and insert into container
  const html = generateSinotruckOrderInvoiceHTML(data);
  container.innerHTML = html;

  // Wait for images to load
  const images = container.querySelectorAll('img');
  await Promise.all(
    Array.from(images).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
          } else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        })
    )
  );

  // Get all pages
  const pages = container.querySelectorAll('.page');
  const pdf = new jsPDF('p', 'mm', 'a4');

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i] as HTMLElement;

    const canvas = await html2canvas(page, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      width: 900,
      height: 1270,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pageWidth = 210;
    const pageHeight = 297;

    if (i > 0) {
      pdf.addPage();
    }

    pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
  }

  // Clean up
  document.body.removeChild(container);

  return pdf.output('blob');
}
