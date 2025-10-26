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

  .header-bar {
    background: #0b2f66;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 22px 30px;
    border-bottom: 5px solid #004080;
  }
  .header-bar .title {
    font-size: 62px;
    font-weight: 700;
    letter-spacing: 1.5px;
  }
  .header-bar .logos {
    display: flex;
    gap: 28px;
    align-items: center;
  }
  .header-bar .logos img {
    height: 70px;
    object-fit: contain;
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

  @media print {
    body { margin: 0; }
    .invoice-page { width: 100%; box-shadow: none; border: none; }
  }
</style>
</head>
<body>
${isDraft ? '<div class="draft-watermark">DRAFT</div>' : ''}
<div class="invoice-page">
  <div class="header-bar">
    <div class="title">INVOICE</div>
    <div class="logos">
      <img src="/lovable-uploads/3a890245-ca01-4bcf-b6a0-346e06befe92.png" alt="NCG Holdings">
      <img src="/lovable-uploads/3c2cd2f4-030c-4441-bdcb-066c22aa3dfa.png" alt="Yutong">
    </div>
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
  
  // Pre-load images as base64
  console.log('🖼️ Loading logo images...');
  const [ncgLogo, yutongLogo] = await Promise.all([
    loadImageAsBase64('/lovable-uploads/3a890245-ca01-4bcf-b6a0-346e06befe92.png'),
    loadImageAsBase64('/lovable-uploads/3c2cd2f4-030c-4441-bdcb-066c22aa3dfa.png')
  ]);
  
  if (!ncgLogo || !yutongLogo) {
    console.warn('⚠️ Some logos failed to load, proceeding anyway...');
  }
  
  const htmlContent = generateYutongOrderInvoiceHTML(data);
  
  // Replace image URLs with base64 data
  const htmlWithEmbeddedImages = htmlContent
    .replace('/lovable-uploads/3a890245-ca01-4bcf-b6a0-346e06befe92.png', ncgLogo || '/lovable-uploads/3a890245-ca01-4bcf-b6a0-346e06befe92.png')
    .replace('/lovable-uploads/3c2cd2f4-030c-4441-bdcb-066c22aa3dfa.png', yutongLogo || '/lovable-uploads/3c2cd2f4-030c-4441-bdcb-066c22aa3dfa.png');
  
  const container = document.createElement('div');
  container.innerHTML = htmlWithEmbeddedImages;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  document.body.appendChild(container);

  try {
    console.log('🎨 Rendering HTML to canvas...');
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: true
    });
    
    console.log('✅ Canvas rendered. Size:', canvas.width, 'x', canvas.height);

    const imgData = canvas.toDataURL('image/png');
    console.log('🖼️ Converting canvas to image data...');
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    
    console.log('📊 PDF dimensions:', { pdfWidth, pdfHeight, imgWidth, imgHeight, ratio });
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth * ratio, imgHeight * ratio);
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
