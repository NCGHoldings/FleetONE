import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { generateSriLankaTaxInvoiceHTML } from './sri-lanka-tax-invoice-generator';

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
  
  // Payment history
  payments?: Array<{
    date: string;
    reference: string;
    method: string;
    amount: number;
    status: string;
  }>;
  
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
  
  // Responsible Person (footer contact)
  responsiblePersonPhone?: string;
  responsiblePersonEmail?: string;
  
  // Template customization
  customHeaderImageUrl?: string;
  
  // Tax Invoice fields (Sri Lanka Government Format)
  supplierTin?: string;
  supplierName?: string;
  supplierAddress?: string;
  supplierPhone?: string;
  purchaserTin?: string;
  purchaserPhone?: string;
  dateOfDelivery?: string;
  placeOfSupply?: string;
  modeOfPayment?: string;
  additionalInformation?: string;
  taxRate?: number;
}

export function generateLightVehicleOrderInvoiceHTML(data: LightVehicleOrderInvoiceData): string {
  const isProforma = data.invoiceCategory === 'proforma_invoice';
  const isTaxInvoice = data.invoiceCategory === 'tax_invoice';
  const displayAmount = isProforma && data.proformaAmount ? data.proformaAmount : data.totalAmount;
  const invoiceTitle = isProforma ? 'PROFORMA INVOICE' : 'TAX INVOICE';
  const footerPhone = data.responsiblePersonPhone || '+94 77 123 4567';
  const footerEmail = data.responsiblePersonEmail || 'info@ncgholdings.lk';

  // For tax invoices, use the Sri Lankan government-mandated format
  if (isTaxInvoice) {
    const taxRate = data.taxRate || 18;
    const baseAmount = data.totalAmount / (1 + taxRate / 100);
    const vehicleDescription = [
      data.vehicleMake,
      data.vehicleModel,
      data.vehicleYear,
      data.vehicleCondition,
      data.fuelType,
      data.engineNumber ? `Engine: ${data.engineNumber}` : null,
      data.chassisNumber ? `Chassis: ${data.chassisNumber}` : null,
    ].filter(Boolean).join(' | ');

    return generateSriLankaTaxInvoiceHTML({
      invoiceDate: data.invoiceDate || new Date().toISOString(),
      taxInvoiceNo: data.invoiceNo || data.orderNo,
      supplierTin: data.supplierTin || '',
      supplierName: data.supplierName || data.companyName || 'NCG Holdings (Pvt) Ltd',
      supplierAddress: data.supplierAddress || data.companyAddress || '',
      supplierPhone: data.supplierPhone || data.companyPhone || '',
      purchaserTin: data.purchaserTin || '',
      purchaserName: data.customerName,
      purchaserAddress: data.customerAddress || '',
      purchaserPhone: data.purchaserPhone || data.customerPhone || '',
      dateOfDelivery: data.dateOfDelivery,
      placeOfSupply: data.placeOfSupply,
      additionalInformation: data.additionalInformation,
      lineItems: [{
        reference: '1',
        description: vehicleDescription,
        quantity: data.quantity,
        unitPrice: baseAmount / data.quantity,
        amountExclVat: baseAmount,
      }],
      vatRate: taxRate,
      modeOfPayment: data.modeOfPayment,
      preparedBy: data.signatures?.preparedBy ? { name: data.signatures.preparedBy.name, signature: data.signatures.preparedBy.signature, date: data.signatures.preparedBy.date } : undefined,
      approvedBy: data.signatures?.approvedBy ? { name: data.signatures.approvedBy.name, signature: data.signatures.approvedBy.signature, date: data.signatures.approvedBy.date } : undefined,
      customerSignature: data.signatures?.receivedBy ? { name: data.signatures.receivedBy.name, signature: data.signatures.receivedBy.signature, date: data.signatures.receivedBy.date } : undefined,
    });
  }
  
  const formatCurrency = (amount: number) => {
    return `LKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    return new Date(dateStr).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const paymentsHTML = data.payments && data.payments.length > 0 ? `
    <div class="payment-history">
      <h3>Payment History</h3>
      <table class="payment-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Reference</th>
            <th>Method</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${data.payments.map(p => `
            <tr>
              <td>${formatDate(p.date)}</td>
              <td>${p.reference || '-'}</td>
              <td>${p.method}</td>
              <td>${formatCurrency(p.amount)}</td>
              <td><span class="status-badge ${p.status}">${p.status.toUpperCase()}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: A4; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Arial, sans-serif; 
          font-size: 10px; 
          line-height: 1.4;
          color: #1a1a1a;
          background: white;
        }
        .page {
          width: 210mm;
          min-height: 297mm;
          padding: 15mm 20mm;
          background: white;
          position: relative;
        }
        
        /* NCG Header - Professional Blue Theme */
        .header { 
          display: flex; 
          justify-content: space-between; 
          align-items: flex-start;
          padding-bottom: 15px;
          margin-bottom: 20px;
          border-bottom: 4px solid #1e40af;
          background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
          margin: -15mm -20mm 20px -20mm;
          padding: 20mm 20mm 15px 20mm;
        }
        .company-info { color: white; }
        .company-info h1 { 
          font-size: 28px; 
          font-weight: 800;
          margin-bottom: 5px;
          letter-spacing: 1px;
        }
        .company-info .subtitle {
          font-size: 11px;
          font-weight: 500;
          margin-bottom: 8px;
          opacity: 0.9;
        }
        .company-info p { 
          font-size: 9px;
          line-height: 1.6;
          opacity: 0.85;
        }
        .invoice-badge { 
          text-align: right;
        }
        .invoice-badge h2 { 
          font-size: 22px; 
          background: ${isProforma ? '#f59e0b' : 'white'};
          color: ${isProforma ? 'white' : '#1e40af'};
          padding: 8px 20px;
          border-radius: 4px;
          font-weight: 700;
          margin-bottom: 12px;
          display: inline-block;
        }
        .invoice-meta { 
          font-size: 10px; 
          color: white;
          text-align: right;
        }
        .invoice-meta p { margin: 3px 0; }
        .invoice-meta strong { font-weight: 600; }
        
        /* Billing Section */
        .billing-section { 
          display: flex; 
          gap: 30px;
          margin-bottom: 20px;
        }
        .billing-box { 
          flex: 1;
          background: #f8fafc;
          padding: 12px 15px;
          border-radius: 6px;
          border-left: 4px solid #1e40af;
        }
        .billing-box.finance {
          border-left-color: #f59e0b;
          background: #fffbeb;
        }
        .billing-box h3 { 
          font-size: 8px; 
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 6px;
          letter-spacing: 1px;
          font-weight: 600;
        }
        .billing-box p { 
          font-size: 10px;
          color: #334155;
          margin: 2px 0;
        }
        .billing-box .name { 
          font-weight: 700;
          font-size: 12px;
          color: #0f172a;
          margin-bottom: 4px;
        }
        
        /* Vehicle Section */
        .vehicle-section {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border: 1px solid #93c5fd;
          border-radius: 6px;
          padding: 12px 15px;
          margin-bottom: 20px;
        }
        .vehicle-section h3 {
          font-size: 11px;
          color: #1e40af;
          font-weight: 700;
          margin-bottom: 10px;
          padding-bottom: 6px;
          border-bottom: 1px solid #93c5fd;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .vehicle-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }
        .vehicle-item {
          display: flex;
          flex-direction: column;
        }
        .vehicle-item label {
          font-size: 8px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .vehicle-item span {
          font-size: 10px;
          color: #0f172a;
          font-weight: 600;
        }
        
        /* Pricing Table */
        .pricing-table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-bottom: 15px;
        }
        .pricing-table th { 
          background: #1e40af; 
          color: white; 
          padding: 10px 12px;
          text-align: left;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }
        .pricing-table th:first-child { border-radius: 4px 0 0 0; }
        .pricing-table th:last-child { border-radius: 0 4px 0 0; text-align: right; }
        .pricing-table td { 
          padding: 10px 12px; 
          border-bottom: 1px solid #e2e8f0;
          font-size: 10px;
        }
        .pricing-table td:last-child { text-align: right; font-weight: 600; }
        
        /* Totals */
        .totals-container {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 20px;
        }
        .totals { 
          width: 260px;
        }
        .totals-row { 
          display: flex; 
          justify-content: space-between;
          padding: 6px 10px;
          font-size: 10px;
        }
        .totals-row.subtotal {
          border-bottom: 1px solid #e2e8f0;
        }
        .totals-row.grand { 
          background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
          color: white;
          font-weight: 700;
          font-size: 13px;
          border-radius: 4px;
          margin-top: 5px;
          padding: 10px;
        }
        
        /* Proforma Note */
        .proforma-note {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 20px;
        }
        .proforma-note h4 {
          color: #b45309;
          font-size: 10px;
          margin-bottom: 5px;
          font-weight: 700;
        }
        .proforma-note p {
          color: #92400e;
          font-size: 9px;
        }
        
        /* Payment History */
        .payment-history {
          margin-bottom: 20px;
        }
        .payment-history h3 {
          font-size: 11px;
          color: #1e40af;
          font-weight: 700;
          margin-bottom: 8px;
          text-transform: uppercase;
        }
        .payment-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9px;
        }
        .payment-table th {
          background: #f1f5f9;
          padding: 6px 8px;
          text-align: left;
          font-weight: 600;
          color: #475569;
          border-bottom: 2px solid #e2e8f0;
        }
        .payment-table td {
          padding: 6px 8px;
          border-bottom: 1px solid #e2e8f0;
        }
        .status-badge {
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 8px;
          font-weight: 600;
        }
        .status-badge.verified { background: #dcfce7; color: #166534; }
        .status-badge.pending { background: #fef3c7; color: #92400e; }
        
        /* Bank Details - Page 2 */
        .bank-details {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 20px;
        }
        .bank-details h3 {
          font-size: 11px;
          color: #1e40af;
          font-weight: 700;
          margin-bottom: 10px;
          text-transform: uppercase;
        }
        .bank-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
        }
        .bank-item label {
          font-size: 8px;
          color: #64748b;
          text-transform: uppercase;
          display: block;
          margin-bottom: 2px;
        }
        .bank-item span {
          font-size: 11px;
          color: #0f172a;
          font-weight: 600;
        }
        
        /* Terms and Conditions */
        .terms {
          margin-bottom: 20px;
        }
        .terms h3 {
          font-size: 10px;
          color: #1e40af;
          font-weight: 700;
          margin-bottom: 8px;
          text-transform: uppercase;
        }
        .terms ol {
          padding-left: 15px;
          font-size: 8px;
          color: #475569;
          line-height: 1.6;
        }
        .terms li {
          margin-bottom: 3px;
        }
        
        /* Signatures */
        .signatures { 
          display: flex; 
          justify-content: space-between;
          gap: 15px;
          margin-top: 30px;
          padding-top: 15px;
          border-top: 2px solid #e2e8f0;
        }
        .signature-box { 
          text-align: center;
          flex: 1;
        }
        .signature-box .sig-image {
          height: 45px;
          margin-bottom: 5px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .signature-box .sig-image img {
          max-height: 45px;
          max-width: 100px;
        }
        .signature-line { 
          border-top: 1px solid #1a1a1a; 
          margin: 6px 15px;
        }
        .signature-box p { 
          font-size: 8px; 
          color: #64748b;
          margin-top: 3px;
        }
        .signature-box .name {
          font-size: 9px;
          font-weight: 600;
          color: #0f172a;
        }
        
        /* Footer */
        .footer { 
          text-align: center; 
          color: #94a3b8;
          font-size: 8px;
          margin-top: 25px;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
        }
        .footer p { margin: 2px 0; }
        
        /* Page break for PDF */
        .page-break {
          page-break-before: always;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- NCG Holdings Professional Header -->
        <div class="header">
          <div class="company-info">
            <h1>NCG HOLDINGS</h1>
            <p class="subtitle">Light Vehicle Sales Division</p>
            <p>No. 123, Highlevel Road, Nugegoda, Sri Lanka</p>
            <p>Tel: +94 11 XXX XXXX | Email: sales@ncgholdings.lk</p>
            <p>VAT Reg: XXXXXXXXXX</p>
          </div>
          <div class="invoice-badge">
            <h2>${invoiceTitle}</h2>
            <div class="invoice-meta">
              <p><strong>Invoice No:</strong> ${data.invoiceNo || 'PENDING'}</p>
              <p><strong>Date:</strong> ${formatDate(data.invoiceDate)}</p>
              <p><strong>Order:</strong> ${data.orderNo}</p>
              ${data.quotationNo ? `<p><strong>Quotation:</strong> ${data.quotationNo}</p>` : ''}
            </div>
          </div>
        </div>
        
        <!-- Billing Section -->
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
        
        <!-- Vehicle Details -->
        <div class="vehicle-section">
          <h3>Vehicle Information</h3>
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
              <span>${data.vehicleYear || '-'}</span>
            </div>
            <div class="vehicle-item">
              <label>Color</label>
              <span>${data.vehicleColor || '-'}</span>
            </div>
            <div class="vehicle-item">
              <label>Engine Number</label>
              <span>${data.engineNumber || '-'}</span>
            </div>
            <div class="vehicle-item">
              <label>Chassis Number</label>
              <span>${data.chassisNumber || '-'}</span>
            </div>
            <div class="vehicle-item">
              <label>Engine Capacity</label>
              <span>${data.engineCapacity || '-'}</span>
            </div>
            <div class="vehicle-item">
              <label>Transmission</label>
              <span>${data.transmission || '-'}</span>
            </div>
            <div class="vehicle-item">
              <label>Fuel Type</label>
              <span>${data.fuelType || '-'}</span>
            </div>
            <div class="vehicle-item">
              <label>Mileage</label>
              <span>${data.mileage || '-'}</span>
            </div>
            <div class="vehicle-item">
              <label>Condition</label>
              <span>${data.vehicleCondition || '-'}</span>
            </div>
          </div>
        </div>
        
        <!-- Pricing Table -->
        <table class="pricing-table">
          <thead>
            <tr>
              <th style="width: 50%">Description</th>
              <th style="width: 10%">Qty</th>
              <th style="width: 20%">Unit Price</th>
              <th style="width: 20%">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${data.vehicleMake} ${data.vehicleModel} ${data.vehicleYear || ''} ${data.vehicleColor ? `(${data.vehicleColor})` : ''}</td>
              <td>${data.quantity}</td>
              <td>${formatCurrency(data.unitPrice)}</td>
              <td>${formatCurrency(data.totalAmount)}</td>
            </tr>
          </tbody>
        </table>
        
        <!-- Totals -->
        <div class="totals-container">
          <div class="totals">
            <div class="totals-row subtotal">
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
            ${data.balanceDue !== undefined ? `
            <div class="totals-row">
              <span>Balance Due:</span>
              <span>${formatCurrency(data.balanceDue)}</span>
            </div>
            ` : ''}
            <div class="totals-row grand">
              <span>${isProforma ? 'Amount Due:' : 'Total Amount:'}</span>
              <span>${formatCurrency(displayAmount)}</span>
            </div>
          </div>
        </div>
        
        ${isProforma && data.proformaPurpose ? `
        <div class="proforma-note">
          <h4>Purpose of Proforma Invoice</h4>
          <p>${data.proformaPurpose}</p>
        </div>
        ` : ''}
        
        ${paymentsHTML}
        
        <!-- Bank Details -->
        <div class="bank-details">
          <h3>Bank Details for Payment</h3>
          <div class="bank-grid">
            <div class="bank-item">
              <label>Account Name</label>
              <span>NCG Holdings (Pvt) Ltd</span>
            </div>
            <div class="bank-item">
              <label>Bank Name</label>
              <span>Commercial Bank of Ceylon PLC</span>
            </div>
            <div class="bank-item">
              <label>Branch</label>
              <span>Nugegoda</span>
            </div>
            <div class="bank-item">
              <label>Account Number</label>
              <span>XXXX XXXX XXXX</span>
            </div>
            <div class="bank-item">
              <label>Swift Code</label>
              <span>CABORADXXX</span>
            </div>
            <div class="bank-item">
              <label>Currency</label>
              <span>Sri Lankan Rupees (LKR)</span>
            </div>
          </div>
        </div>
        
        <!-- Terms and Conditions -->
        <div class="terms">
          <h3>Terms and Conditions</h3>
          <ol>
            <li>All prices are quoted in Sri Lankan Rupees (LKR) and are subject to change without prior notice.</li>
            <li>Payment must be made in full before vehicle delivery unless a financing arrangement has been agreed upon.</li>
            <li>The buyer is responsible for all registration, insurance, and other applicable fees.</li>
            <li>Vehicle delivery will be arranged within 7 working days of full payment receipt.</li>
            <li>All vehicles are sold "as is" condition unless otherwise specified in writing.</li>
            <li>Warranty terms vary by vehicle - please confirm warranty coverage before purchase.</li>
            <li>NCG Holdings reserves the right to cancel any order if payment is not received within the agreed timeframe.</li>
            <li>This invoice is valid for 30 days from the date of issue.</li>
            <li>By proceeding with payment, the buyer agrees to all terms and conditions stated herein.</li>
            <li>For disputes, the jurisdiction shall be Colombo, Sri Lanka.</li>
            <li>E&OE - Errors and Omissions Excepted.</li>
          </ol>
        </div>
        
        <!-- Signatures -->
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
            <p>Customer</p>
            ${data.signatures?.receivedBy?.date ? `<p>${data.signatures.receivedBy.date}</p>` : ''}
          </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <p>📞 ${footerPhone} | ✉️ ${footerEmail}</p>
          <p><strong>NCG Holdings (Pvt) Ltd</strong> - Light Vehicle Sales Division</p>
          <p>Thank you for choosing NCG Holdings. We appreciate your business!</p>
          <p>This is a computer-generated document. ${isProforma ? 'This proforma invoice is valid for 30 days from the date of issue.' : ''}</p>
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
  container.style.width = '794px'; // A4 width at 96dpi
  document.body.appendChild(container);

  try {
    // Wait for content to render
    await new Promise(resolve => setTimeout(resolve, 300));

    const canvas = await html2canvas(container, {
      scale: 2.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 794,
      windowWidth: 794,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Calculate image dimensions maintaining aspect ratio
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Handle multi-page if content exceeds one page
    let heightLeft = imgHeight;
    let position = 0;
    
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;
    
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    return pdf.output('blob');
  } finally {
    document.body.removeChild(container);
  }
}

export async function downloadLightVehicleOrderInvoice(data: LightVehicleOrderInvoiceData): Promise<void> {
  const blob = await generateLightVehicleOrderInvoicePDF(data);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `LightVehicle_Invoice_${data.invoiceNo || data.orderNo}_${new Date().toISOString().split('T')[0]}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
