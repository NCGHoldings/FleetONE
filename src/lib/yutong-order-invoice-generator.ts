import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { convertNumberToWords } from './number-to-words';

export interface YutongOrderInvoiceData {
  invoice_no: string;
  quotation_no: string;
  invoice_date: string;
  customer_name: string;
  company_name?: string;
  address: string;
  contact?: string;
  attn?: string;
  make: string;
  bus_model: string;
  seating_capacity: string;
  year_of_manufacture: number;
  country_of_origin: string;
  vehicle_condition: string;
  fuel_type: string;
  engine_capacity: number;
  color_scheme: string;
  engine_number: string;
  chassis_number: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  total: number;
  invoice_status: 'draft' | 'approved';
  // Payment tracking
  paymentsReceived?: Array<{
    payment_date: string;
    amount: number;
    reference_no?: string;
    payment_method?: string;
    verified_by?: string;
    verified_at?: string;
  }>;
  totalPaid?: number;
  balanceDue?: number;
  lastPaymentDate?: string;
  preparedBy?: {
    approver_name: string;
    signature_data?: string;
    signature_type?: 'text' | 'drawing' | 'image';
    approval_date: string;
  };
  approvedBy?: {
    approver_name: string;
    signature_data?: string;
    signature_type?: 'text' | 'drawing' | 'image';
    approval_date: string;
  };
  receivedBy?: {
    approver_name: string;
    signature_data?: string;
    signature_type?: 'text' | 'drawing' | 'image';
    approval_date: string;
  };
}

