// Document Template Seeder - Professional templates for all 12 document types
// Each template follows a consistent structure: Header, Body, Footer with print-optimized CSS

// Common CSS that applies to all templates
const commonStyles = `
  @page { size: A4 portrait; margin: 15mm; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 12px;
    line-height: 1.5;
    color: #333;
    margin: 0;
    padding: 0;
    background: white;
  }
  .document-container {
    max-width: 210mm;
    margin: 0 auto;
    padding: 20px;
    min-height: 297mm;
    display: flex;
    flex-direction: column;
  }
  .document-header {
    border-bottom: 2px solid #2563eb;
    padding-bottom: 15px;
    margin-bottom: 20px;
  }
  .header-row {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  .logo-area {
    flex-shrink: 0;
  }
  .logo-area img {
    max-height: 70px;
    max-width: 180px;
    object-fit: contain;
  }
  .company-details {
    flex: 1;
  }
  .company-details h1 {
    margin: 0 0 5px 0;
    font-size: 20px;
    color: #1e40af;
  }
  .company-details p {
    margin: 2px 0;
    font-size: 11px;
    color: #666;
  }
  .document-body {
    flex: 1;
  }
  .document-title {
    text-align: center;
    font-size: 18px;
    font-weight: bold;
    color: #1e40af;
    margin: 0 0 20px 0;
    padding: 10px;
    background: #eff6ff;
    border-radius: 4px;
  }
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-bottom: 20px;
  }
  .info-section {
    padding: 12px;
    background: #f8fafc;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
  }
  .info-section h3 {
    margin: 0 0 8px 0;
    font-size: 12px;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    border-bottom: 1px dotted #e2e8f0;
  }
  .info-row:last-child { border-bottom: none; }
  .info-row .label {
    color: #64748b;
    font-size: 11px;
  }
  .info-row .value {
    font-weight: 600;
    color: #1e293b;
  }
  .customer-section, .vendor-section {
    margin-bottom: 20px;
    padding: 12px;
    background: #f0f9ff;
    border-left: 4px solid #2563eb;
  }
  .customer-section h3, .vendor-section h3 {
    margin: 0 0 5px 0;
    font-size: 11px;
    color: #64748b;
    text-transform: uppercase;
  }
  .customer-section p, .vendor-section p {
    margin: 2px 0;
  }
  table.items-table {
    width: 100%;
    border-collapse: collapse;
    margin: 15px 0;
  }
  table.items-table th {
    background: #1e40af;
    color: white;
    padding: 10px 8px;
    text-align: left;
    font-size: 11px;
    text-transform: uppercase;
  }
  table.items-table th:last-child,
  table.items-table td:last-child { text-align: right; }
  table.items-table th:nth-child(3),
  table.items-table th:nth-child(4),
  table.items-table td:nth-child(3),
  table.items-table td:nth-child(4) { text-align: right; }
  table.items-table td {
    padding: 10px 8px;
    border-bottom: 1px solid #e2e8f0;
  }
  table.items-table tr:hover { background: #f8fafc; }
  .totals-section {
    margin-left: auto;
    width: 280px;
    margin-top: 15px;
  }
  .total-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid #e2e8f0;
  }
  .total-row.grand {
    background: #1e40af;
    color: white;
    font-weight: bold;
    font-size: 14px;
    border-radius: 0 0 4px 4px;
  }
  .amount-words {
    margin-top: 15px;
    padding: 12px;
    background: #fef3c7;
    border-radius: 4px;
    font-style: italic;
    border-left: 4px solid #f59e0b;
  }
  .document-footer {
    margin-top: auto;
    padding-top: 20px;
    border-top: 1px solid #e2e8f0;
  }
  .signature-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 30px;
    margin-top: 40px;
  }
  .sig-box {
    text-align: center;
  }
  .sig-line {
    border-top: 1px solid #333;
    padding-top: 8px;
    font-size: 11px;
    color: #666;
  }
  .footer-notes {
    margin-top: 20px;
    padding: 10px;
    background: #f8fafc;
    border-radius: 4px;
    font-size: 10px;
    color: #64748b;
  }
  .amount-box {
    text-align: center;
    padding: 20px;
    background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
    color: white;
    border-radius: 8px;
    margin: 20px 0;
  }
  .amount-box .amount {
    font-size: 28px;
    font-weight: bold;
  }
  .amount-box .words {
    font-size: 12px;
    opacity: 0.9;
    margin-top: 5px;
  }
  .payment-info {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin: 15px 0;
    padding: 12px;
    background: #f8fafc;
    border-radius: 4px;
  }
  .payment-info div {
    padding: 5px 0;
  }
  .status-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
  }
  .status-paid { background: #dcfce7; color: #166534; }
  .status-unpaid { background: #fef3c7; color: #92400e; }
  .status-partial { background: #dbeafe; color: #1e40af; }
`;

