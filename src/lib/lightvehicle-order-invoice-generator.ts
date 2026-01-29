import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface LightVehicleOrderInvoiceData {
  invoiceNo?: string;
  orderId: string;
  orderNo: string;
  quotationId?: string;
  quotationNo?: string;
  invoiceDate?: string;
  
  // Customer Details
  customerName: string;
  customerAddress?: string;
  customerPhone?: string;
  customerEmail?: string;
  
  // Vehicle Details
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear?: string;
  vehicleColor?: string;
  engineNumber?: string;
  chassisNumber?: string;
  engineCapacity?: string;
  transmission?: string;
  fuelType?: string;
  mileage?: string;
  vehicleCondition?: string;
  
  // Pricing
  unitPrice: number;
  quantity: number;
  totalAmount: number;
  amountPaid?: number;
  balanceDue?: number;
  
  // Proforma fields
  invoiceCategory?: string;
  proformaPercentage?: number;
  proformaAmount?: number;
  financeCompanyName?: string;
  financeCompanyAddress?: string;
  proformaPurpose?: string;
  
  // Signatures
  signatures?: {
    preparedBy?: { name: string; signature: string; date: string };
    approvedBy?: { name: string; signature: string; date: string };
    receivedBy?: { name: string; signature: string; date: string };
  };
  
  // Company Info
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyLogo?: string;
}