export function generateYutongOrderInvoiceHTML(data: YutongOrderInvoiceData): string {
  const isDraft = data.invoice_status === 'draft';
  const amountInWords = convertNumberToWords(data.total);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=1200" />
<title>NCG Holdings - Invoice</title>
<style>
  * {
    box-sizing: border-box;
  }

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
    user-select: none;
  }
  ` : ''}

  .invoice-container {
    width: 900px;
    margin: 0 auto;
  }

  .page {
    width: 900px;
    min-height: 1270px;
    margin: 0 auto;
    box-sizing: border-box;
    border: 2px solid #0b2f66;
    position: relative;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    page-break-after: always;
    page-break-inside: avoid;
  }

  .page:last-child {
    page-break-after: avoid;
  }

  .page-content {
    flex: 1;
    padding: 0;
  }

  .header-section {
    width: 100%;
    margin: 0;
    padding: 0;
  }
  
  .header-image {
    width: 100%;
    display: block;
  }

  .section {
    padding: 20px 40px 0;
  }

  .meta {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .meta-left, .meta-right {
    width: 48%;
    font-size: 17px;
    color: #0b2f66;
  }

  .meta-left .row, .meta-right .row {
    margin: 6px 0;
    display: flex;
    justify-content: space-between;
  }

  .meta-left .label, .meta-right .label {
    font-weight: 700;
  }

  .attn {
    margin-top: 12px;
    font-weight: 700;
    color: #0b2f66;
    font-size: 17px;
  }

  table.invoice-table {
    width: calc(100% - 80px);
    margin: 18px 40px 0;
    border-collapse: collapse;
    border: 2px solid #0b2f66;
  }

  table.invoice-table thead th {
    background: #0b2f66;
    color: #fff;
    font-size: 18px;
    text-align: center;
    padding: 14px;
    border-right: 1px solid #fff;
  }

  table.invoice-table thead th:last-child {
    border-right: none;
  }

  .invoice-body {
    background: #e8f6ff;
  }

  .invoice-body td {
    border: 1px solid #0b2f66;
    vertical-align: top;
  }

  .details-table {
    width: 100%;
    border-collapse: collapse;
    border: 2px solid #0b2f66;
  }

  .details-table td {
    border: 1px solid #0b2f66;
    padding: 8px 12px;
    font-size: 16px;
    box-sizing: border-box;
  }

  .details-table tr td {
    border-right: 1px solid #0b2f66;
    border-bottom: 1px solid #0b2f66;
  }

  .details-table tr:last-child td {
    border-bottom: 2px solid #0b2f66;
  }

  .details-table tr td:last-child {
    border-right: 2px solid #0b2f66;
  }

  .details-table td:first-child {
    width: 45%;
    font-weight: 700;
    text-transform: uppercase;
  }

  .price, .qty, .total {
    text-align: center;
    font-size: 18px;
    font-weight: 700;
    background: #d6eefc;
    padding: 14px;
  }

  .bottom-section {
    display: flex;
    justify-content: space-between;
    margin: 20px 40px 0;
    gap: 25px;
  }

  .amount-words {
    flex: 1.2;
    background: #e8f6ff;
    border: 2px solid #0b2f66;
    padding: 18px 20px;
    font-size: 17px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .amount-words span {
    display: block;
    margin-top: 8px;
    font-size: 20px;
  }

  .totals {
    flex: 0.8;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .totals-row {
    display: flex;
    border: 2px solid #0b2f66;
    background: #e8f6ff;
  }

  .totals-row .label {
    flex: 1;
    border-right: 2px solid #0b2f66;
    text-align: center;
    font-weight: 700;
    padding: 14px 0;
    font-size: 17px;
  }

  .totals-row .value {
    width: 200px;
    text-align: center;
    font-size: 18px;
    font-weight: 700;
    padding: 14px 0;
  }

  .page-indicator {
    position: absolute;
    bottom: 15px;
    right: 40px;
    font-size: 12px;
    color: #666;
    font-style: italic;
  }

  /* Page 2 Styles */
  .bank-details {
    margin: 25px 40px 0;
    padding: 0;
  }

  .bank-details h3 {
    margin: 0 0 18px 0;
    color: #0b2f66;
    font-size: 18px;
    border-bottom: 2px solid #0b2f66;
    padding-bottom: 10px;
  }

  .bank-details table {
    width: 100%;
    border-collapse: collapse;
  }

  .bank-details td {
    padding: 10px 14px;
    border: none;
    border-bottom: 1px solid #e0e0e0;
    font-size: 16px;
  }

  .bank-details td:first-child {
    font-weight: 700;
    color: #0b2f66;
    width: 220px;
  }

  .bank-details tr:last-child td {
    border-bottom: none;
  }

  .payment-history-section {
    margin: 30px 40px 0;
  }

  .payment-history-section h3 {
    background: #0b2f66;
    color: white;
    padding: 12px 16px;
    margin: 0 0 18px 0;
    border-radius: 4px;
    font-size: 18px;
  }

  .payment-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
  }

  .payment-table th {
    background: #e8f6ff;
    padding: 12px;
    text-align: left;
    border: 1px solid #0b2f66;
    font-weight: 700;
    font-size: 15px;
  }

  .payment-table th:last-child {
    text-align: center;
  }

  .payment-table th:nth-child(4) {
    text-align: right;
  }

  .payment-table td {
    padding: 10px 12px;
    border: 1px solid #0b2f66;
    background: #f9f9f9;
    font-size: 15px;
  }

  .payment-table td:nth-child(4) {
    text-align: right;
    font-weight: 600;
  }

  .payment-table td:last-child {
    text-align: center;
  }

  .payment-summary {
    width: 100%;
    border-collapse: collapse;
    background: #e8f6ff;
    border: 2px solid #0b2f66;
  }

  .payment-summary td {
    padding: 14px 16px;
    font-weight: 700;
    border-bottom: 1px solid #0b2f66;
    font-size: 16px;
  }

  .payment-summary td:last-child {
    text-align: right;
  }

  .payment-summary tr:last-child td {
    border-bottom: none;
    background: #0b2f66;
    color: white;
    font-size: 18px;
  }

  .payment-summary .balance-value {
    color: #fbbf24;
  }

  .payment-status-pending {
    background: #fef3c7;
    border: 2px solid #f59e0b;
    padding: 25px;
    border-radius: 8px;
    margin: 25px 40px 0;
  }

  .payment-status-pending h3 {
    color: #92400e;
    margin: 0 0 15px 0;
    font-size: 18px;
  }

  .payment-status-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 18px;
  }

  .payment-status-label {
    font-weight: 700;
    color: #78350f;
    font-size: 17px;
  }

  .payment-status-value {
    font-weight: 700;
    color: #dc2626;
    font-size: 24px;
  }

  .payment-status-note {
    margin: 18px 0 0 0;
    font-size: 14px;
    color: #92400e;
  }

  .signatures-section {
    margin: 35px 40px 0;
    padding: 0;
  }

  .signatures-section h3 {
    margin: 0 0 25px 0;
    color: #0b2f66;
    font-size: 18px;
    text-align: center;
    border-bottom: 2px solid #0b2f66;
    padding-bottom: 12px;
  }

  .signatures-grid {
    display: flex;
    justify-content: space-between;
    gap: 50px;
  }

  .signature-box {
    flex: 1;
    text-align: center;
    padding: 20px 0;
    border: none;
    border-radius: 0;
    background: transparent;
  }

  .signature-box .title {
    font-weight: 700;
    font-size: 15px;
    color: #0b2f66;
    margin-bottom: 12px;
    border-bottom: 1px solid #0b2f66;
    padding-bottom: 6px;
  }

  .signature-box .name {
    font-size: 14px;
    margin: 10px 0;
  }

  .signature-box .date {
    font-size: 13px;
    color: #666;
    margin: 6px 0;
  }

  .signature-image {
    max-width: 160px;
    max-height: 65px;
    margin: 12px auto;
    display: block;
  }

  .signature-line {
    height: 65px;
    border-bottom: 1px solid #333;
    margin: 12px 25px;
  }

  .footer {
    margin: 40px 40px 0;
    padding: 22px 25px;
    background: #0b2f66;
    color: white;
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .footer-item {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 14px;
  }

  .footer-item .icon {
    font-weight: 700;
    font-size: 18px;
  }

  .page-spacer {
    height: 30px;
  }

  @media print {
    body { margin: 0; }
    .page { width: 100%; box-shadow: none; }
  }
</style>
</head>
<body>
<div class="invoice-container">
  <!-- PAGE 1: Product & Pricing Information -->
  <div class="page">
    ${isDraft ? '<div class="draft-watermark">DRAFT</div>' : ''}
    <div class="page-content">
      <div class="header-section">
        <img src="/lovable-uploads/yutong-invoice-header.png" alt="Invoice Header" class="header-image">
      </div>

      <div class="section">
        <div class="meta">
          <div class="meta-left">
            <div class="row"><span class="label">CUSTOMER :</span><span>${data.customer_name}</span></div>
            <div class="row"><span class="label">COMPANY :</span><span>${data.company_name || ''}</span></div>
            <div class="row"><span class="label">ADDRESS :</span><span>${data.address}</span></div>
            <div class="row"><span class="label">CONTACT :</span><span>${data.contact || ''}</span></div>
            <div class="row"><span class="label">DATE :</span><span>${data.invoice_date}</span></div>
          </div>
          <div class="meta-right">
            <div class="row"><span class="label">INVOICE NO :</span><span>${data.invoice_no}</span></div>
            <div class="row"><span class="label">QUOTATION NO :</span><span>${data.quotation_no}</span></div>
          </div>
        </div>
        <div class="attn">${data.attn ? 'ATTN : ' + data.attn : 'ATTN :'}</div>
      </div>

      <table class="invoice-table">
        <thead>
          <tr>
            <th style="width:55%;">PRODUCT</th>
            <th style="width:20%;">UNIT PRICE</th>
            <th style="width:10%;">QTY</th>
            <th style="width:15%;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          <tr class="invoice-body">
            <td>
              <table class="details-table">
                <tr><td>MAKE</td><td>${data.make}</td></tr>
                <tr><td>BUS MODEL</td><td>${data.bus_model}</td></tr>
                <tr><td>SEATING CAPACITY</td><td>${data.seating_capacity}</td></tr>
                <tr><td>YEAR OF MANUFACTURE</td><td>${data.year_of_manufacture}</td></tr>
                <tr><td>COUNTRY OF ORIGIN</td><td>${data.country_of_origin}</td></tr>
                <tr><td>CONDITION</td><td>${data.vehicle_condition}</td></tr>
                <tr><td>FUEL TYPE</td><td>${data.fuel_type}</td></tr>
                <tr><td>ENGINE CAPACITY</td><td>${data.engine_capacity}</td></tr>
                <tr><td>COLOUR</td><td>${data.color_scheme}</td></tr>
                <tr><td>ENGINE NO</td><td>${data.engine_number}</td></tr>
                <tr><td>CHASIS NO</td><td>${data.chassis_number}</td></tr>
              </table>
            </td>
            <td class="price">${data.unit_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td class="qty">${data.quantity}</td>
            <td class="total">${data.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>

      <div class="bottom-section">
        <div class="amount-words">
          AMOUNT IN WORD
          <span>${amountInWords}</span>
        </div>
        <div class="totals">
          <div class="totals-row">
            <div class="label">SUBTOTAL</div>
            <div class="value">${data.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="totals-row">
            <div class="label">TOTAL</div>
            <div class="value">${data.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="page-indicator">Page 1 of 2</div>
  </div>

  <!-- PAGE 2: Bank Details, Payments, Signatures & Footer -->
  <div class="page">
    ${isDraft ? '<div class="draft-watermark">DRAFT</div>' : ''}
    <div class="page-content">
      <div class="header-section">
        <img src="/lovable-uploads/yutong-invoice-header.png" alt="Invoice Header" class="header-image">
      </div>

      <div class="page-spacer"></div>

      <!-- Bank Details -->
      <div class="bank-details">
        <h3>Payment Terms : Payment method - by Cheque or bank transfer</h3>
        <table>
          <tr>
            <td>ACCOUNT NAME</td>
            <td>NCG HOLDINGS (PRIVATE) LIMITED</td>
          </tr>
          <tr>
            <td>ACCOUNT NUMBER</td>
            <td>000310032026</td>
          </tr>
          <tr>
            <td>BANK / BRANCH</td>
            <td>SAMPATH BANK NUGEGODA</td>
          </tr>
        </table>
      </div>

      ${data.paymentsReceived && data.paymentsReceived.length > 0 ? `
      <!-- Payment History Section -->
      <div class="payment-history-section">
        <h3>Payment History</h3>
        <table class="payment-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Reference</th>
              <th>Method</th>
              <th>Amount (LKR)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.paymentsReceived.map(payment => `
              <tr>
                <td>${new Date(payment.payment_date).toLocaleDateString('en-GB')}</td>
                <td>${payment.reference_no || '-'}</td>
                <td style="text-transform: capitalize;">${payment.payment_method?.replace('_', ' ') || '-'}</td>
                <td>${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td>
                  <span style="background: #10b981; color: white; padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: 600;">VERIFIED</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <table class="payment-summary">
          <tr>
            <td>Invoice Total:</td>
            <td>LKR ${data.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr style="color: #10b981;">
            <td>Total Paid:</td>
            <td>(LKR ${(data.totalPaid || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })})</td>
          </tr>
          <tr>
            <td>Balance Due:</td>
            <td class="balance-value">LKR ${(data.balanceDue || data.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          </tr>
        </table>
      </div>
      ` : `
      <!-- Payment Status (No Payments) -->
      <div class="payment-status-pending">
        <h3>Payment Status</h3>
        <div class="payment-status-row">
          <span class="payment-status-label">Total Amount Due:</span>
          <span class="payment-status-value">LKR ${data.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        <p class="payment-status-note">No payments received yet. Please make payment as per the terms above.</p>
      </div>
      `}

      <!-- Signatures Section -->
      <div class="signatures-section">
        <h3>Approvals & Signature</h3>
        <div class="signatures-grid">
          <div class="signature-box">
            <div class="title">Prepared By</div>
            ${data.preparedBy ? `
              <div class="name">${data.preparedBy.approver_name}</div>
              <div class="date">${new Date(data.preparedBy.approval_date).toLocaleDateString('en-GB')}</div>
              ${data.preparedBy.signature_data ? 
                data.preparedBy.signature_type === 'text' 
                  ? `<div style="font-family: 'Brush Script MT', cursive; font-size: 26px; font-style: italic; padding: 12px 0;">${data.preparedBy.signature_data}</div>` 
                  : `<img src="${data.preparedBy.signature_data}" alt="Signature" class="signature-image">`
                : '<div class="signature-line"></div>'}
            ` : `
              <div class="name">_________________</div>
              <div class="date">_________________</div>
              <div class="signature-line"></div>
            `}
          </div>
          
          <div class="signature-box">
            <div class="title">Approved By</div>
            ${data.approvedBy ? `
              <div class="name">${data.approvedBy.approver_name}</div>
              <div class="date">${new Date(data.approvedBy.approval_date).toLocaleDateString('en-GB')}</div>
              ${data.approvedBy.signature_data ? 
                data.approvedBy.signature_type === 'text' 
                  ? `<div style="font-family: 'Brush Script MT', cursive; font-size: 26px; font-style: italic; padding: 12px 0;">${data.approvedBy.signature_data}</div>` 
                  : `<img src="${data.approvedBy.signature_data}" alt="Signature" class="signature-image">`
                : '<div class="signature-line"></div>'}
            ` : `
              <div class="name">_________________</div>
              <div class="date">_________________</div>
              <div class="signature-line"></div>
            `}
          </div>
          
          <div class="signature-box">
            <div class="title">Customer</div>
            ${data.receivedBy ? `
              <div class="name">${data.receivedBy.approver_name}</div>
              <div class="date">${new Date(data.receivedBy.approval_date).toLocaleDateString('en-GB')}</div>
              ${data.receivedBy.signature_data ? 
                data.receivedBy.signature_type === 'text' 
                  ? `<div style="font-family: 'Brush Script MT', cursive; font-size: 26px; font-style: italic; padding: 12px 0;">${data.receivedBy.signature_data}</div>` 
                  : `<img src="${data.receivedBy.signature_data}" alt="Signature" class="signature-image">`
                : '<div class="signature-line"></div>'}
            ` : `
              <div class="name">_________________</div>
              <div class="date">_________________</div>
              <div class="signature-line"></div>
            `}
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <div class="footer-item">
          <span class="icon">📞</span>
          <span>0770455981</span>
        </div>
        <div class="footer-item">
          <span class="icon">📍</span>
          <span>157 Y, Kabellawita, Weniweikola, Polgasowita</span>
        </div>
        <div class="footer-item">
          <span class="icon">✉️</span>
          <span>yutong@ncg.lk</span>
        </div>
      </div>
    </div>
    <div class="page-indicator">Page 2 of 2</div>
  </div>