// AR Invoice Template
export const generateARInvoiceTemplate = (): string => `
<style>${commonStyles}</style>
<div class="document-container">
  <div class="document-header">
    <div class="header-row">
      <div class="logo-area">{{company_logo}}</div>
      <div class="company-details">
        <h1>{{company_name}}</h1>
        <p>{{company_address}}</p>
        <p>Tel: {{company_phone}} | Email: {{company_email}}</p>
        <p>TIN: {{company_tax_id}}</p>
      </div>
    </div>
  </div>

  <div class="document-body">
    <h2 class="document-title">TAX INVOICE</h2>
    
    <div class="info-grid">
      <div class="info-section">
        <h3>Invoice Details</h3>
        <div class="info-row"><span class="label">Invoice No:</span><span class="value">{{invoice_number}}</span></div>
        <div class="info-row"><span class="label">Date:</span><span class="value">{{invoice_date}}</span></div>
        <div class="info-row"><span class="label">Due Date:</span><span class="value">{{due_date}}</span></div>
        <div class="info-row"><span class="label">Reference:</span><span class="value">{{reference}}</span></div>
      </div>
      <div class="customer-section">
        <h3>Bill To</h3>
        <p><strong>{{customer_name}}</strong></p>
        <p>{{customer_address}}</p>
        <p>{{customer_phone}}</p>
        <p>{{customer_email}}</p>
      </div>
    </div>

    {{line_items}}

    <div class="totals-section">
      <div class="total-row"><span>Subtotal:</span><span>{{subtotal}}</span></div>
      <div class="total-row"><span>Tax:</span><span>{{tax_amount}}</span></div>
      <div class="total-row"><span>Discount:</span><span>{{discount_amount}}</span></div>
      <div class="total-row grand"><span>Total Due:</span><span>{{total_amount}}</span></div>
    </div>

    <div class="amount-words">
      <strong>Amount in Words:</strong> {{amount_in_words}}
    </div>

    <div class="footer-notes">
      <strong>Notes:</strong> {{notes}}
    </div>
  </div>

  <div class="document-footer">
    <div class="signature-grid">
      <div class="sig-box"><div class="sig-line">Prepared By</div></div>
      <div class="sig-box"><div class="sig-line">Checked By</div></div>
      <div class="sig-box"><div class="sig-line">Authorized Signature</div></div>
    </div>
  </div>
</div>
`;

// AR Receipt Template
export const generateARReceiptTemplate = (): string => `
<style>${commonStyles}</style>
<div class="document-container">
  <div class="document-header">
    <div class="header-row">
      <div class="logo-area">{{company_logo}}</div>
      <div class="company-details">
        <h1>{{company_name}}</h1>
        <p>{{company_address}}</p>
        <p>Tel: {{company_phone}} | Email: {{company_email}}</p>
      </div>
    </div>
  </div>

  <div class="document-body">
    <h2 class="document-title">OFFICIAL RECEIPT</h2>
    
    <div class="info-grid">
      <div class="info-section">
        <h3>Receipt Details</h3>
        <div class="info-row"><span class="label">Receipt No:</span><span class="value">{{receipt_number}}</span></div>
        <div class="info-row"><span class="label">Date:</span><span class="value">{{receipt_date}}</span></div>
        <div class="info-row"><span class="label">Reference:</span><span class="value">{{reference}}</span></div>
      </div>
      <div class="customer-section">
        <h3>Received From</h3>
        <p><strong>{{customer_name}}</strong></p>
        <p>{{customer_address}}</p>
      </div>
    </div>

    <div class="amount-box">
      <div class="amount">{{amount}}</div>
      <div class="words">{{amount_in_words}}</div>
    </div>

    <div class="payment-info">
      <div><strong>Payment Method:</strong> {{payment_method}}</div>
      <div><strong>Cheque No:</strong> {{cheque_number}}</div>
    </div>

    <h3 style="margin-top: 20px; font-size: 13px; color: #1e40af;">Invoice Allocations</h3>
    {{allocations}}

    <div class="footer-notes">
      <strong>Notes:</strong> {{notes}}
    </div>
  </div>

  <div class="document-footer">
    <div class="signature-grid">
      <div class="sig-box"><div class="sig-line">Received By</div></div>
      <div class="sig-box"><div class="sig-line">Cashier</div></div>
      <div class="sig-box"><div class="sig-line">Authorized Signature</div></div>
    </div>
  </div>
</div>
`;