export function generateLightVehicleOrderInvoiceHTML(data: LightVehicleOrderInvoiceData): string {
  const isProforma = data.invoiceCategory === 'proforma_invoice';
  const displayAmount = isProforma && data.proformaAmount ? data.proformaAmount : data.totalAmount;
  const invoiceTitle = isProforma ? 'PROFORMA INVOICE' : 'TAX INVOICE';
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Arial, sans-serif; 
          font-size: 11px; 
          line-height: 1.4;
          color: #1a1a1a;
          background: white;
        }
        .invoice-container { 
          max-width: 800px; 
          margin: 0 auto; 
          padding: 30px;
          background: white;
        }
        .header { 
          display: flex; 
          justify-content: space-between; 
          align-items: flex-start;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 20px;
          margin-bottom: 25px;
        }
        .company-info h1 { 
          font-size: 26px; 
          color: #2563eb;
          font-weight: 700;
          margin-bottom: 5px;
        }
        .company-info p { 
          color: #6b7280; 
          font-size: 10px;
          line-height: 1.5;
        }
        .invoice-title { 
          text-align: right;
        }
        .invoice-title h2 { 
          font-size: 24px; 
          color: ${isProforma ? '#d97706' : '#2563eb'};
          font-weight: 700;
          margin-bottom: 10px;
        }
        .invoice-meta { font-size: 11px; color: #4b5563; }
        .invoice-meta strong { color: #1f2937; }
        
        .billing-section { 
          display: flex; 
          gap: 40px;
          margin-bottom: 25px;
        }
        .billing-box { 
          flex: 1;
          background: #f8fafc;
          padding: 15px;
          border-radius: 8px;
          border-left: 4px solid #2563eb;
        }
        .billing-box.finance {
          border-left-color: #d97706;
          background: #fffbeb;
        }
        .billing-box h3 { 
          font-size: 10px; 
          text-transform: uppercase;
          color: #6b7280;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
        }
        .billing-box p { 
          font-size: 11px;
          color: #374151;
          margin: 3px 0;
        }
        .billing-box .name { 
          font-weight: 600;
          font-size: 13px;
          color: #1f2937;
        }
        
        .vehicle-section {
          background: #f0f9ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 25px;
        }
        .vehicle-section h3 {
          font-size: 12px;
          color: #1e40af;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #bfdbfe;
        }
        .vehicle-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .vehicle-item {
          display: flex;
          flex-direction: column;
        }
        .vehicle-item label {
          font-size: 9px;
          color: #6b7280;
          text-transform: uppercase;
        }
        .vehicle-item span {
          font-size: 11px;
          color: #1f2937;
          font-weight: 500;
        }
        
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-bottom: 20px;
        }
        th { 
          background: #2563eb; 
          color: white; 
          padding: 12px 10px;
          text-align: left;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        th:first-child { border-radius: 6px 0 0 0; }
        th:last-child { border-radius: 0 6px 0 0; text-align: right; }
        td { 
          padding: 12px 10px; 
          border-bottom: 1px solid #e5e7eb;
          font-size: 11px;
        }
        td:last-child { text-align: right; font-weight: 600; }
        tr:hover td { background: #f9fafb; }
        
        .totals { 
          margin-left: auto;
          width: 280px;
          margin-bottom: 25px;
        }
        .totals-row { 
          display: flex; 
          justify-content: space-between;
          padding: 8px 12px;
          border-bottom: 1px solid #e5e7eb;
        }
        .totals-row.grand { 
          background: #2563eb;
          color: white;
          font-weight: 700;
          font-size: 14px;
          border-radius: 6px;
          margin-top: 5px;
        }
        
        ${isProforma ? `
        .proforma-note {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 25px;
        }
        .proforma-note h4 {
          color: #b45309;
          font-size: 12px;
          margin-bottom: 8px;
        }
        .proforma-note p {
          color: #92400e;
          font-size: 11px;
        }
        ` : ''}
        
        .signatures { 
          display: flex; 
          justify-content: space-between;
          gap: 20px;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
        }
        .signature-box { 
          text-align: center;
          flex: 1;
        }
        .signature-box .sig-image {
          height: 50px;
          margin-bottom: 5px;
        }
        .signature-box .sig-image img {
          max-height: 50px;
          max-width: 120px;
        }
        .signature-line { 
          border-top: 1px solid #1a1a1a; 
          margin: 8px 20px;
        }
        .signature-box p { 
          font-size: 9px; 
          color: #6b7280;
          margin-top: 4px;
        }
        .signature-box .name {
          font-size: 10px;
          font-weight: 600;
          color: #1f2937;
        }
        
        .footer { 
          text-align: center; 
          color: #9ca3af;
          font-size: 9px;
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #e5e7eb;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <div class="company-info">
            <h1>${data.companyName || 'NCG FLEET MANAGEMENT'}</h1>
            <p>${data.companyAddress || 'Lusaka, Zambia'}</p>
            <p>Tel: ${data.companyPhone || '+260 XXX XXX XXX'} | Email: ${data.companyEmail || 'sales@ncgfleet.com'}</p>
          </div>
          <div class="invoice-title">
            <h2>${invoiceTitle}</h2>
            <div class="invoice-meta">
              <p><strong>Invoice No:</strong> ${data.invoiceNo || 'PENDING'}</p>
              <p><strong>Date:</strong> ${formatDate(data.invoiceDate)}</p>
              <p><strong>Order:</strong> ${data.orderNo}</p>
              ${data.quotationNo ? `<p><strong>Quotation:</strong> ${data.quotationNo}</p>` : ''}
            </div>
          </div>
        </div>
        
        <div class="billing-section">
          <div class="billing-box">
            <h3>Bill To</h3>
            <p class="name">${data.customerName}</p>
            ${data.customerAddress ? `<p>${data.customerAddress}</p>` : ''}
            ${data.customerPhone ? `<p>Tel: ${data.customerPhone}</p>` : ''}
            ${data.customerEmail ? `<p>Email: ${data.customerEmail}</p>` : ''}
          </div>
          ${isProforma && data.financeCompanyName ? `
          <div class="billing-box finance">
            <h3>Finance Company</h3>
            <p class="name">${data.financeCompanyName}</p>
            ${data.financeCompanyAddress ? `<p>${data.financeCompanyAddress}</p>` : ''}
          </div>
          ` : ''}
        </div>
        
        <div class="vehicle-section">
          <h3>Vehicle Details</h3>
          <div class="vehicle-grid">
            <div class="vehicle-item">
              <label>Make</label>
              <span>${data.vehicleMake}</span>
            </div>
            <div class="vehicle-item">
              <label>Model</label>
              <span>${data.vehicleModel}</span>
            </div>
            <div class="vehicle-item">
              <label>Year</label>
              <span>${data.vehicleYear || 'N/A'}</span>
            </div>
            <div class="vehicle-item">
              <label>Color</label>
              <span>${data.vehicleColor || 'N/A'}</span>
            </div>
            <div class="vehicle-item">
              <label>Engine Number</label>
              <span>${data.engineNumber || 'N/A'}</span>
            </div>
            <div class="vehicle-item">
              <label>Chassis Number</label>
              <span>${data.chassisNumber || 'N/A'}</span>
            </div>
            <div class="vehicle-item">
              <label>Engine Capacity</label>
              <span>${data.engineCapacity || 'N/A'}</span>
            </div>
            <div class="vehicle-item">
              <label>Transmission</label>
              <span>${data.transmission || 'N/A'}</span>
            </div>
            <div class="vehicle-item">
              <label>Fuel Type</label>
              <span>${data.fuelType || 'N/A'}</span>
            </div>
            <div class="vehicle-item">
              <label>Mileage</label>
              <span>${data.mileage || 'N/A'}</span>
            </div>
            <div class="vehicle-item">
              <label>Condition</label>
              <span>${data.vehicleCondition || 'N/A'}</span>
            </div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${data.vehicleMake} ${data.vehicleModel} ${data.vehicleYear || ''}</td>
              <td>${data.quantity}</td>
              <td>${formatCurrency(data.unitPrice)}</td>
              <td>${formatCurrency(data.totalAmount)}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="totals">
          <div class="totals-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(data.totalAmount)}</span>
          </div>
          ${isProforma && data.proformaPercentage ? `
          <div class="totals-row">
            <span>Proforma (${data.proformaPercentage}%):</span>
            <span>${formatCurrency(data.proformaAmount || 0)}</span>
          </div>
          ` : ''}
          ${data.amountPaid ? `
          <div class="totals-row">
            <span>Amount Paid:</span>
            <span>${formatCurrency(data.amountPaid)}</span>
          </div>
          ` : ''}
          <div class="totals-row grand">
            <span>${isProforma ? 'Amount Due:' : 'Total:'}</span>
            <span>${formatCurrency(displayAmount)}</span>
          </div>
        </div>
        
        ${isProforma && data.proformaPurpose ? `
        <div class="proforma-note">
          <h4>Purpose of Proforma Invoice</h4>
          <p>${data.proformaPurpose}</p>
        </div>
        ` : ''}
        
        <div class="signatures">
          <div class="signature-box">
            <div class="sig-image">
              ${data.signatures?.preparedBy?.signature ? `<img src="${data.signatures.preparedBy.signature}" alt="Signature" />` : ''}
            </div>
            <div class="signature-line"></div>
            <p class="name">${data.signatures?.preparedBy?.name || ''}</p>
            <p>Prepared By</p>
            ${data.signatures?.preparedBy?.date ? `<p>${data.signatures.preparedBy.date}</p>` : ''}
          </div>
          <div class="signature-box">
            <div class="sig-image">
              ${data.signatures?.approvedBy?.signature ? `<img src="${data.signatures.approvedBy.signature}" alt="Signature" />` : ''}
            </div>
            <div class="signature-line"></div>
            <p class="name">${data.signatures?.approvedBy?.name || ''}</p>
            <p>Approved By</p>
            ${data.signatures?.approvedBy?.date ? `<p>${data.signatures.approvedBy.date}</p>` : ''}
          </div>
          <div class="signature-box">
            <div class="sig-image">
              ${data.signatures?.receivedBy?.signature ? `<img src="${data.signatures.receivedBy.signature}" alt="Signature" />` : ''}
            </div>
            <div class="signature-line"></div>
            <p class="name">${data.signatures?.receivedBy?.name || ''}</p>
            <p>Received By</p>
            ${data.signatures?.receivedBy?.date ? `<p>${data.signatures.receivedBy.date}</p>` : ''}
          </div>
        </div>
        
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>This is a computer-generated document. ${isProforma ? 'This proforma invoice is valid for 30 days.' : ''}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function generateLightVehicleOrderInvoicePDF(data: LightVehicleOrderInvoiceData): Promise<Blob> {
  const html = generateLightVehicleOrderInvoiceHTML(data);
  
  // Create a temporary container
  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  document.body.appendChild(container);

  try {
    // Wait for images to load
    await new Promise(resolve => setTimeout(resolve, 300));

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

    return pdf.output('blob');
  } finally {
    document.body.removeChild(container);
  }
}