</div>
</body>
</html>`;
}

async function loadImageAsBase64(url: string): Promise<string> {
  try {
    console.log('🖼️ Loading image:', url);
    const response = await fetch(url);
    if (!response.ok) {
      console.warn('⚠️ Failed to load image:', url);
      return '';
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('❌ Error loading image:', url, error);
    return '';
  }
}

export async function generateYutongOrderInvoicePDF(data: YutongOrderInvoiceData): Promise<Blob> {
  console.log('📄 Starting PDF generation for invoice:', data.invoice_no);
  
  // Pre-load header image as base64
  console.log('🖼️ Loading header image...');
  const headerImage = await loadImageAsBase64('/lovable-uploads/yutong-invoice-header.png');
  
  if (!headerImage) {
    console.warn('⚠️ Header image failed to load, proceeding anyway...');
  }
  
  const htmlContent = generateYutongOrderInvoiceHTML(data);
  
  // Replace image URL with base64 data
  const htmlWithEmbeddedImages = htmlContent
    .replace(/\/lovable-uploads\/yutong-invoice-header\.png/g, headerImage || '/lovable-uploads/yutong-invoice-header.png');
  
  const container = document.createElement('div');
  container.innerHTML = htmlWithEmbeddedImages;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  document.body.appendChild(container);

  try {
    // Find all pages
    const pages = container.querySelectorAll('.page');
    console.log('📄 Found', pages.length, 'pages to render');
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i] as HTMLElement;
      
      console.log(`🎨 Rendering page ${i + 1}...`);
      const canvas = await html2canvas(page, {
        scale: 2.5, // Higher quality rendering
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 900,
        windowWidth: 900
      });
      
      console.log(`✅ Page ${i + 1} canvas rendered. Size:`, canvas.width, 'x', canvas.height);

      // Use JPEG with higher quality for professional output
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      
      // Calculate center position for proper alignment
      const scaledWidth = imgWidth * ratio;
      const scaledHeight = imgHeight * ratio;
      const imgX = (pdfWidth - scaledWidth) / 2; // Center horizontally
      const imgY = 0; // Start from top
      
      if (i > 0) {
        pdf.addPage();
      }
      
      pdf.addImage(imgData, 'JPEG', imgX, imgY, scaledWidth, scaledHeight);
      console.log(`📊 Page ${i + 1} added to PDF`);
    }
    
    const blob = pdf.output('blob');
    console.log('✅ PDF generated successfully. Blob size:', blob.size, 'bytes');
    return blob;
  } catch (error) {
    console.error('❌ PDF generation failed:', error);
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    document.body.removeChild(container);
    console.log('🧹 Cleaned up temporary DOM elements');
  }
}