// AR Credit Note Template
export const generateARCreditNoteTemplate = (): string => `
<style>${commonStyles}
.document-title { background: #fef2f2; color: #b91c1c; }
.customer-section { background: #fef2f2; border-left-color: #dc2626; }
</style>
<div class="document-container">
  <div class="document-header">
    <div class="header-row">
      <div class="logo-area">{{company_logo}}</div>
      <div class="company-details">
        <h1>{{company_name}}</h1>
        <p>{{company_address}}</p>
        <p>Tel: {{company_phone}} | Email: {{company_email}}</p>
      </div>
    </div>
  </div>

  <div class="document-body">
    <h2 class="document-title">CREDIT NOTE</h2>
    
    <div class="info-grid">
      <div class="info-section">
        <h3>Credit Note Details</h3>
        <div class="info-row"><span class="label">Credit Note No:</span><span class="value">{{credit_note_number}}</span></div>
        <div class="info-row"><span class="label">Date:</span><span class="value">{{credit_date}}</span></div>
        <div class="info-row"><span class="label">Original Invoice:</span><span class="value">{{original_invoice}}</span></div>
        <div class="info-row"><span class="label">Status:</span><span class="value">{{status}}</span></div>
      </div>
      <div class="customer-section">
        <h3>Issued To</h3>
        <p><strong>{{customer_name}}</strong></p>
        <p>Customer Code: {{customer_code}}</p>
      </div>
    </div>

    <div class="amount-box" style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);">
      <div class="amount">{{amount}}</div>
      <div class="words">{{amount_in_words}}</div>
    </div>

    <div class="info-section" style="margin-top: 20px;">
      <h3>Reason for Credit</h3>
      <p style="margin: 10px 0;">{{reason}}</p>
    </div>
  </div>

  <div class="document-footer">
    <div class="signature-grid">
      <div class="sig-box"><div class="sig-line">Prepared By</div></div>
      <div class="sig-box"><div class="sig-line">Approved By</div></div>
      <div class="sig-box"><div class="sig-line">Customer Acknowledgment</div></div>
    </div>
  </div>
</div>
`;

// AP Invoice Template
export const generateAPInvoiceTemplate = (): string => `
<style>${commonStyles}
.document-title { background: #fff7ed; color: #c2410c; }
.vendor-section { background: #fff7ed; border-left-color: #ea580c; }
table.items-table th { background: #ea580c; }
.total-row.grand { background: #ea580c; }
</style>
<div class="document-container">
  <div class="document-header">
    <div class="header-row">
      <div class="logo-area">{{company_logo}}</div>
      <div class="company-details">
        <h1>{{company_name}}</h1>
        <p>{{company_address}}</p>
        <p>Tel: {{company_phone}} | Email: {{company_email}}</p>
        <p>TIN: {{company_tax_id}}</p>
      </div>
    </div>
  </div>

  <div class="document-body">
    <h2 class="document-title">PURCHASE INVOICE</h2>
    
    <div class="info-grid">
      <div class="info-section">
        <h3>Invoice Details</h3>
        <div class="info-row"><span class="label">Invoice No:</span><span class="value">{{invoice_number}}</span></div>
        <div class="info-row"><span class="label">Date:</span><span class="value">{{invoice_date}}</span></div>
        <div class="info-row"><span class="label">Due Date:</span><span class="value">{{due_date}}</span></div>
        <div class="info-row"><span class="label">Reference:</span><span class="value">{{reference}}</span></div>
      </div>
      <div class="vendor-section">
        <h3>Supplier / Vendor</h3>
        <p><strong>{{vendor_name}}</strong></p>
        <p>{{vendor_address}}</p>
        <p>Vendor Code: {{vendor_code}}</p>
      </div>
    </div>

    {{line_items}}

    <div class="totals-section">
      <div class="total-row"><span>Subtotal:</span><span>{{subtotal}}</span></div>
      <div class="total-row"><span>Tax:</span><span>{{tax_amount}}</span></div>
      <div class="total-row"><span>WHT:</span><span>{{wht_amount}}</span></div>
      <div class="total-row grand"><span>Total Payable:</span><span>{{total_amount}}</span></div>
    </div>

    <div class="amount-words">
      <strong>Amount in Words:</strong> {{amount_in_words}}
    </div>

    <div class="footer-notes">
      <strong>Notes:</strong> {{notes}}
    </div>
  </div>

  <div class="document-footer">
    <div class="signature-grid">
      <div class="sig-box"><div class="sig-line">Received By</div></div>
      <div class="sig-box"><div class="sig-line">Verified By</div></div>
      <div class="sig-box"><div class="sig-line">Approved By</div></div>
    </div>
  </div>
</div>
`;

