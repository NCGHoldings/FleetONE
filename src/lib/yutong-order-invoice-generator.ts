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
  body {
    margin: 0;
    font-family: "Calibri", "Segoe UI", sans-serif;
    background: #fff;
    color: #000;
    -webkit-print-color-adjust: exact;
  }

  ${isDraft ? `
  .draft-watermark {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-45deg);
    font-size: 120px;
    font-weight: bold;
    color: rgba(255, 0, 0, 0.15);
    z-index: 9999;
    pointer-events: none;
    user-select: none;
  }
  ` : ''}

  .invoice-page {
    width: 1080px;
    margin: 30px auto;
    box-sizing: border-box;
    border: 2px solid #0b2f66;
    box-shadow: 0 0 8px rgba(0,0,0,0.1);
    padding-bottom: 30px;
    position: relative;
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
    padding: 18px 35px 0;
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
    margin: 5px 0;
    display: flex;
    justify-content: space-between;
  }

  .meta-left .label, .meta-right .label {
    font-weight: 700;
  }

  .attn {
    margin-top: 10px;
    font-weight: 700;
    color: #0b2f66;
  }

  table.invoice-table {
    width: calc(100% - 70px);
    margin: 15px 35px 0;
    border-collapse: collapse;
    border: 2px solid #0b2f66;
  }

  table.invoice-table thead th {
    background: #0b2f66;
    color: #fff;
    font-size: 18px;
    text-align: center;
    padding: 12px;
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
  }

  .details-table td {
    border: 1px solid #0b2f66;
    padding: 7px 10px;
    font-size: 16px;
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
    padding: 12px;
  }

  .bottom-section {
    display: flex;
    justify-content: space-between;
    margin: 15px 35px 0;
    gap: 20px;
  }

  .amount-words {
    flex: 1.2;
    background: #e8f6ff;
    border: 2px solid #0b2f66;
    padding: 15px 18px;
    font-size: 17px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .amount-words span {
    display: block;
    margin-top: 6px;
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
    padding: 12px 0;
    font-size: 17px;
  }

  .totals-row .value {
    width: 180px;
    text-align: center;
    font-size: 18px;
    font-weight: 700;
    padding: 12px 0;
  }

  .bank-details {
    margin: 30px 35px 0;
    padding: 20px 0;
  }

  .bank-details h3 {
    margin: 0 0 15px 0;
    color: #0b2f66;
    font-size: 18px;
    border-bottom: 2px solid #0b2f66;
    padding-bottom: 8px;
  }

  .bank-details table {
    width: 100%;
    border-collapse: collapse;
  }

  .bank-details td {
    padding: 8px 12px;
    border: none;
    border-bottom: 1px solid #e0e0e0;
  }

  .bank-details td:first-child {
    font-weight: 700;
    color: #0b2f66;
    width: 200px;
  }

  .bank-details tr:last-child td {
    border-bottom: none;
  }

  .signatures-section {
    margin: 30px 35px 0;
    padding: 20px 0;
  }

  .signatures-section h3 {
    margin: 0 0 20px 0;
    color: #0b2f66;
    font-size: 18px;
    text-align: center;
    border-bottom: 2px solid #0b2f66;
    padding-bottom: 10px;
  }

  .signatures-grid {
    display: flex;
    justify-content: space-between;
    gap: 40px;
  }

  .signature-box {
    flex: 1;
    text-align: center;
    padding: 15px 0;
    border: none;
    border-radius: 0;
    background: transparent;
  }

  .signature-box .title {
    font-weight: 700;
    font-size: 14px;
    color: #0b2f66;
    margin-bottom: 10px;
    border-bottom: 1px solid #0b2f66;
    padding-bottom: 5px;
  }

  .signature-box .name {
    font-size: 13px;
    margin: 8px 0;
  }

  .signature-box .date {
    font-size: 12px;
    color: #666;
    margin: 5px 0;
  }

  .signature-image {
    max-width: 150px;
    max-height: 60px;
    margin: 10px 0;
    display: block;
    margin-left: auto;
    margin-right: auto;
  }

  .signature-line {
    height: 60px;
    border-bottom: 1px solid #333;
    margin: 10px 20px;
  }

  .footer {
    margin: 40px 35px 0;
    padding: 20px;
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
    gap: 10px;
    font-size: 13px;
  }

  .footer-item .icon {
    font-weight: 700;
    font-size: 16px;
  }

  @media print {
    body { margin: 0; }
    .invoice-page { width: 100%; box-shadow: none; border: none; }
  }
</style>
</head>
<body>
${isDraft ? '<div class="draft-watermark">DRAFT</div>' : ''}
<div class="invoice-page">
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
            <tr><td>YEAR OF</td><td>${data.year_of_manufacture}</td></tr>
            <tr><td>COUNTRY OF</td><td>${data.country_of_origin}</td></tr>
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

  <!-- Signatures Section -->
  <div class="signatures-section">
    <h3>Approvals & Signature</h3>
    <div class="signatures-grid">
      <div class="signature-box">
        <div class="title">Prepared By</div>
        ${data.preparedBy ? `
          <div class="name">${data.preparedBy.approver_name}</div>
          <div class="date">${new Date(data.preparedBy.approval_date).toLocaleDateString('en-GB')}</div>
          ${data.preparedBy.signature_data ? `<img src="${data.preparedBy.signature_data}" alt="Signature" class="signature-image">` : '<div class="signature-line"></div>'}
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
          ${data.approvedBy.signature_data ? `<img src="${data.approvedBy.signature_data}" alt="Signature" class="signature-image">` : '<div class="signature-line"></div>'}
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
          ${data.receivedBy.signature_data ? `<img src="${data.receivedBy.signature_data}" alt="Signature" class="signature-image">` : '<div class="signature-line"></div>'}
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
    .replace('/lovable-uploads/yutong-invoice-header.png', headerImage || '/lovable-uploads/yutong-invoice-header.png');
  
  const container = document.createElement('div');
  container.innerHTML = htmlWithEmbeddedImages;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  document.body.appendChild(container);

  try {
    console.log('🎨 Rendering HTML to canvas...');
    const canvas = await html2canvas(container, {
      scale: 1.5, // Reduced from 2 to optimize file size
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false // Disable verbose logging
    });
    
    console.log('✅ Canvas rendered. Size:', canvas.width, 'x', canvas.height);

    // Use JPEG with compression for smaller file size
    const imgData = canvas.toDataURL('image/jpeg', 0.85); // 85% quality
    console.log('🖼️ Converting canvas to image data...');
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    
    console.log('📊 PDF dimensions:', { pdfWidth, pdfHeight, imgWidth, imgHeight, ratio });
    
    pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth * ratio, imgHeight * ratio);
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