// AP Payment Voucher Template
export const generateAPPaymentVoucherTemplate = (): string => `
<style>${commonStyles}
.document-title { background: #faf5ff; color: #7c3aed; }
.vendor-section { background: #faf5ff; border-left-color: #7c3aed; }
.amount-box { background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%); }
</style>
<div class="document-container">
  <div class="document-header">
    <div class="header-row">
      <div class="logo-area">{{company_logo}}</div>
      <div class="company-details">
        <h1>{{company_name}}</h1>
        <p>{{company_address}}</p>
        <p>Tel: {{company_phone}} | Email: {{company_email}}</p>
      </div>
    </div>
  </div>

  <div class="document-body">
    <h2 class="document-title">PAYMENT VOUCHER</h2>
    
    <div class="info-grid">
      <div class="info-section">
        <h3>Payment Details</h3>
        <div class="info-row"><span class="label">Voucher No:</span><span class="value">{{payment_number}}</span></div>
        <div class="info-row"><span class="label">Date:</span><span class="value">{{payment_date}}</span></div>
        <div class="info-row"><span class="label">Reference:</span><span class="value">{{reference}}</span></div>
      </div>
      <div class="vendor-section">
        <h3>Pay To</h3>
        <p><strong>{{vendor_name}}</strong></p>
        <p>{{vendor_address}}</p>
        <p>Vendor Code: {{vendor_code}}</p>
      </div>
    </div>

    <div class="amount-box">
      <div class="amount">{{amount}}</div>
      <div class="words">{{amount_in_words}}</div>
    </div>

    <div class="payment-info">
      <div><strong>Payment Method:</strong> {{payment_method}}</div>
      <div><strong>Cheque No:</strong> {{cheque_number}}</div>
    </div>

    <h3 style="margin-top: 20px; font-size: 13px; color: #7c3aed;">Invoice Allocations</h3>
    {{allocations}}

    <div class="footer-notes">
      <strong>Notes:</strong> {{notes}}
    </div>
  </div>

  <div class="document-footer">
    <div class="signature-grid">
      <div class="sig-box"><div class="sig-line">Prepared By</div></div>
      <div class="sig-box"><div class="sig-line">Approved By</div></div>
      <div class="sig-box"><div class="sig-line">Received By (Payee)</div></div>
    </div>
  </div>
</div>
`;

// AP Debit Note Template
export const generateAPDebitNoteTemplate = (): string => `
<style>${commonStyles}
.document-title { background: #fef2f2; color: #b91c1c; }
.vendor-section { background: #fef2f2; border-left-color: #dc2626; }
</style>
<div class="document-container">
  <div class="document-header">
    <div class="header-row">
      <div class="logo-area">{{company_logo}}</div>
      <div class="company-details">
        <h1>{{company_name}}</h1>
        <p>{{company_address}}</p>
        <p>Tel: {{company_phone}} | Email: {{company_email}}</p>
      </div>
    </div>
  </div>

  <div class="document-body">
    <h2 class="document-title">DEBIT NOTE</h2>
    
    <div class="info-grid">
      <div class="info-section">
        <h3>Debit Note Details</h3>
        <div class="info-row"><span class="label">Debit Note No:</span><span class="value">{{debit_note_number}}</span></div>
        <div class="info-row"><span class="label">Date:</span><span class="value">{{debit_date}}</span></div>
        <div class="info-row"><span class="label">Original Invoice:</span><span class="value">{{original_invoice}}</span></div>
        <div class="info-row"><span class="label">Status:</span><span class="value">{{status}}</span></div>
      </div>
      <div class="vendor-section">
        <h3>Issued To Vendor</h3>
        <p><strong>{{vendor_name}}</strong></p>
        <p>Vendor Code: {{vendor_code}}</p>
      </div>
    </div>

    <div class="amount-box" style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);">
      <div class="amount">{{amount}}</div>
      <div class="words">{{amount_in_words}}</div>
    </div>

    <div class="info-section" style="margin-top: 20px;">
      <h3>Reason for Debit</h3>
      <p style="margin: 10px 0;">{{reason}}</p>
    </div>
  </div>

  <div class="document-footer">
    <div class="signature-grid">
      <div class="sig-box"><div class="sig-line">Prepared By</div></div>
      <div class="sig-box"><div class="sig-line">Approved By</div></div>
      <div class="sig-box"><div class="sig-line">Vendor Acknowledgment</div></div>
    </div>
  </div>
</div>
`;

// Advance Receipt Template
export const generateAdvanceReceiptTemplate = (): string => `
<style>${commonStyles}
.document-title { background: #ecfdf5; color: #047857; }
.customer-section { background: #ecfdf5; border-left-color: #10b981; }
.amount-box { background: linear-gradient(135deg, #047857 0%, #10b981 100%); }
</style>
<div class="document-container">
  <div class="document-header">
    <div class="header-row">
      <div class="logo-area">{{company_logo}}</div>
      <div class="company-details">
        <h1>{{company_name}}</h1>
        <p>{{company_address}}</p>
        <p>Tel: {{company_phone}} | Email: {{company_email}}</p>
      </div>
    </div>
  </div>

  <div class="document-body">
    <h2 class="document-title">ADVANCE PAYMENT RECEIPT</h2>
    
    <div class="info-grid">
      <div class="info-section">
        <h3>Receipt Details</h3>
        <div class="info-row"><span class="label">Receipt No:</span><span class="value">{{receipt_number}}</span></div>
        <div class="info-row"><span class="label">Date:</span><span class="value">{{receipt_date}}</span></div>
        <div class="info-row"><span class="label">Reference:</span><span class="value">{{reference}}</span></div>
      </div>
      <div class="customer-section">
        <h3>Received From</h3>
        <p><strong>{{customer_name}}</strong></p>
        <p>{{customer_address}}</p>
      </div>
    </div>

    <div class="amount-box">
      <div class="amount">{{amount}}</div>
      <div class="words">{{amount_in_words}}</div>
    </div>

    <div class="payment-info">
      <div><strong>Payment Method:</strong> {{payment_method}}</div>
      <div><strong>Cheque No:</strong> {{cheque_number}}</div>
    </div>

    <div class="info-section" style="margin-top: 20px; background: #fef3c7; border-left-color: #f59e0b;">
      <h3 style="color: #92400e;">Advance Payment Notice</h3>
      <p style="margin: 10px 0; color: #92400e;">This receipt acknowledges advance payment. The amount will be adjusted against future invoices.</p>
    </div>

    <div class="footer-notes">
      <strong>Notes:</strong> {{notes}}
    </div>
  </div>

  <div class="document-footer">
    <div class="signature-grid">
      <div class="sig-box"><div class="sig-line">Received By</div></div>
      <div class="sig-box"><div class="sig-line">Cashier</div></div>
      <div class="sig-box"><div class="sig-line">Authorized Signature</div></div>
    </div>
  </div>
</div>
`;

// Advance Payment Voucher Template
export const generateAdvancePaymentTemplate = (): string => `
<style>${commonStyles}
.document-title { background: #fefce8; color: #a16207; }
.vendor-section { background: #fefce8; border-left-color: #eab308; }
.amount-box { background: linear-gradient(135deg, #a16207 0%, #eab308 100%); }
</style>
<div class="document-container">
  <div class="document-header">
    <div class="header-row">
      <div class="logo-area">{{company_logo}}</div>
      <div class="company-details">
        <h1>{{company_name}}</h1>
        <p>{{company_address}}</p>
        <p>Tel: {{company_phone}} | Email: {{company_email}}</p>
      </div>
    </div>
  </div>

  <div class="document-body">
    <h2 class="document-title">ADVANCE PAYMENT VOUCHER</h2>
    
    <div class="info-grid">
      <div class="info-section">
        <h3>Voucher Details</h3>
        <div class="info-row"><span class="label">Voucher No:</span><span class="value">{{payment_number}}</span></div>
        <div class="info-row"><span class="label">Date:</span><span class="value">{{payment_date}}</span></div>
        <div class="info-row"><span class="label">Reference:</span><span class="value">{{reference}}</span></div>
      </div>
      <div class="vendor-section">
        <h3>Pay To</h3>
        <p><strong>{{vendor_name}}</strong></p>
        <p>{{vendor_address}}</p>
      </div>
    </div>

    <div class="amount-box">
      <div class="amount">{{amount}}</div>
      <div class="words">{{amount_in_words}}</div>
    </div>

    <div class="payment-info">
      <div><strong>Payment Method:</strong> {{payment_method}}</div>
      <div><strong>Cheque No:</strong> {{cheque_number}}</div>
    </div>

    <div class="info-section" style="margin-top: 20px; background: #fef3c7; border-left-color: #f59e0b;">
      <h3 style="color: #92400e;">Advance Payment Notice</h3>
      <p style="margin: 10px 0; color: #92400e;">This voucher represents an advance payment. The amount will be adjusted against future invoices from this vendor.</p>
    </div>

    <div class="footer-notes">
      <strong>Notes:</strong> {{notes}}
    </div>
  </div>

  <div class="document-footer">
    <div class="signature-grid">
      <div class="sig-box"><div class="sig-line">Prepared By</div></div>
      <div class="sig-box"><div class="sig-line">Approved By</div></div>
      <div class="sig-box"><div class="sig-line">Received By (Payee)</div></div>
    </div>
  </div>
</div>
`;

// Journal Voucher Template
export const generateJournalVoucherTemplate = (): string => `
<style>${commonStyles}
.document-title { background: #eff6ff; color: #1d4ed8; }
table.journal-table th { background: #1d4ed8; }
</style>
<div class="document-container">
  <div class="document-header">
    <div class="header-row">
      <div class="logo-area">{{company_logo}}</div>
      <div class="company-details">
        <h1>{{company_name}}</h1>
        <p>{{company_address}}</p>
        <p>Tel: {{company_phone}} | Email: {{company_email}}</p>
      </div>
    </div>
  </div>

  <div class="document-body">
    <h2 class="document-title">JOURNAL VOUCHER</h2>
    
    <div class="info-grid">
      <div class="info-section">
        <h3>Voucher Details</h3>
        <div class="info-row"><span class="label">Voucher No:</span><span class="value">{{voucher_number}}</span></div>
        <div class="info-row"><span class="label">Date:</span><span class="value">{{voucher_date}}</span></div>
        <div class="info-row"><span class="label">Reference:</span><span class="value">{{reference}}</span></div>
        <div class="info-row"><span class="label">Status:</span><span class="value">{{status}}</span></div>
      </div>
      <div class="info-section">
        <h3>Description</h3>
        <p style="margin: 10px 0;">{{description}}</p>
      </div>
    </div>

    {{journal_lines}}

    <div class="totals-section" style="width: 350px;">
      <div class="total-row"><span>Total Debit:</span><span>{{total_debit}}</span></div>
      <div class="total-row"><span>Total Credit:</span><span>{{total_credit}}</span></div>
      <div class="total-row grand"><span>Difference:</span><span>{{difference}}</span></div>
    </div>

    <div class="footer-notes">
      <strong>Notes:</strong> {{notes}}
    </div>
  </div>

  <div class="document-footer">
    <div class="signature-grid">
      <div class="sig-box"><div class="sig-line">Prepared By</div></div>
      <div class="sig-box"><div class="sig-line">Checked By</div></div>
      <div class="sig-box"><div class="sig-line">Approved By</div></div>
    </div>
  </div>
</div>
`;

// Cheque Voucher Template
export const generateChequeVoucherTemplate = (): string => `
<style>${commonStyles}
.document-title { background: #f0fdf4; color: #166534; }
.cheque-details { background: #f0fdf4; border: 2px dashed #22c55e; padding: 15px; border-radius: 8px; margin: 20px 0; }
.amount-box { background: linear-gradient(135deg, #166534 0%, #22c55e 100%); }
</style>
<div class="document-container">
  <div class="document-header">
    <div class="header-row">
      <div class="logo-area">{{company_logo}}</div>
      <div class="company-details">
        <h1>{{company_name}}</h1>
        <p>{{company_address}}</p>
        <p>Tel: {{company_phone}} | Email: {{company_email}}</p>
      </div>
    </div>
  </div>

  <div class="document-body">
    <h2 class="document-title">CHEQUE PAYMENT VOUCHER</h2>
    
    <div class="info-grid">
      <div class="info-section">
        <h3>Voucher Details</h3>
        <div class="info-row"><span class="label">Voucher No:</span><span class="value">{{voucher_number}}</span></div>
        <div class="info-row"><span class="label">Date:</span><span class="value">{{voucher_date}}</span></div>
        <div class="info-row"><span class="label">Reference:</span><span class="value">{{reference}}</span></div>
      </div>
      <div class="info-section">
        <h3>Payee Details</h3>
        <p><strong>{{payee_name}}</strong></p>
        <p>{{payee_address}}</p>
      </div>
    </div>

    <div class="cheque-details">
      <h3 style="margin: 0 0 10px 0; color: #166534;">Cheque Information</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div><strong>Cheque No:</strong> {{cheque_number}}</div>
        <div><strong>Cheque Date:</strong> {{cheque_date}}</div>
        <div><strong>Bank:</strong> {{bank_name}}</div>
        <div><strong>Account:</strong> {{bank_account}}</div>
      </div>
    </div>

    <div class="amount-box">
      <div class="amount">{{amount}}</div>
      <div class="words">{{amount_in_words}}</div>
    </div>

    <div class="footer-notes">
      <strong>Notes:</strong> {{notes}}
    </div>
  </div>

  <div class="document-footer">
    <div class="signature-grid">
      <div class="sig-box"><div class="sig-line">Prepared By</div></div>
      <div class="sig-box"><div class="sig-line">Approved By</div></div>
      <div class="sig-box"><div class="sig-line">Received By (Payee)</div></div>
    </div>
  </div>
</div>
`;

// WHT Certificate Template
export const generateWHTCertificateTemplate = (): string => `
<style>${commonStyles}
.document-title { background: #fef2f2; color: #991b1b; }
.wht-notice { background: #fef2f2; border: 2px solid #dc2626; padding: 15px; border-radius: 8px; margin: 20px 0; }
</style>
<div class="document-container">
  <div class="document-header">
    <div class="header-row">
      <div class="logo-area">{{company_logo}}</div>
      <div class="company-details">
        <h1>{{company_name}}</h1>
        <p>{{company_address}}</p>
        <p>Tel: {{company_phone}} | Email: {{company_email}}</p>
        <p>TIN: {{company_tax_id}}</p>
      </div>
    </div>
  </div>

  <div class="document-body">
    <h2 class="document-title">WITHHOLDING TAX CERTIFICATE</h2>
    
    <div class="info-grid">
      <div class="info-section">
        <h3>Certificate Details</h3>
        <div class="info-row"><span class="label">Certificate No:</span><span class="value">{{certificate_number}}</span></div>
        <div class="info-row"><span class="label">Date:</span><span class="value">{{certificate_date}}</span></div>
        <div class="info-row"><span class="label">Tax Period:</span><span class="value">{{tax_period}}</span></div>
      </div>
      <div class="info-section">
        <h3>Payee (Tax Withheld From)</h3>
        <p><strong>{{vendor_name}}</strong></p>
        <p>TIN: {{vendor_tax_id}}</p>
        <p>{{vendor_address}}</p>
      </div>
    </div>

    <div class="wht-notice">
      <h3 style="margin: 0 0 15px 0; color: #991b1b;">Withholding Tax Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="background: #fee2e2;">
          <th style="padding: 10px; text-align: left; border: 1px solid #fecaca;">Description</th>
          <th style="padding: 10px; text-align: right; border: 1px solid #fecaca;">Gross Amount</th>
          <th style="padding: 10px; text-align: center; border: 1px solid #fecaca;">WHT Rate</th>
          <th style="padding: 10px; text-align: right; border: 1px solid #fecaca;">WHT Amount</th>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #fecaca;">{{payment_description}}</td>
          <td style="padding: 10px; text-align: right; border: 1px solid #fecaca;">{{gross_amount}}</td>
          <td style="padding: 10px; text-align: center; border: 1px solid #fecaca;">{{wht_rate}}</td>
          <td style="padding: 10px; text-align: right; border: 1px solid #fecaca; font-weight: bold;">{{wht_amount}}</td>
        </tr>
      </table>
    </div>

    <div class="amount-words">
      <strong>WHT Amount in Words:</strong> {{amount_in_words}}
    </div>

    <div class="info-section" style="margin-top: 20px;">
      <h3>Related Invoice/Payment</h3>
      <div class="info-row"><span class="label">Invoice No:</span><span class="value">{{invoice_number}}</span></div>
      <div class="info-row"><span class="label">Payment Voucher:</span><span class="value">{{payment_voucher}}</span></div>
    </div>
  </div>

  <div class="document-footer">
    <div class="signature-grid">
      <div class="sig-box"><div class="sig-line">Prepared By</div></div>
      <div class="sig-box"><div class="sig-line">Authorized Signatory</div></div>
      <div class="sig-box"><div class="sig-line">Company Seal</div></div>
    </div>
    <p style="text-align: center; margin-top: 20px; font-size: 10px; color: #666;">
      This certificate is issued in accordance with the Inland Revenue Act. Please retain for tax filing purposes.
    </p>
  </div>
</div>
`;

// GRN (Goods Receipt Note) Template
export const generateGRNTemplate = (): string => `
<style>${commonStyles}
.document-title { background: #ecfeff; color: #0e7490; }
.vendor-section { background: #ecfeff; border-left-color: #06b6d4; }
table.items-table th { background: #0891b2; }
</style>
<div class="document-container">
  <div class="document-header">
    <div class="header-row">
      <div class="logo-area">{{company_logo}}</div>
      <div class="company-details">
        <h1>{{company_name}}</h1>
        <p>{{company_address}}</p>
        <p>Tel: {{company_phone}} | Email: {{company_email}}</p>
      </div>
    </div>
  </div>

  <div class="document-body">
    <h2 class="document-title">GOODS RECEIPT NOTE (GRN)</h2>
    
    <div class="info-grid">
      <div class="info-section">
        <h3>GRN Details</h3>
        <div class="info-row"><span class="label">GRN No:</span><span class="value">{{grn_number}}</span></div>
        <div class="info-row"><span class="label">Date:</span><span class="value">{{grn_date}}</span></div>
        <div class="info-row"><span class="label">PO Reference:</span><span class="value">{{po_number}}</span></div>
        <div class="info-row"><span class="label">Delivery Note:</span><span class="value">{{delivery_note}}</span></div>
      </div>
      <div class="vendor-section">
        <h3>Supplier</h3>
        <p><strong>{{supplier_name}}</strong></p>
        <p>{{supplier_address}}</p>
        <p>Supplier Code: {{supplier_code}}</p>
      </div>
    </div>

    {{items}}

    <div class="info-grid" style="margin-top: 20px;">
      <div class="info-section">
        <h3>Receiving Details</h3>
        <div class="info-row"><span class="label">Received By:</span><span class="value">{{received_by}}</span></div>
        <div class="info-row"><span class="label">Location:</span><span class="value">{{warehouse}}</span></div>
        <div class="info-row"><span class="label">Condition:</span><span class="value">{{condition}}</span></div>
      </div>
      <div class="info-section">
        <h3>Quality Check</h3>
        <div class="info-row"><span class="label">Inspected By:</span><span class="value">{{inspected_by}}</span></div>
        <div class="info-row"><span class="label">QC Status:</span><span class="value">{{qc_status}}</span></div>
      </div>
    </div>

    <div class="footer-notes">
      <strong>Remarks:</strong> {{notes}}
    </div>
  </div>

  <div class="document-footer">
    <div class="signature-grid">
      <div class="sig-box"><div class="sig-line">Received By</div></div>
      <div class="sig-box"><div class="sig-line">Inspected By</div></div>
      <div class="sig-box"><div class="sig-line">Store Manager</div></div>
    </div>
  </div>
</div>
`;

// Export all templates as a map
export const defaultTemplates: Record<string, () => string> = {
  ar_invoice: generateARInvoiceTemplate,
  ar_receipt: generateARReceiptTemplate,
  ar_credit_note: generateARCreditNoteTemplate,
  ap_invoice: generateAPInvoiceTemplate,
  ap_payment_voucher: generateAPPaymentVoucherTemplate,
  ap_debit_note: generateAPDebitNoteTemplate,
  advance_receipt: generateAdvanceReceiptTemplate,
  advance_payment: generateAdvancePaymentTemplate,
  journal_voucher: generateJournalVoucherTemplate,
  cheque_voucher: generateChequeVoucherTemplate,
  wht_certificate: generateWHTCertificateTemplate,
  grn: generateGRNTemplate,
};

// Template display names
export const templateDisplayNames: Record<string, string> = {
  ar_invoice: "AR Invoice / Sales Invoice",
  ar_receipt: "AR Receipt / Sales Receipt",
  ar_credit_note: "AR Credit Note",
  ap_invoice: "AP Invoice / Purchase Invoice",
  ap_payment_voucher: "AP Payment Voucher",
  ap_debit_note: "AP Debit Note",
  advance_receipt: "Advance Payment Receipt",
  advance_payment: "Advance Payment Voucher",
  journal_voucher: "Journal Voucher",
  cheque_voucher: "Cheque Payment Voucher",
  wht_certificate: "WHT Certificate",
  grn: "Goods Receipt Note (GRN)",
};
