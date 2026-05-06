// Document Template Seeder - Professional CEO-grade templates for all 12 document types
// Each template uses modern CSS custom properties, rounded cards, signature pads, and print-optimized layout

// Common CSS shared across all templates - professional layout with CSS custom properties
const commonStyles = `
  :root {
    --ink: #1e293b;
    --muted: #64748b;
    --line: #e2e8f0;
    --bg: #ffffff;
    --accent: #2563eb;
    --accent-2: #1e40af;
    --chip: #eff6ff;
    --radius: 14px;
    --font: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin: 0;
    background: #f8fafc;
    color: var(--ink);
    font-family: var(--font);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    font-size: 13px;
    line-height: 1.5;
  }
  .page { max-width: 980px; margin: 28px auto; padding: 0 14px; }
  .doc {
    background: var(--bg);
    border: 1px solid var(--line);
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0,0,0,.04);
  }
  .header {
    padding: 24px 28px;
    display: grid;
    grid-template-columns: 1.2fr .8fr;
    gap: 18px;
    border-bottom: 1px solid var(--line);
    background: linear-gradient(180deg, rgba(37,99,235,0.04), rgba(255,255,255,0));
  }
  .brand {
    display: grid;
    grid-template-columns: 64px 1fr;
    gap: 16px;
    align-items: center;
  }
  .logo-container {
    width: 64px; height: 64px;
    border-radius: 14px;
    border: 1px solid var(--line);
    background: #fff;
    overflow: hidden;
    display: flex; align-items: center; justify-content: center;
  }
  .logo-container img {
    width: 100%; height: 100%; object-fit: contain; display: block;
  }
  .company h1 {
    margin: 0; font-size: 19px; line-height: 1.2;
    letter-spacing: -0.01em; font-weight: 800;
  }
  .company p {
    margin: 4px 0 0; color: var(--muted);
    font-size: 12px; line-height: 1.5; white-space: pre-line;
  }
  .meta {
    display: grid; justify-items: end;
    align-content: start; gap: 12px;
  }
  .title { text-align: right; }
  .title .label {
    font-size: 11px; color: var(--muted);
    letter-spacing: 0.15em; text-transform: uppercase; font-weight: 700;
  }
  .title .value {
    font-size: 22px; font-weight: 900; margin-top: 2px; color: var(--ink);
  }
  .chips { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
  .chip {
    font-size: 11px; padding: 6px 12px; border-radius: 999px;
    background: var(--chip); border: 1px solid rgba(37,99,235,0.2);
    color: var(--accent-2); font-weight: 700; white-space: nowrap;
  }
  .chip.gray {
    background: #f1f5f9; border-color: var(--line); color: var(--muted);
  }
  .status {
    display: inline-flex; align-items: center; gap: 8px;
    font-weight: 900; letter-spacing: .08em; text-transform: uppercase;
    font-size: 10px; padding: 6px 12px; border-radius: 999px;
    border: 1px solid var(--line); background: #fff;
  }
  .dot {
    width: 7px; height: 7px; border-radius: 999px; background: #10b981;
  }
  .body { padding: 24px 28px 20px; display: grid; gap: 20px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .card {
    border: 1px solid var(--line); border-radius: var(--radius);
    padding: 16px; background: #fff;
  }
  .card h3 {
    margin: 0 0 12px; font-size: 11px; letter-spacing: .15em;
    text-transform: uppercase; color: var(--muted); font-weight: 700;
  }
  .kv { display: grid; gap: 9px; }
  .row {
    display: grid; grid-template-columns: 140px 1fr;
    gap: 12px; align-items: baseline;
  }
  .k { color: var(--muted); font-size: 12px; }
  .v { font-size: 13px; font-weight: 700; color: var(--ink); }
  .payment-summary {
    border: 1px solid rgba(37,99,235,0.15);
    background: rgba(37,99,235,0.02);
    border-radius: var(--radius); padding: 16px; display: grid; gap: 8px;
  }
  .summary-line {
    display: flex; justify-content: space-between; align-items: baseline;
  }
  .summary-line .left { color: var(--muted); font-size: 12px; }
  .summary-line .right { font-weight: 700; font-size: 13px; }
  .total-box {
    margin-top: 8px; padding-top: 12px;
    border-top: 2px solid var(--accent);
    display: flex; justify-content: space-between; align-items: center;
  }
  .total-box .label {
    font-size: 12px; font-weight: 800; color: var(--accent-2);
    text-transform: uppercase; letter-spacing: 0.05em;
  }
  .total-box .value {
    font-size: 22px; font-weight: 950; color: var(--accent-2);
  }
  table {
    width: 100%; border-collapse: collapse;
    border: 1px solid var(--line); border-radius: var(--radius);
    overflow: hidden; background: #fff;
  }
  thead th {
    background: #f8fafc; color: var(--muted); font-size: 11px;
    letter-spacing: .1em; text-transform: uppercase;
    text-align: left; padding: 14px;
    border-bottom: 2px solid var(--line);
  }
  tbody td {
    padding: 14px; border-bottom: 1px solid var(--line);
    font-size: 13px; vertical-align: top;
  }
  tbody tr:last-child td { border-bottom: none; }
  .num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
  .notes-section {
    display: grid; gap: 8px; padding: 16px;
    border: 1px solid var(--line); border-radius: var(--radius); background: #fff;
  }
  .notes-section .label {
    font-size: 11px; letter-spacing: .15em;
    text-transform: uppercase; color: var(--muted); font-weight: 800;
  }
  .notes-section p { margin: 0; font-size: 13px; line-height: 1.6; color: var(--ink); }
  .amount-words {
    padding: 12px 16px; background: #fffbeb;
    border: 1px solid #fde68a; border-radius: var(--radius);
    font-style: italic; font-size: 12px; color: #92400e;
  }
  .footer {
    padding: 20px 28px 24px; border-top: 1px solid var(--line);
    background: #fff; display: grid; gap: 24px;
  }
  .sig-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .signature-pad { display: flex; flex-direction: column; gap: 10px; }
  .signature-area {
    border: 1px solid var(--line); border-radius: 12px;
    height: 80px; background: #fcfcfc;
    display: grid; place-items: center; position: relative;
    overflow: hidden;
  }
  .signature-area img {
    max-width: 90%; max-height: 70px; object-fit: contain;
  }
  .signature-area::after {
    content: 'SIGN HERE'; font-size: 9px; color: #cbd5e1;
    letter-spacing: 0.2em; position: absolute; bottom: 6px;
  }
  .sig-info { text-align: center; }
  .sig-info .name { font-size: 12px; font-weight: 700; color: var(--ink); margin-bottom: 2px; }
  .sig-info .role {
    font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em;
    color: var(--muted); font-weight: 600;
  }
  .bottom-bar {
    display: flex; justify-content: space-between;
    align-items: flex-end; padding-top: 10px;
  }
  .terms-column {
    max-width: 60%; font-size: 11px; color: var(--muted); line-height: 1.5;
  }
  .verification { text-align: right; }
  .qr-placeholder {
    width: 80px; height: 80px; border: 1px solid var(--line);
    border-radius: 8px; margin-left: auto; margin-bottom: 8px;
    display: grid; place-items: center; background: #fff;
    font-size: 9px; color: #cbd5e1; text-align: center;
  }
  .verification .printed {
    font-size: 10px; color: var(--muted); margin-top: 4px;
  }
  @media print {
    body { background: #fff; }
    .page { margin: 0; padding: 0; max-width: 100%; }
    .doc { box-shadow: none; border-radius: 0; border: none; }
    .header { border-top: 1px solid var(--line); }
  }
  @media (max-width: 840px) {
    .header { grid-template-columns: 1fr; }
    .meta { justify-items: start; }
    .title { text-align: left; }
    .chips { justify-content: flex-start; }
    .grid { grid-template-columns: 1fr; }
    .sig-row { grid-template-columns: 1fr 1fr; }
    .bottom-bar { flex-direction: column; align-items: flex-start; gap: 20px; }
    .terms-column { max-width: 100%; }
    .verification { text-align: left; }
    .qr-placeholder { margin-left: 0; }
  }
`;

// Helper to build the header block
const buildHeader = (docLabel: string, docNumberPlaceholder: string, docDatePlaceholder: string, chipLabel: string) => `
  <div class="header">
    <div class="brand">
      <div class="logo-container">{{company_logo}}</div>
      <div class="company">
        <h1>{{company_name}}</h1>
        <p>{{company_address}}
Tel: {{company_phone}} | Email: {{company_email}}</p>
      </div>
    </div>
    <div class="meta">
      <div class="title">
        <div class="label">${docLabel}</div>
        <div class="value">${docNumberPlaceholder}</div>
      </div>
      <div class="chips">
        <span class="chip">${chipLabel}</span>
        <span class="chip gray">Date: ${docDatePlaceholder}</span>
      </div>
      <div class="status">
        <span class="dot"></span>
        {{status}}
      </div>
    </div>
  </div>
`;

// Helper to build the footer/signature block
const buildFooter = (roles: string[]) => {
  const pads = roles.map(role => `
      <div class="signature-pad">
        <div class="signature-area"></div>
        <div class="sig-info">
          <div class="name">&nbsp;</div>
          <div class="role">${role}</div>
        </div>
      </div>`).join('');

  return `
  <div class="footer">
    <div class="sig-row">${pads}
    </div>
    <div class="bottom-bar">
      <div class="terms-column">
        <strong>Notes &amp; Terms:</strong><br>
        This document is electronically generated and remains valid with the associated digital logs.
      </div>
      <div class="verification">
        <div class="printed">Printed: {{print_date}}</div>
      </div>
    </div>
  </div>`;
};

// ==================== AR Invoice ====================
export const generateARInvoiceTemplate = (): string => `
<style>${commonStyles}</style>
<div class="page"><div class="doc">
  {{document_header}}
  ${buildHeader('Tax Invoice', '{{invoice_number}}', '{{invoice_date}}', 'Sales Invoice')}

  <div class="body">
    <div class="grid">
      <div class="card">
        <h3>Invoice Details</h3>
        <div class="kv">
          <div class="row"><span class="k">Invoice No</span><span class="v">{{invoice_number}}</span></div>
          <div class="row"><span class="k">Date</span><span class="v">{{invoice_date}}</span></div>
          <div class="row"><span class="k">Due Date</span><span class="v">{{due_date}}</span></div>
          <div class="row"><span class="k">Reference</span><span class="v">{{reference}}</span></div>
        </div>
      </div>
      <div class="card">
        <h3>Bill To</h3>
        <div class="kv">
          <div class="row"><span class="k">Customer</span><span class="v">{{customer_name}}</span></div>
          <div class="row"><span class="k">Address</span><span class="v">{{customer_address}}</span></div>
          <div class="row"><span class="k">Phone</span><span class="v">{{customer_phone}}</span></div>
          <div class="row"><span class="k">Email</span><span class="v">{{customer_email}}</span></div>
        </div>
      </div>
    </div>

    {{line_items}}

    <div class="payment-summary">
      <div class="summary-line"><span class="left">Subtotal</span><span class="right">{{subtotal}}</span></div>
      <div class="summary-line"><span class="left">Tax</span><span class="right">{{tax_amount}}</span></div>
      <div class="summary-line"><span class="left">Discount</span><span class="right">{{discount_amount}}</span></div>
      <div class="total-box">
        <span class="label">Total Due</span>
        <span class="value">{{total_amount}}</span>
      </div>
    </div>

    <div class="amount-words"><strong>Amount in Words:</strong> {{amount_in_words}}</div>

    <div class="notes-section">
      <div class="label">Notes</div>
      <p>{{notes}}</p>
    </div>
  </div>

  ${buildFooter(['Prepared By', 'Checked By', 'Authorized By', 'Customer Acknowledgment'])}
</div></div>
`;

// ==================== AR Receipt ====================
export const generateARReceiptTemplate = (): string => `
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
  .page { margin: 10px auto; max-width: 850px; background: #ffffff; padding: 30px; color: #000; }
  
  /* Use the common header styles for the logo */
  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
  .brand { display: flex; gap: 15px; align-items: center; }
  .logo-container { width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; }
  .logo-container img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .company h1 { margin: 0; font-size: 20px; color: #000; text-transform: uppercase; }
  .company p { margin: 4px 0 0; font-size: 11px; color: #333; line-height: 1.4; white-space: pre-line; }
  
  .meta { text-align: right; }
  .title .label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
  .title .value { font-size: 22px; font-weight: bold; color: #000; font-family: monospace; }
  .chips { margin-top: 8px; display: flex; gap: 6px; justify-content: flex-end; }
  .chip { padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; text-transform: uppercase; }
  .chip.gray { background: #f3f4f6; color: #4b5563; border-color: #e5e7eb; }
  
  table.voucher-table { width: 100%; border-collapse: collapse; border: 1px solid black; margin-bottom: 20px; font-size: 12px; }
  table.voucher-table td, table.voucher-table th { border: 1px solid black; padding: 6px; }
  h4.section-title { margin: 0 0 5px 0; font-size: 14px; font-weight: bold; text-transform: uppercase; }
  .amount-words-table { width: 100%; border-collapse: collapse; border: 1px solid black; margin-bottom: 20px; font-size: 12px; }
  .amount-words-table td { border: 1px solid black; padding: 6px; }
  .auth-table { width: 100%; border-collapse: collapse; border: 1px solid black; margin-bottom: 20px; font-size: 12px; }
  .auth-table th { border: 1px solid black; padding: 6px; text-align: center; width: 33.33%; font-weight: bold; }
  .auth-table td { border: 1px solid black; padding: 5px; height: 80px; position: relative; vertical-align: top; }
</style>
<div class="page">
  ${buildHeader('Official Receipt', '{{receipt_number}}', '{{receipt_date}}', 'AR Receipt')}

  <table class="voucher-table">
    <tr>
      <td style="width: 20%;">RECEIPT NO.</td>
      <td style="width: 45%;">{{receipt_number}}</td>
      <td style="width: 15%;">DATE</td>
      <td style="width: 20%; text-align: center;">{{receipt_date}}</td>
    </tr>
    <tr>
      <td>RECEIVED FROM</td>
      <td colspan="3">{{customer_name}}</td>
    </tr>
    <tr>
      <td>ADDRESS</td>
      <td colspan="3">{{customer_address}}</td>
    </tr>
    <tr>
      <td>REFERENCE</td>
      <td colspan="3">{{reference}}</td>
    </tr>
  </table>

  <h4 class="section-title">RECEIPT INFORMATION</h4>
  <table class="voucher-table">
    <tr>
      <td style="width: 20%;">PAYMENT METHOD</td>
      <td style="width: 30%;">{{payment_method}}</td>
      <td style="width: 20%;">TOTAL RECEIVED</td>
      <td style="width: 30%; font-weight: bold; font-size: 14px;">{{amount}}</td>
    </tr>
    <tr>
      <td>CHEQUE NO.</td>
      <td colspan="3">{{cheque_number}}</td>
    </tr>
  </table>

  {{allocations}}

  <h4 class="section-title">AMOUNT IN WORDS</h4>
  <table class="amount-words-table">
    <tr>
      <td style="width: 20%;">LKR (In Words)</td>
      <td style="width: 80%;">{{amount_in_words}}</td>
    </tr>
  </table>

  <div style="margin-bottom: 20px;">
    <strong>Notes:</strong><br/>
    {{notes}}
  </div>

  <h4 class="section-title">AUTHORISATION</h4>
  <table class="auth-table">
    <tr>
      <th>PREPARED BY</th>
      <th>CHECKED BY</th>
      <th>APPROVED BY</th>
    </tr>
    <tr>
      <td>
        <div style="position: absolute; top: 5px; left: 5px;">Name: {{prepared_by}}</div>
        <div style="position: absolute; bottom: 5px; left: 25px;">Signature: _________________</div>
        <div style="position: absolute; bottom: 15px; left: 85px;">{{prepared_by_signature}}</div>
      </td>
      <td>
        <div style="position: absolute; top: 5px; left: 5px;">Name: {{verified_by}}</div>
        <div style="position: absolute; bottom: 5px; left: 25px;">Signature: _________________</div>
        <div style="position: absolute; bottom: 15px; left: 85px;">{{verified_by_signature}}</div>
      </td>
      <td>
        <div style="position: absolute; top: 5px; left: 5px;">Name: {{approved_by}}</div>
        <div style="position: absolute; bottom: 5px; left: 25px;">Signature: _________________</div>
        <div style="position: absolute; bottom: 15px; left: 85px;">{{approved_by_signature}}</div>
      </td>
    </tr>
  </table>
</div>
`;

// ==================== AR Credit Note ====================
export const generateARCreditNoteTemplate = (): string => `
<style>${commonStyles}
  :root { --accent: #dc2626; --accent-2: #991b1b; --chip: #fef2f2; }
</style>
<div class="page"><div class="doc">
  ${buildHeader('Credit Note', '{{credit_note_number}}', '{{credit_date}}', 'AR Credit Note')}

  <div class="body">
    <div class="grid">
      <div class="card">
        <h3>Credit Note Details</h3>
        <div class="kv">
          <div class="row"><span class="k">Credit Note No</span><span class="v">{{credit_note_number}}</span></div>
          <div class="row"><span class="k">Date</span><span class="v">{{credit_date}}</span></div>
          <div class="row"><span class="k">Original Invoice</span><span class="v">{{original_invoice}}</span></div>
          <div class="row"><span class="k">Status</span><span class="v">{{status}}</span></div>
        </div>
      </div>
      <div class="card">
        <h3>Issued To</h3>
        <div class="kv">
          <div class="row"><span class="k">Customer</span><span class="v">{{customer_name}}</span></div>
          <div class="row"><span class="k">Customer Code</span><span class="v">{{customer_code}}</span></div>
        </div>
      </div>
    </div>

    <div class="payment-summary" style="border-color: rgba(220,38,38,0.2); background: rgba(220,38,38,0.02);">
      <div class="total-box" style="border-color: var(--accent);">
        <span class="label">Credit Amount</span>
        <span class="value">{{amount}}</span>
      </div>
    </div>

    <div class="amount-words"><strong>Amount in Words:</strong> {{amount_in_words}}</div>

    <div class="notes-section">
      <div class="label">Reason for Credit</div>
      <p>{{reason}}</p>
    </div>
  </div>

  ${buildFooter(['Prepared By', 'Approved By', 'Authorized By', 'Customer Acknowledgment'])}
</div></div>
`;

// ==================== AP Invoice ====================
export const generateAPInvoiceTemplate = (): string => `
<style>${commonStyles}
  :root { --accent: #1e3a5f; --accent-2: #334155; --chip: #f0f4f8; }
  .card { border-left: 3px solid #cbd5e1 !important; }
</style>
<div class="page"><div class="doc">
  {{document_header}}
  ${buildHeader('Purchase Invoice', '{{invoice_number}}', '{{invoice_date}}', 'AP Invoice')}

  <div class="body">
    <div class="grid">
      <div class="card">
        <h3>Invoice Details</h3>
        <div class="kv">
          <div class="row"><span class="k">Invoice No</span><span class="v">{{invoice_number}}</span></div>
          <div class="row"><span class="k">Date</span><span class="v">{{invoice_date}}</span></div>
          <div class="row"><span class="k">Due Date</span><span class="v">{{due_date}}</span></div>
          <div class="row"><span class="k">Reference</span><span class="v">{{reference}}</span></div>
        </div>
      </div>
      <div class="card">
        <h3>Supplier / Vendor</h3>
        <div class="kv">
          <div class="row"><span class="k">Vendor</span><span class="v">{{vendor_name}}</span></div>
          <div class="row"><span class="k">Address</span><span class="v">{{vendor_address}}</span></div>
          <div class="row"><span class="k">Vendor Code</span><span class="v">{{vendor_code}}</span></div>
        </div>
      </div>
    </div>

    {{line_items}}

    <div class="payment-summary" style="border-color: rgba(30,58,95,0.15); background: #f8fafc;">
      <div class="summary-line"><span class="left">Subtotal</span><span class="right">{{subtotal}}</span></div>
      <div class="summary-line"><span class="left">Tax</span><span class="right">{{tax_amount}}</span></div>
      <div class="summary-line"><span class="left">WHT</span><span class="right">{{wht_amount}}</span></div>
      <div class="total-box" style="border-color: #1e3a5f; background: #f0f4f8;">
        <span class="label">Total Payable</span>
        <span class="value">{{total_amount}}</span>
      </div>
      <div class="summary-line" style="margin-top: 8px;"><span class="left">Balance Due</span><span class="right" style="font-size: 15px;">{{balance_due}}</span></div>
    </div>

    <div class="amount-words" style="background: #eef2f7; border-left: 3px solid #1e3a5f;"><strong>Amount in Words:</strong> {{amount_in_words}}</div>

    <div class="notes-section">
      <div class="label">Notes</div>
      <p>{{notes}}</p>
    </div>
  </div>

  <div class="footer">
    <div class="sig-row">
      <div class="signature-pad">
        <div class="signature-area">{{received_by_signature}}</div>
        <div class="sig-info">
          <div class="name">{{received_by}}</div>
          <div class="role">Received By</div>
        </div>
      </div>
      <div class="signature-pad">
        <div class="signature-area">{{verified_by_signature}}</div>
        <div class="sig-info">
          <div class="name">{{verified_by}}</div>
          <div class="role">Verified By</div>
        </div>
      </div>
      <div class="signature-pad">
        <div class="signature-area">{{approved_by_signature}}</div>
        <div class="sig-info">
          <div class="name">{{approved_by}}</div>
          <div class="role">Authorized By</div>
        </div>
      </div>
      <div class="signature-pad">
        <div class="signature-area"></div>
        <div class="sig-info">
          <div class="name">&nbsp;</div>
          <div class="role">Vendor Acknowledgment</div>
        </div>
      </div>
    </div>
    <div class="bottom-bar">
      <div class="terms-column">
        <strong>Notes &amp; Terms:</strong><br>
        This document is electronically generated and remains valid with the associated digital logs.
      </div>
      <div class="verification">
        <div class="qr-placeholder">QR VERIFY</div>
        <div class="printed">Printed: {{print_date}}</div>
      </div>
    </div>
  </div>
</div></div>
`;

// ==================== AP Payment Voucher ====================
export const generateAPPaymentVoucherTemplate = (): string => `
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
  .page { margin: 10px auto; max-width: 850px; background: #ffffff; padding: 30px; color: #000; }
  .header-container { text-align: center; margin-bottom: 20px; }
  .header-container h2 { margin: 0; font-size: 24px; text-transform: uppercase; font-weight: bold; }
  .header-container h3 { margin: 5px 0 0 0; font-size: 16px; text-transform: uppercase; font-weight: bold; }
  table.voucher-table { width: 100%; border-collapse: collapse; border: 1px solid black; margin-bottom: 20px; font-size: 12px; }
  table.voucher-table td, table.voucher-table th { border: 1px solid black; padding: 6px; }
  h4.section-title { margin: 0 0 5px 0; font-size: 14px; font-weight: bold; text-transform: uppercase; }
  .amount-words-table { width: 100%; border-collapse: collapse; border: 1px solid black; margin-bottom: 20px; font-size: 12px; }
  .amount-words-table td { border: 1px solid black; padding: 6px; }
  .auth-table { width: 100%; border-collapse: collapse; border: 1px solid black; margin-bottom: 20px; font-size: 12px; }
  .auth-table th { border: 1px solid black; padding: 6px; text-align: center; width: 33.33%; font-weight: bold; }
  .auth-table td { border: 1px solid black; padding: 5px; height: 80px; position: relative; vertical-align: top; }
</style>
<div class="page">
  <div class="header-container">
    <h2>NCG HOLDINGS PRIVATE LIMITED</h2>
    <h3>{{voucher_title}}</h3>
  </div>

  <table class="voucher-table">
    <tr>
      <td style="width: 20%;">VOUCHER NO.</td>
      <td style="width: 45%;">{{payment_number}}</td>
      <td style="width: 15%;">DATE</td>
      <td style="width: 20%; text-align: center;">{{payment_date}}</td>
    </tr>
    <tr>
      <td>ISSUED TO</td>
      <td colspan="3">{{vendor_name}}</td>
    </tr>
  </table>

  <h4 class="section-title">PAYMENT INFORMATION</h4>
  <table class="voucher-table">
    <tr>
      <td style="width: 20%;">PAYMENT METHOD</td>
      <td style="width: 30%;">{{payment_method}}</td>
      <td style="width: 20%;">BANK</td>
      <td style="width: 30%;">{{source_bank}}</td>
    </tr>
    <tr>
      <td>REF / CHEQUE NO.</td>
      <td>{{cheque_number}}</td>
      <td colspan="2"></td>
    </tr>
    <tr>
      <td>{{date_label}}</td>
      <td style="text-align: right;">{{date_value}}</td>
      <td>ACCOUNT NO</td>
      <td>{{source_account_number}}</td>
    </tr>
  </table>

  {{beneficiary_bank_details}}

  {{allocations}}

  <h4 class="section-title">AMOUNT IN WORDS</h4>
  <table class="amount-words-table">
    <tr>
      <td style="width: 20%;">LKR (In Words)</td>
      <td style="width: 80%;">{{amount_in_words}}</td>
    </tr>
  </table>

  <h4 class="section-title">AUTHORISATION</h4>
  <table class="auth-table">
    <tr>
      <th>PREPARED BY</th>
      <th>CHECKED BY</th>
      <th>APPROVED BY</th>
    </tr>
    <tr>
      <td>
        <div style="position: absolute; top: 5px; left: 5px;">Name: {{prepared_by}}</div>
        <div style="position: absolute; bottom: 5px; left: 25px;">Signature: _________________</div>
        <div style="position: absolute; bottom: 15px; left: 85px;">{{prepared_by_signature}}</div>
      </td>
      <td>
        <div style="position: absolute; top: 5px; left: 5px;">Name: {{verified_by}}</div>
        <div style="position: absolute; bottom: 5px; left: 25px;">Signature: _________________</div>
        <div style="position: absolute; bottom: 15px; left: 85px;">{{verified_by_signature}}</div>
      </td>
      <td>
        <div style="position: absolute; top: 5px; left: 5px;">Name: {{approved_by}}</div>
        <div style="position: absolute; bottom: 5px; left: 25px;">Signature: _________________</div>
        <div style="position: absolute; bottom: 15px; left: 85px;">{{approved_by_signature}}</div>
      </td>
    </tr>
  </table>

  {{payment_received_by}}

</div>
`;

// ==================== AP Debit Note ====================
export const generateAPDebitNoteTemplate = (): string => `
<style>${commonStyles}
  :root { --accent: #dc2626; --accent-2: #b91c1c; --chip: #fef2f2; }
</style>
<div class="page"><div class="doc">
  ${buildHeader('Debit Note', '{{debit_note_number}}', '{{debit_date}}', 'AP Debit Note')}

  <div class="body">
    <div class="grid">
      <div class="card">
        <h3>Debit Note Details</h3>
        <div class="kv">
          <div class="row"><span class="k">Debit Note No</span><span class="v">{{debit_note_number}}</span></div>
          <div class="row"><span class="k">Date</span><span class="v">{{debit_date}}</span></div>
          <div class="row"><span class="k">Original Invoice</span><span class="v">{{original_invoice}}</span></div>
          <div class="row"><span class="k">Status</span><span class="v">{{status}}</span></div>
        </div>
      </div>
      <div class="card">
        <h3>Issued To Vendor</h3>
        <div class="kv">
          <div class="row"><span class="k">Vendor</span><span class="v">{{vendor_name}}</span></div>
          <div class="row"><span class="k">Vendor Code</span><span class="v">{{vendor_code}}</span></div>
        </div>
      </div>
    </div>

    <div class="payment-summary" style="border-color: rgba(220,38,38,0.2); background: rgba(220,38,38,0.02);">
      <div class="total-box" style="border-color: var(--accent);">
        <span class="label">Debit Amount</span>
        <span class="value">{{amount}}</span>
      </div>
    </div>

    <div class="amount-words"><strong>Amount in Words:</strong> {{amount_in_words}}</div>

    <div class="notes-section">
      <div class="label">Reason for Debit</div>
      <p>{{reason}}</p>
    </div>
  </div>

  ${buildFooter(['Prepared By', 'Approved By', 'Authorized By', 'Vendor Acknowledgment'])}
</div></div>
`;

// ==================== Advance Receipt ====================
export const generateAdvanceReceiptTemplate = (): string => `
<style>${commonStyles}
  :root { --accent: #047857; --accent-2: #065f46; --chip: #ecfdf5; }
</style>
<div class="page"><div class="doc">
  ${buildHeader('Advance Payment Receipt', '{{receipt_number}}', '{{receipt_date}}', 'Advance Receipt')}

  <div class="body">
    <div class="grid">
      <div class="card">
        <h3>Receipt Details</h3>
        <div class="kv">
          <div class="row"><span class="k">Receipt No</span><span class="v">{{receipt_number}}</span></div>
          <div class="row"><span class="k">Date</span><span class="v">{{receipt_date}}</span></div>
          <div class="row"><span class="k">Reference</span><span class="v">{{reference}}</span></div>
        </div>
      </div>
      <div class="card">
        <h3>Received From</h3>
        <div class="kv">
          <div class="row"><span class="k">Customer</span><span class="v">{{customer_name}}</span></div>
          <div class="row"><span class="k">Address</span><span class="v">{{customer_address}}</span></div>
        </div>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <h3>Payment Method</h3>
        <div class="kv">
          <div class="row"><span class="k">Method</span><span class="v">{{payment_method}}</span></div>
          <div class="row"><span class="k">Cheque No</span><span class="v">{{cheque_number}}</span></div>
        </div>
      </div>
      <div class="payment-summary" style="border-color: rgba(4,120,87,0.2); background: rgba(4,120,87,0.02);">
        <div class="total-box" style="border-color: var(--accent);">
          <span class="label">Advance Amount</span>
          <span class="value">{{amount}}</span>
        </div>
      </div>
    </div>

    <div class="amount-words"><strong>Amount in Words:</strong> {{amount_in_words}}</div>

    <div class="card" style="background: #fffbeb; border-color: #fde68a;">
      <h3 style="color: #92400e;">Advance Payment Notice</h3>
      <p style="margin: 0; font-size: 12px; color: #92400e;">This receipt acknowledges advance payment. The amount will be adjusted against future invoices.</p>
    </div>

    <div class="notes-section">
      <div class="label">Notes</div>
      <p>{{notes}}</p>
    </div>
  </div>

  ${buildFooter(['Received By', 'Cashier', 'Authorized By', 'Customer Signature'])}
</div></div>
`;

// ==================== Advance Payment Voucher ====================
export const generateAdvancePaymentTemplate = (): string => `
<style>${commonStyles}
  :root { --accent: #a16207; --accent-2: #854d0e; --chip: #fefce8; }
</style>
<div class="page"><div class="doc">
  ${buildHeader('Advance Payment Voucher', '{{payment_number}}', '{{payment_date}}', 'Advance Payment')}

  <div class="body">
    <div class="grid">
      <div class="card">
        <h3>Voucher Details</h3>
        <div class="kv">
          <div class="row"><span class="k">Voucher No</span><span class="v">{{payment_number}}</span></div>
          <div class="row"><span class="k">Date</span><span class="v">{{payment_date}}</span></div>
          <div class="row"><span class="k">Reference</span><span class="v">{{reference}}</span></div>
        </div>
      </div>
      <div class="card">
        <h3>Pay To</h3>
        <div class="kv">
          <div class="row"><span class="k">Vendor</span><span class="v">{{vendor_name}}</span></div>
          <div class="row"><span class="k">Address</span><span class="v">{{vendor_address}}</span></div>
        </div>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <h3>Payment Method</h3>
        <div class="kv">
          <div class="row"><span class="k">Method</span><span class="v">{{payment_method}}</span></div>
          <div class="row"><span class="k">Cheque No</span><span class="v">{{cheque_number}}</span></div>
        </div>
      </div>
      <div class="payment-summary" style="border-color: rgba(161,98,7,0.2); background: rgba(161,98,7,0.02);">
        <div class="total-box" style="border-color: var(--accent);">
          <span class="label">Advance Amount</span>
          <span class="value">{{amount}}</span>
        </div>
      </div>
    </div>

    <div class="amount-words"><strong>Amount in Words:</strong> {{amount_in_words}}</div>

    <div class="card" style="background: #fffbeb; border-color: #fde68a;">
      <h3 style="color: #92400e;">Advance Payment Notice</h3>
      <p style="margin: 0; font-size: 12px; color: #92400e;">This voucher represents an advance payment. The amount will be adjusted against future invoices from this vendor.</p>
    </div>

    <div class="notes-section">
      <div class="label">Notes</div>
      <p>{{notes}}</p>
    </div>
  </div>

  ${buildFooter(['Prepared By', 'Approved By', 'Authorized By', 'Received By (Payee)'])}
</div></div>
`;

// ==================== Journal Voucher ====================
export const generateJournalVoucherTemplate = (): string => `
<style>${commonStyles}
  :root { --accent: #1d4ed8; --accent-2: #1e40af; --chip: #eff6ff; }
</style>
<div class="page"><div class="doc">
  ${buildHeader('Journal Voucher', '{{voucher_number}}', '{{voucher_date}}', 'Journal Entry')}

  <div class="body">
    <div class="grid">
      <div class="card">
        <h3>Voucher Details</h3>
        <div class="kv">
          <div class="row"><span class="k">Voucher No</span><span class="v">{{voucher_number}}</span></div>
          <div class="row"><span class="k">Date</span><span class="v">{{voucher_date}}</span></div>
          <div class="row"><span class="k">Reference</span><span class="v">{{reference}}</span></div>
          <div class="row"><span class="k">Status</span><span class="v">{{status}}</span></div>
        </div>
      </div>
      <div class="card">
        <h3>Description</h3>
        <p style="margin: 0; font-size: 13px; line-height: 1.6;">{{description}}</p>
      </div>
    </div>

    {{journal_lines}}

    <div class="payment-summary">
      <div class="summary-line"><span class="left">Total Debit</span><span class="right">{{total_debit}}</span></div>
      <div class="summary-line"><span class="left">Total Credit</span><span class="right">{{total_credit}}</span></div>
      <div class="total-box">
        <span class="label">Difference</span>
        <span class="value">{{difference}}</span>
      </div>
    </div>

    <div class="notes-section">
      <div class="label">Notes</div>
      <p>{{notes}}</p>
    </div>
  </div>

  ${buildFooter(['Prepared By', 'Checked By', 'Approved By', 'Posted By'])}
</div></div>
`;

// ==================== Cheque Voucher ====================
export const generateChequeVoucherTemplate = (): string => `
<style>${commonStyles}
  :root { --accent: #166534; --accent-2: #14532d; --chip: #f0fdf4; }
  .cheque-card {
    border: 2px dashed #22c55e; background: #f0fdf4;
    border-radius: var(--radius); padding: 16px;
  }
  .cheque-card h3 { margin: 0 0 12px; font-size: 11px; letter-spacing: .15em; text-transform: uppercase; color: #166534; font-weight: 700; }
</style>
<div class="page"><div class="doc">
  ${buildHeader('Cheque Payment Voucher', '{{voucher_number}}', '{{voucher_date}}', 'Cheque Voucher')}

  <div class="body">
    <div class="grid">
      <div class="card">
        <h3>Voucher Details</h3>
        <div class="kv">
          <div class="row"><span class="k">Voucher No</span><span class="v">{{voucher_number}}</span></div>
          <div class="row"><span class="k">Date</span><span class="v">{{voucher_date}}</span></div>
          <div class="row"><span class="k">Reference</span><span class="v">{{reference}}</span></div>
        </div>
      </div>
      <div class="card">
        <h3>Payee Details</h3>
        <div class="kv">
          <div class="row"><span class="k">Payee</span><span class="v">{{payee_name}}</span></div>
          <div class="row"><span class="k">Address</span><span class="v">{{payee_address}}</span></div>
        </div>
      </div>
    </div>

    <div class="cheque-card">
      <h3>Cheque Information</h3>
      <div class="grid">
        <div class="kv">
          <div class="row"><span class="k">Cheque No</span><span class="v">{{cheque_number}}</span></div>
          <div class="row"><span class="k">Bank</span><span class="v">{{bank_name}}</span></div>
        </div>
        <div class="kv">
          <div class="row"><span class="k">Cheque Date</span><span class="v">{{cheque_date}}</span></div>
          <div class="row"><span class="k">Account</span><span class="v">{{bank_account}}</span></div>
        </div>
      </div>
    </div>

    <div class="payment-summary" style="border-color: rgba(22,101,52,0.2); background: rgba(22,101,52,0.02);">
      <div class="total-box" style="border-color: var(--accent);">
        <span class="label">Cheque Amount</span>
        <span class="value">{{amount}}</span>
      </div>
    </div>

    <div class="amount-words"><strong>Amount in Words:</strong> {{amount_in_words}}</div>

    <div class="notes-section">
      <div class="label">Notes</div>
      <p>{{notes}}</p>
    </div>
  </div>

  ${buildFooter(['Prepared By', 'Approved By', 'Authorized By', 'Received By (Payee)'])}
</div></div>
`;

// ==================== WHT Certificate ====================
export const generateWHTCertificateTemplate = (): string => `
<style>${commonStyles}
  :root { --accent: #991b1b; --accent-2: #7f1d1d; --chip: #fef2f2; }
  .wht-table { border: 2px solid #dc2626; border-radius: var(--radius); overflow: hidden; }
  .wht-table thead th { background: #fee2e2; color: #991b1b; border-bottom: 2px solid #fecaca; }
  .wht-table tbody td { border-bottom: 1px solid #fecaca; }
</style>
<div class="page"><div class="doc">
  ${buildHeader('WHT Certificate', '{{certificate_number}}', '{{certificate_date}}', 'Withholding Tax')}

  <div class="body">
    <div class="grid">
      <div class="card">
        <h3>Certificate Details</h3>
        <div class="kv">
          <div class="row"><span class="k">Certificate No</span><span class="v">{{certificate_number}}</span></div>
          <div class="row"><span class="k">Date</span><span class="v">{{certificate_date}}</span></div>
          <div class="row"><span class="k">Tax Period</span><span class="v">{{tax_period}}</span></div>
        </div>
      </div>
      <div class="card">
        <h3>Payee (Tax Withheld From)</h3>
        <div class="kv">
          <div class="row"><span class="k">Vendor</span><span class="v">{{vendor_name}}</span></div>
          <div class="row"><span class="k">TIN</span><span class="v">{{vendor_tax_id}}</span></div>
          <div class="row"><span class="k">Address</span><span class="v">{{vendor_address}}</span></div>
        </div>
      </div>
    </div>

    <table class="wht-table">
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align:right;">Gross Amount</th>
          <th style="text-align:center;">WHT Rate</th>
          <th style="text-align:right;">WHT Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{{payment_description}}</td>
          <td class="num">{{gross_amount}}</td>
          <td style="text-align:center;">{{wht_rate}}</td>
          <td class="num" style="font-weight:800;">{{wht_amount}}</td>
        </tr>
      </tbody>
    </table>

    <div class="amount-words"><strong>WHT Amount in Words:</strong> {{amount_in_words}}</div>

    <div class="grid">
      <div class="card">
        <h3>Related Invoice / Payment</h3>
        <div class="kv">
          <div class="row"><span class="k">Invoice No</span><span class="v">{{invoice_number}}</span></div>
          <div class="row"><span class="k">Payment Voucher</span><span class="v">{{payment_voucher}}</span></div>
        </div>
      </div>
      <div class="card" style="background: #fef2f2; border-color: #fecaca;">
        <h3 style="color: #991b1b;">Tax Authority Notice</h3>
        <p style="margin: 0; font-size: 11px; color: #991b1b; line-height: 1.6;">This certificate is issued in accordance with the Inland Revenue Act. Please retain for tax filing purposes.</p>
      </div>
    </div>
  </div>

  ${buildFooter(['Prepared By', 'Authorized Signatory', 'Company Seal', 'Payee Acknowledgment'])}
</div></div>
`;

// ==================== GRN ====================
export const generateGRNTemplate = (): string => `
<style>${commonStyles}
  :root { --accent: #0891b2; --accent-2: #0e7490; --chip: #ecfeff; }
</style>
<div class="page"><div class="doc">
  ${buildHeader('Goods Receipt Note', '{{grn_number}}', '{{grn_date}}', 'GRN')}

  <div class="body">
    <div class="grid">
      <div class="card">
        <h3>GRN Details</h3>
        <div class="kv">
          <div class="row"><span class="k">GRN No</span><span class="v">{{grn_number}}</span></div>
          <div class="row"><span class="k">Date</span><span class="v">{{grn_date}}</span></div>
          <div class="row"><span class="k">PO Reference</span><span class="v">{{po_number}}</span></div>
          <div class="row"><span class="k">Delivery Note</span><span class="v">{{delivery_note}}</span></div>
        </div>
      </div>
      <div class="card">
        <h3>Supplier</h3>
        <div class="kv">
          <div class="row"><span class="k">Supplier</span><span class="v">{{supplier_name}}</span></div>
          <div class="row"><span class="k">Address</span><span class="v">{{supplier_address}}</span></div>
          <div class="row"><span class="k">Supplier Code</span><span class="v">{{supplier_code}}</span></div>
        </div>
      </div>
    </div>

    {{items}}

    <div class="grid">
      <div class="card">
        <h3>Receiving Details</h3>
        <div class="kv">
          <div class="row"><span class="k">Received By</span><span class="v">{{received_by}}</span></div>
          <div class="row"><span class="k">Location</span><span class="v">{{warehouse}}</span></div>
          <div class="row"><span class="k">Condition</span><span class="v">{{condition}}</span></div>
        </div>
      </div>
      <div class="card">
        <h3>Quality Check</h3>
        <div class="kv">
          <div class="row"><span class="k">Inspected By</span><span class="v">{{inspected_by}}</span></div>
          <div class="row"><span class="k">QC Status</span><span class="v">{{qc_status}}</span></div>
        </div>
      </div>
    </div>

    <div class="notes-section">
      <div class="label">Remarks</div>
      <p>{{notes}}</p>
    </div>
  </div>

  ${buildFooter(['Received By', 'Inspected By', 'Store Manager', 'Authorized By'])}
</div></div>
`;

// ==================== Tax Invoice (Sri Lanka Government Format) ====================
export const generateTaxInvoiceTemplate = (): string => `
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Times New Roman", "Calibri", serif;
    font-size: 13px;
    color: #000;
    background: #fff;
    -webkit-print-color-adjust: exact;
  }
  .tax-invoice-container { width: 800px; margin: 0 auto; padding: 20px; }
  .tax-invoice-page { width: 100%; border: 2px solid #000; padding: 0; background: #fff; }
  .ti-title { text-align: center; font-size: 22px; font-weight: bold; padding: 15px 0 10px; text-decoration: underline; letter-spacing: 2px; }
  .ti-row { display: flex; border-top: 1px solid #000; }
  .ti-row .ti-cell { flex: 1; padding: 8px 12px; border-right: 1px solid #000; font-size: 13px; }
  .ti-row .ti-cell:last-child { border-right: none; }
  .ti-two-blocks { display: flex; border-top: 1px solid #000; }
  .ti-two-blocks .ti-block-half { flex: 1; padding: 10px 12px; }
  .ti-two-blocks .ti-block-half:first-child { border-right: 1px solid #000; }
  .ti-block { border-top: 1px solid #000; padding: 10px 12px; }
  .ti-block-row { display: flex; margin: 3px 0; }
  .ti-block-label { font-weight: bold; min-width: 160px; flex-shrink: 0; }
  .ti-block-value { flex: 1; }
  table.ti-items { width: 100%; border-collapse: collapse; border-top: 1px solid #000; }
  table.ti-items th { background: #f0f0f0; font-weight: bold; text-align: center; padding: 10px 6px; border: 1px solid #000; font-size: 12px; }
  table.ti-items td { font-size: 13px; padding: 8px 6px; border: 1px solid #000; }
  .ti-totals { border-top: 2px solid #000; }
  .ti-totals-row { display: flex; border-bottom: 1px solid #000; }
  .ti-totals-row:last-child { border-bottom: none; }
  .ti-totals-label { flex: 1; padding: 8px 12px; font-weight: bold; border-right: 1px solid #000; }
  .ti-totals-value { width: 200px; text-align: right; padding: 8px 12px; font-weight: bold; }
  .ti-words-row { border-top: 1px solid #000; padding: 10px 12px; }
  .ti-words-label { font-weight: bold; margin-bottom: 4px; }
  .ti-words-value { text-transform: uppercase; font-weight: bold; font-size: 12px; }
  .ti-payment-row { border-top: 1px solid #000; padding: 8px 12px; display: flex; }
  .ti-footer-ref { border-top: 1px solid #000; padding: 6px 12px; font-size: 10px; color: #666; text-align: right; }
  .ti-signatures { border-top: 2px solid #000; display: flex; padding: 20px 12px 30px; justify-content: space-between; }
  .ti-sig-box { flex: 1; text-align: center; padding: 0 10px; }
  .ti-sig-line { border-bottom: 1px solid #000; height: 60px; margin: 0 15px 8px; }
  .ti-sig-label { font-weight: bold; font-size: 12px; }
  @media print { body { margin: 0; } .tax-invoice-container { width: 100%; padding: 0; } }
</style>
<div class="tax-invoice-container">
  <div class="tax-invoice-page">
    <div class="ti-title">Tax Invoice</div>

    <div class="ti-row">
      <div class="ti-cell"><strong>Date of Invoice :</strong> {{invoice_date}}</div>
      <div class="ti-cell"><strong>Tax Invoice No. :</strong> {{tax_invoice_no}}</div>
    </div>

    <div class="ti-two-blocks">
      <div class="ti-block-half">
        <div class="ti-block-row"><span class="ti-block-label">Supplier's TIN :</span><span class="ti-block-value">{{supplier_tin}}</span></div>
        <div class="ti-block-row"><span class="ti-block-label">Name :</span><span class="ti-block-value">{{supplier_name}}</span></div>
        <div class="ti-block-row"><span class="ti-block-label">Address :</span><span class="ti-block-value">{{supplier_address}}</span></div>
        <div class="ti-block-row"><span class="ti-block-label">Telephone No. :</span><span class="ti-block-value">{{supplier_phone}}</span></div>
      </div>
      <div class="ti-block-half">
        <div class="ti-block-row"><span class="ti-block-label">Purchaser's TIN :</span><span class="ti-block-value">{{purchaser_tin}}</span></div>
        <div class="ti-block-row"><span class="ti-block-label">Name :</span><span class="ti-block-value">{{purchaser_name}}</span></div>
        <div class="ti-block-row"><span class="ti-block-label">Address :</span><span class="ti-block-value">{{purchaser_address}}</span></div>
        <div class="ti-block-row"><span class="ti-block-label">Telephone No. :</span><span class="ti-block-value">{{purchaser_phone}}</span></div>
      </div>
    </div>

    <div class="ti-row">
      <div class="ti-cell"><strong>Date of Delivery :</strong> {{date_of_delivery}}</div>
      <div class="ti-cell"><strong>Place of Supply :</strong> {{place_of_supply}}</div>
    </div>

    <div class="ti-block" style="min-height:40px;">
      <div class="ti-block-row"><span class="ti-block-label">Additional Information :</span><span class="ti-block-value">{{additional_information}}</span></div>
    </div>

    <table class="ti-items">
      <thead>
        <tr>
          <th style="width:10%">Reference</th>
          <th style="width:40%">Description of Goods or Services</th>
          <th style="width:10%">Quantity</th>
          <th style="width:18%">Unit Price</th>
          <th style="width:22%">Amount Excluding<br/>VAT (Rs.)</th>
        </tr>
      </thead>
      <tbody>
        {{line_items}}
      </tbody>
    </table>

    <div class="ti-totals">
      <div class="ti-totals-row">
        <div class="ti-totals-label">Total Value of Supply</div>
        <div class="ti-totals-value">{{total_value_of_supply}}</div>
      </div>
      <div class="ti-totals-row">
        <div class="ti-totals-label">VAT Amount (Total Value of Supply @ {{vat_rate}}%)</div>
        <div class="ti-totals-value">{{vat_amount}}</div>
      </div>
      <div class="ti-totals-row" style="background:#f0f0f0; font-size:15px;">
        <div class="ti-totals-label">Total Amount including VAT</div>
        <div class="ti-totals-value">{{total_including_vat}}</div>
      </div>
    </div>

    <div class="ti-words-row">
      <div class="ti-words-label">Total Amount in words :</div>
      <div class="ti-words-value">{{total_in_words}}</div>
    </div>

    <div class="ti-payment-row">
      <span class="ti-block-label">Mode of Payment :</span>
      <span class="ti-block-value">{{mode_of_payment}}</span>
    </div>

    <div class="ti-footer-ref">EOG 02/04/05</div>

    <div class="ti-signatures">
      <div class="ti-sig-box">
        <div class="ti-sig-line"></div>
        <div class="ti-sig-label">Prepared By</div>
      </div>
      <div class="ti-sig-box">
        <div class="ti-sig-line"></div>
        <div class="ti-sig-label">Approved By</div>
      </div>
      <div class="ti-sig-box">
        <div class="ti-sig-line"></div>
        <div class="ti-sig-label">Customer</div>
      </div>
    </div>
  </div>
</div>
`;
// ==================== Petty Cash Voucher ====================
export const generatePettyCashVoucherTemplate = (): string => `
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #fff; color: #000; font-size: 13px; }
  .page { margin: 20px auto; max-width: 800px; padding: 20px 40px; }
  .header-grid { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px; }
  .logo-area { display: flex; align-items: center; }
  
  /* HIGH SPECIFICITY TO BEAT GLOBAL ERP OVERRIDES */
  img#strict-ncg-logo {
    width: 200px !important;
    max-height: 40px !important;
    min-height: 40px !important;
    height: 40px !important;
    object-fit: contain !important;
    object-position: left !important;
  }
  
  .company-info { text-align: right; }
  .company-name { font-size: 20px; font-weight: bold; margin: 0; }
  .company-address { font-size: 11px; margin: 2px 0; }
  
  .title-container { display: flex; justify-content: center; align-items: flex-end; position: relative; margin-top: 10px; margin-bottom: 5px; }
  .doc-title { text-align: center; font-size: 16px; font-weight: bold; }
  .doc-meta-right { position: absolute; right: 0; bottom: 0; font-size: 10px; }
  
  table.meta-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 13px; }
  table.meta-table td { border: 1px solid #000; padding: 6px; }
  .meta-table td:nth-child(odd) { width: 15%; font-weight: normal; }
  .meta-table td:nth-child(even) { width: 35%; }

  table.main-table { width: 100%; border-collapse: collapse; font-size: 13px; border-bottom: none; }
  table.main-table th { border: 1px solid #000; padding: 6px; background: #e0e0e0; font-weight: bold; text-align: center; }
  table.main-table td { border: 1px solid #000; padding: 6px; }
  .main-table .col-code { width: 25%; text-align: center; }
  .main-table .col-desc { width: 55%; text-align: left; }
  .main-table .col-amount { width: 20%; text-align: right; }
  
  /* Ensure fixed height for empty rows to fill space */
  .empty-row td { height: 35px; }
  
  table.total-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 13px; border-top: none; }
  table.total-table td { border: 1px solid #000; padding: 6px; }
  .total-table .total-label { width: 80%; text-align: right; background: #e0e0e0; font-weight: bold; }
  .total-table .total-value { width: 20%; text-align: right; font-weight: bold; }

  table.words-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 13px; }
  table.words-table td { border: 1px solid #000; padding: 6px; }
  .words-table .words-label { width: 20%; font-weight: bold; }
  .words-table .words-value { width: 80%; }

  .note { font-style: italic; font-size: 11px; font-weight: bold; margin-bottom: 15px; }
  
  table.sig-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 13px; text-align: center; }
  table.sig-table th { font-weight: bold; font-style: italic; padding-bottom: 20px; }
  table.sig-table td { vertical-align: bottom; padding: 10px 5px; }
  .dotted-line { border-bottom: 1px dotted #000; display: inline-block; width: 80%; height: 15px; margin-top: 5px; }
  .sig-row-label { text-align: left; font-weight: normal; width: 10%; }

  table.footer-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
  table.footer-table td { border: 1px solid #000; padding: 4px; text-align: center; width: 33.33%; }
</style>
<div class="page">
  <div class="header-grid">
    <div class="logo-area">
      <img id="strict-ncg-logo" src="{{ncg_master_logo}}" />
    </div>
    <div class="company-info">
      <div class="company-name">NCG HOLDINGS (PRIVATE) LIMITED</div>
      <div class="company-address">{{company_address}}</div>
      <div class="company-address">Tel: {{company_phone}} | Email: {{company_email}}</div>
    </div>
  </div>
  
  <div class="title-container">
    <div class="doc-title">PETTY CASH PAYMENT VOUCHER</div>
    <div class="doc-meta-right">DTM/CDD/RT/FOM12/V1/2023.01.13</div>
  </div>

  <table class="meta-table">
    <tr>
      <td>Date</td>
      <td style="color:#999">{{payment_date}}</td>
      <td>Voucher No.</td>
      <td>{{voucher_number}}</td>
    </tr>
    <tr>
      <td>Payee</td>
      <td>{{payee_name}}</td>
      <td>IOU No.</td>
      <td>{{receipt_number}}</td>
    </tr>
  </table>

  <table class="main-table">
    <tr>
      <th class="col-code">Acc Code</th>
      <th class="col-desc">Description</th>
      <th class="col-amount">Amount</th>
    </tr>
    {{petty_cash_rows}}
  </table>

  <table class="total-table">
    <tr>
      <td class="total-label">Total</td>
      <td class="total-value">Rs. {{amount}}</td>
    </tr>
  </table>

  <table class="words-table">
    <tr>
      <td class="words-label">Total Amount (in words)</td>
      <td class="words-value">{{amount_in_words}}</td>
    </tr>
  </table>

  <div class="note">* Note : Please make sure to place the name, signature and date in the given space accordingly.</div>

  <table class="sig-table">
    <tr>
      <th></th>
      <th>Prepared By</th>
      <th>Checked By</th>
      <th>Approved By</th>
      <th>Received By</th>
    </tr>
    <tr>
      <td class="sig-row-label">Name</td>
      <td><span class="dotted-line"></span><div style="font-size:10px; margin-top:-5px; position:absolute">{{prepared_by}}</div></td>
      <td><span class="dotted-line"></span><div style="font-size:10px; margin-top:-5px; position:absolute">{{verified_by}}</div></td>
      <td><span class="dotted-line"></span><div style="font-size:10px; margin-top:-5px; position:absolute">{{approved_by}}</div></td>
      <td><span class="dotted-line"></span><div style="font-size:10px; margin-top:-5px; position:absolute">{{payee_name}}</div></td>
    </tr>
    <tr>
      <td class="sig-row-label">Signature</td>
      <td style="position:relative"><div style="height:35px; width:80%; margin: 0 auto">{{prepared_by_signature}}</div><span class="dotted-line" style="position:absolute; bottom:10px; left:10%"></span></td>
      <td style="position:relative"><div style="height:35px; width:80%; margin: 0 auto">{{verified_by_signature}}</div><span class="dotted-line" style="position:absolute; bottom:10px; left:10%"></span></td>
      <td style="position:relative"><div style="height:35px; width:80%; margin: 0 auto">{{approved_by_signature}}</div><span class="dotted-line" style="position:absolute; bottom:10px; left:10%"></span></td>
      <td style="position:relative"><div style="height:35px; width:80%; margin: 0 auto">{{received_by_signature}}</div><span class="dotted-line" style="position:absolute; bottom:10px; left:10%"></span></td>
    </tr>
    <tr>
      <td class="sig-row-label">Date</td>
      <td><span class="dotted-line"></span><div style="color:#999;font-size:11px; margin-top:-5px;">YYYY / MM / DD</div></td>
      <td><span class="dotted-line"></span><div style="color:#999;font-size:11px; margin-top:-5px;">YYYY / MM / DD</div></td>
      <td><span class="dotted-line"></span><div style="color:#999;font-size:11px; margin-top:-5px;">YYYY / MM / DD</div></td>
      <td><span class="dotted-line"></span><div style="color:#999;font-size:11px; margin-top:-5px;">YYYY / MM / DD</div></td>
    </tr>
  </table>

  <table class="footer-table">
    <tr>
      <td>Date of Issue : 2022/09/09</td>
      <td>Date of Revision : 2023/01/13</td>
      <td>Version No. : 01</td>
    </tr>
  </table>
</div>
`;

// ==================== IOU Voucher ====================
export const generateIOUVoucherTemplate = (): string => `
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #fff; color: #000; font-size: 13px; }
  .page { margin: 20px auto; max-width: 800px; padding: 20px 40px; }
  .header-grid { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px; }
  .logo-area { display: flex; align-items: center; }
  
  /* HIGH SPECIFICITY TO BEAT GLOBAL ERP OVERRIDES */
  img#strict-ncg-logo {
    width: 200px !important;
    max-height: 40px !important;
    min-height: 40px !important;
    height: 40px !important;
    object-fit: contain !important;
    object-position: left !important;
  }
  
  .company-info { text-align: right; }
  .company-name { font-size: 20px; font-weight: bold; margin: 0; }
  .company-address { font-size: 11px; margin: 2px 0; }
  
  .title-container { display: flex; justify-content: center; align-items: flex-end; position: relative; margin-top: 10px; margin-bottom: 5px; }
  .doc-title { text-align: center; font-size: 16px; font-weight: bold; }
  .doc-meta-right { position: absolute; right: 0; bottom: 0; font-size: 10px; }

  .iou-no-box { border: 1px solid #000; padding: 4px; display: inline-flex; margin-bottom: 5px; font-size: 13px; width: 300px; }
  .iou-no-label { border-right: 1px solid #000; padding-right: 8px; margin-right: 8px; width: 60px; }

  table.main-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 13px; }
  table.main-table th, table.main-table td { border: 1px solid #000; padding: 6px; }
  .main-table th { background: #e0e0e0; font-weight: bold; text-align: center; }
  
  /* Layout columns for split table */
  .col-1 { width: 20%; }
  .col-2 { width: 30%; }
  .col-3 { width: 25%; }
  .col-4 { width: 25%; }

  .sig-block { padding: 5px 0 0 0; }
  .sig-line { display: flex; margin-bottom: 5px; }
  .sig-line-label { width: 70px; }
  .sig-line-input { border-bottom: 1px solid #000; flex: 1; min-height: 20px; position: relative; margin-left: 5px; }

  table.footer-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
  table.footer-table td { border: 1px solid #000; padding: 4px; text-align: center; width: 33.33%; }
</style>
<div class="page">
  <div class="header-grid">
    <div class="logo-area">
      <img id="strict-ncg-logo" src="{{ncg_master_logo}}" />
    </div>
    <div class="company-info">
      <div class="company-name">NCG HOLDINGS (PRIVATE) LIMITED</div>
      <div class="company-address">{{company_address}}</div>
      <div class="company-address">Tel: {{company_phone}} | Email: {{company_email}}</div>
    </div>
  </div>
  
  <div class="title-container">
    <div class="doc-title">IOU REQUISITION FORM</div>
    <div class="doc-meta-right">DTM/CDD/RT/FOM11/V1/2023.01.13</div>
  </div>

  <div class="iou-no-box">
    <span class="iou-no-label">IOU No.</span>
    <span>{{iou_number}}</span>
  </div>

  <table class="main-table">
    <tr>
      <th colspan="2">IOU REQUISITION</th>
      <th colspan="2">IOU SETTLEMENT</th>
    </tr>
    <tr>
      <td class="col-1">Date</td>
      <td class="col-2" style="color:#999">{{issued_date}}</td>
      <td class="col-3">Date</td>
      <td class="col-4" style="color:#999">YYYY / MM / DD</td>
    </tr>
    <tr>
      <td class="col-1">Amount</td>
      <td class="col-2">Rs. {{amount}}</td>
      <td class="col-3">Amount Requested</td>
      <td class="col-4">Rs. {{amount}}</td>
    </tr>
    <tr>
      <td class="col-1">Purpose of Request</td>
      <td colspan="3">{{purpose}}</td>
    </tr>
    <tr>
      <td class="col-1">Name of Requestor</td>
      <td class="col-2">{{staff_name}}</td>
      <td class="col-3">Value of Total Bills</td>
      <td class="col-4">Rs. {{settled_amount}}</td>
    </tr>
    <tr>
      <td class="col-1">Division / Department</td>
      <td class="col-2">{{business_unit}}</td>
      <td class="col-3">Balance Returned</td>
      <td class="col-4">Rs. {{balance_returned}}</td>
    </tr>
    <tr>
      <td class="col-1">Requestor's Sig.</td>
      <td class="col-2"></td>
      <td class="col-3">Balance Claimed</td>
      <td class="col-4">Rs. {{balance_claimed}}</td>
    </tr>
    <!-- Signatures Row 1 -->
    <tr>
      <td colspan="2" style="vertical-align: top; padding: 10px;">
        <strong><i>Approved by</i></strong>
        <div class="sig-block">
          <div class="sig-line"><div class="sig-line-label">Name</div><div>:</div><div class="sig-line-input"><div style="font-size:11px;position:absolute;bottom:2px">{{approved_by}}</div></div></div>
          <div class="sig-line"><div class="sig-line-label">Signature</div><div>:</div><div class="sig-line-input"><div style="position:absolute;bottom:2px;height:35px">{{approved_by_signature}}</div></div></div>
          <div class="sig-line"><div class="sig-line-label">Date</div><div>:</div><div class="sig-line-input" style="color:#999;font-size:11px;display:flex;align-items:flex-end">YYYY / MM / DD</div></div>
        </div>
      </td>
      <td colspan="2" style="vertical-align: top; padding: 10px;">
        <strong><i>Approved by</i></strong>
        <div class="sig-block">
          <div class="sig-line"><div class="sig-line-label">Name</div><div>:</div><div class="sig-line-input"></div></div>
          <div class="sig-line"><div class="sig-line-label">Signature</div><div>:</div><div class="sig-line-input"></div></div>
          <div class="sig-line"><div class="sig-line-label">Date</div><div>:</div><div class="sig-line-input" style="color:#999;font-size:11px;display:flex;align-items:flex-end">YYYY / MM / DD</div></div>
        </div>
      </td>
    </tr>
    <!-- Signatures Row 2 -->
    <tr>
      <td colspan="2" style="vertical-align: top; padding: 10px;">
        <strong><i>Issued by</i></strong>
        <div class="sig-block">
          <div class="sig-line"><div class="sig-line-label">Name</div><div>:</div><div class="sig-line-input"><div style="font-size:11px;position:absolute;bottom:2px">{{prepared_by}}</div></div></div>
          <div class="sig-line"><div class="sig-line-label">Signature</div><div>:</div><div class="sig-line-input"><div style="position:absolute;bottom:2px;height:35px">{{prepared_by_signature}}</div></div></div>
          <div class="sig-line"><div class="sig-line-label">Date</div><div>:</div><div class="sig-line-input" style="color:#999;font-size:11px;display:flex;align-items:flex-end">YYYY / MM / DD</div></div>
        </div>
      </td>
      <td colspan="2" style="vertical-align: top; padding: 10px;">
        <strong><i>Settled by</i></strong>
        <div class="sig-block">
          <div class="sig-line"><div class="sig-line-label">Name</div><div>:</div><div class="sig-line-input"><div style="font-size:11px;position:absolute;bottom:2px">{{settled_by_name}}</div></div></div>
          <div class="sig-line"><div class="sig-line-label">Signature</div><div>:</div><div class="sig-line-input"><div style="position:absolute;bottom:2px;height:35px">{{settled_by_signature}}</div></div></div>
          <div class="sig-line"><div class="sig-line-label">Date</div><div>:</div><div class="sig-line-input" style="color:#999;font-size:11px;display:flex;align-items:flex-end">{{settled_date}}</div></div>
        </div>
      </td>
    </tr>
    <!-- Signatures Row 3 -->
    <tr>
      <td colspan="2" style="vertical-align: top; padding: 10px;">
        <strong><i>Received by</i></strong>
        <div class="sig-block">
          <div class="sig-line"><div class="sig-line-label">Name</div><div>:</div><div class="sig-line-input"><div style="font-size:11px;position:absolute;bottom:2px">{{staff_name}}</div></div></div>
          <div class="sig-line"><div class="sig-line-label">Signature</div><div>:</div><div class="sig-line-input"></div></div>
          <div class="sig-line"><div class="sig-line-label">Date</div><div>:</div><div class="sig-line-input" style="color:#999;font-size:11px;display:flex;align-items:flex-end">YYYY / MM / DD</div></div>
        </div>
      </td>
      <td colspan="2" style="vertical-align: top; padding: 10px;">
        <strong><i>Returned / Claimed by</i></strong>
        <div class="sig-block">
          <div class="sig-line"><div class="sig-line-label">Name</div><div>:</div><div class="sig-line-input"><div style="font-size:11px;position:absolute;bottom:2px">{{staff_name}}</div></div></div>
          <div class="sig-line"><div class="sig-line-label">Signature</div><div>:</div><div class="sig-line-input"></div></div>
          <div class="sig-line"><div class="sig-line-label">Date</div><div>:</div><div class="sig-line-input" style="color:#999;font-size:11px;display:flex;align-items:flex-end">{{returned_date}}</div></div>
        </div>
      </td>
    </tr>
  </table>

  <table class="footer-table">
    <tr>
      <td>Date of Issue : 2022/09/09</td>
      <td>Date of Revision : 2023/01/13</td>
      <td>Version No. : 01</td>
    </tr>
  </table>
</div>
`;

// ==================== SPH AR Invoice (Special Hire) ====================
// Pixel-perfect replica of BalanceInvoicePreview.tsx from operations
export const generateSPHARInvoiceTemplate = (): string => `
<style>
  body { font-family: "Segoe UI", Arial, sans-serif; margin: 0; padding: 0; color: #000; }
  .pg { max-width: 210mm; margin: 0 auto; padding: 15px; background: #fff; }
  .hd { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
  .hd .lo img { height: 70px !important; width: auto !important; object-fit: contain !important; }
  .hd .co { text-align: right; font-size: 14px; }
  .tt { text-align: center; font-size: 20px; font-weight: bold; text-decoration: underline; margin-bottom: 12px; }
  .it { width: 100%; margin-bottom: 12px; font-size: 14px; }
  .it td { padding: 4px 6px; }
  .it .lb { font-weight: bold; width: 18%; }
  .it .vl { width: 32%; }
  .li { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
  .li th { border: 1px solid #d1d5db; padding: 8px; text-align: center; background: #f3f4f6; font-weight: bold; }
  .li td { border: 1px solid #d1d5db; padding: 8px; text-align: center; font-size: 12px; }
  .sm { display: flex; justify-content: flex-end; margin-top: 12px; }
  .sm table { border-collapse: collapse; font-size: 14px; max-width: 300px; }
  .sm td { border: 1px solid #d1d5db; padding: 8px; }
  .sm .sl { font-weight: bold; }
  .sm .sr { text-align: right; }
  .sm .dc { color: #dc2626; }
  .sm .ar { background: #fefce8; }
  .sm .aa { color: #15803d; font-weight: bold; text-align: right; }
  .sm .br { background: #eff6ff; }
  .sm .bl { font-weight: bold; color: #1e40af; }
  .sm .ba { font-weight: bold; color: #1e40af; font-size: 16px; text-align: right; }
  .nt { margin-top: 16px; padding: 10px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; font-size: 13px; }
  .sg { width: 100%; border-collapse: collapse; margin-top: 30px; font-size: 12px; }
  .sg th { border: 1px solid #000; padding: 8px; text-align: center; background: #f3f4f6; }
  .sg td { border: 1px solid #000; padding: 12px; vertical-align: top; }
  .sgl { height: 40px; border-bottom: 1px solid #000; margin: 5px 0; }
  .ft { margin-top: 30px; text-align: center; font-size: 10px; color: #666; }
  @media print { body { background: #fff; } .pg { margin: 0; padding: 10px; max-width: 100%; } }
</style>
<div class="pg">
  <div class="hd">
    <div class="lo">{{company_logo}}</div>
    <div class="co">
      <strong>{{company_name}}</strong><br>
      {{company_address}}<br>
      {{company_phone}}
    </div>
  </div>
  <div class="tt">INVOICE</div>
  <table class="it">
    <tr><td class="lb">Customer Code</td><td class="vl">{{customer_code}}</td><td class="lb">Invoice No</td><td class="vl">{{invoice_number}}</td></tr>
    <tr><td class="lb">Customer Name</td><td class="vl">{{customer_name}}</td><td class="lb">Invoice Date</td><td class="vl">{{invoice_date}}</td></tr>
    <tr><td class="lb">Branch</td><td class="vl">SHS</td><td class="lb">Ref No</td><td class="vl">{{reference}}</td></tr>
    <tr><td class="lb">Contact Person</td><td class="vl">{{customer_name}}</td><td class="lb">Dates of Hire</td><td class="vl">{{due_date}}</td></tr>
    <tr><td class="lb">Contact Number</td><td class="vl">{{customer_phone}}</td><td class="lb">Quote No</td><td class="vl">{{reference}}</td></tr>
    <tr><td class="lb">Address</td><td class="vl">{{customer_address}}</td><td class="lb">Bus Type</td><td class="vl"></td></tr>
  </table>
  <table class="li">
    <thead>
      <tr>
        <th style="width:25%">Description</th>
        <th style="width:40%">Item Detail</th>
        <th style="width:15%">Vehicle No</th>
        <th style="width:20%">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Special Hire</td>
        <td>{{notes}}</td>
        <td>TBA</td>
        <td><strong>{{total_amount}}</strong></td>
      </tr>
    </tbody>
  </table>
  <div class="sm">
    <table>
      <tr><td class="sl">Sub Total</td><td class="sr">{{total_amount}}</td></tr>
      <tr><td class="sl">Discount</td><td class="sr dc">{{discount_amount}}</td></tr>
      <tr class="ar"><td class="sl">Advance Paid</td><td class="aa">{{paid_amount}}</td></tr>
      <tr class="br"><td class="bl">BALANCE DUE</td><td class="ba">{{balance}}</td></tr>
    </table>
  </div>
  <div class="nt"><strong>Notes:</strong> {{notes}}</div>
  <table class="sg">
    <thead><tr><th>Prepared By</th><th>Checked By</th><th>Approved By</th></tr></thead>
    <tbody><tr>
      <td><strong>Name:</strong> {{prepared_by}}<br><strong>Signature:</strong><div class="sgl">{{prepared_by_signature}}</div><strong>Date:</strong> {{print_date}}</td>
      <td><strong>Name:</strong> {{verified_by}}<br><strong>Signature:</strong><div class="sgl">{{verified_by_signature}}</div><strong>Date:</strong> .........................</td>
      <td><strong>Name:</strong> {{approved_by}}<br><strong>Signature:</strong><div class="sgl">{{approved_by_signature}}</div><strong>Date:</strong> .........................</td>
    </tr></tbody>
  </table>
  <div class="ft">Page 1 of 1<br>NCG Express Transport Management System</div>
</div>
`;

// ==================== SPH AR Receipt (Special Hire) ====================
// Pixel-perfect replica of AdvanceReceiptPreview.tsx from operations
export const generateSPHARReceiptTemplate = (): string => `
<style>
  body { font-family: "Segoe UI", Arial, sans-serif; margin: 0; padding: 0; color: #000; }
  .rpg { max-width: 210mm; margin: 0 auto; padding: 20px; background: #fff; }
  .rhd { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
  .rhd .rlo img { width: 150px !important; height: auto !important; object-fit: contain !important; }
  .rhd .rco { text-align: right; font-size: 14px; }
  .rtt { text-align: center; font-size: 20px; font-weight: bold; text-decoration: underline; margin-bottom: 20px; }
  .rinf { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  .rinf td { border: 1px solid #000; padding: 8px; font-size: 13px; width: 50%; }
  .rinf strong { display: block; margin-bottom: 2px; }
  .rpt { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  .rpt th { border: 1px solid #000; padding: 8px; text-align: left; background: #f3f4f6; font-size: 13px; }
  .rpt td { border: 1px solid #000; padding: 8px; font-size: 13px; }
  .rtot { text-align: right; margin-bottom: 16px; font-size: 14px; line-height: 1.8; }
  .rtot .rbd { color: #b91c1c; font-weight: bold; }
  .rtrip { font-style: italic; font-size: 12px; margin-bottom: 8px; }
  .rnote { font-size: 11px; margin-bottom: 24px; }
  .rsg { width: 100%; border-collapse: collapse; margin-top: 30px; font-size: 14px; }
  .rsg th { border: 1px solid #000; padding: 8px; text-align: center; background: #f3f4f6; }
  .rsg td { border: 1px solid #000; padding: 12px; vertical-align: top; }
  .rsgl { height: 50px; border-bottom: 1px solid #000; margin: 5px 0; }
  .rft { margin-top: 40px; text-align: center; font-size: 10px; color: #666; }
  @media print { body { background: #fff; } .rpg { margin: 0; padding: 10px; max-width: 100%; } }
</style>
<div class="rpg">
  <div class="rhd">
    <div class="rlo">{{company_logo}}</div>
    <div class="rco">
      <strong>{{company_name}}</strong><br>
      {{company_address}}<br>
      {{company_phone}}
    </div>
  </div>
  <div class="rtt">SALES RECEIPT</div>
  <table class="rinf">
    <tr>
      <td><strong>Receipt No.</strong>{{receipt_number}}</td>
      <td><strong>Date</strong>{{receipt_date}}</td>
    </tr>
    <tr>
      <td><strong>Payment Ref</strong>{{customer_name}}, {{reference}}</td>
      <td><strong>Transaction No.</strong>{{cheque_number}}</td>
    </tr>
    <tr>
      <td><strong>Customer</strong>{{customer_name}}</td>
      <td><strong>Payment Method</strong>{{payment_method}}</td>
    </tr>
  </table>
  <table class="rpt">
    <thead><tr><th>Account Name</th><th>Transfer Date</th><th>Reference</th><th style="text-align:right;">Amount</th></tr></thead>
    <tbody><tr>
      <td>BALANCE PAYMENT</td>
      <td>{{receipt_date}}</td>
      <td>{{reference}}</td>
      <td style="text-align:right;font-weight:bold;">{{amount}}</td>
    </tr></tbody>
  </table>
  {{allocations}}
  <div class="rtot">
    <p><strong>This Payment:</strong> {{amount}}</p>
    <p><strong>Total Paid to Date:</strong> {{total_amount}}</p>
    <p class="rbd"><strong>Balance Due:</strong> {{currency}} 0.00</p>
  </div>
  <div class="rtrip">
    <strong>Notes:</strong> {{notes}}
  </div>
  <div class="rnote">*Note: Please make sure to place the name, signature and date in the given space accordingly.</div>
  <table class="rsg">
    <thead><tr><th>Prepared By</th><th>Checked By</th><th>Approved By</th></tr></thead>
    <tbody><tr>
      <td><strong>Name:</strong> {{prepared_by}}<br><strong>Signature:</strong><div class="rsgl">{{prepared_by_signature}}</div><strong>Date:</strong> {{print_date}}</td>
      <td><strong>Name:</strong> {{verified_by}}<br><strong>Signature:</strong><div class="rsgl">{{verified_by_signature}}</div><strong>Date:</strong> .........................</td>
      <td><strong>Name:</strong> {{approved_by}}<br><strong>Signature:</strong><div class="rsgl">{{approved_by_signature}}</div><strong>Date:</strong> .........................</td>
    </tr></tbody>
  </table>
  <div class="rft">Page 1 of 1<br>NCG Express Transport Management System</div>
</div>
`;

// Export all templates as a map
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
  tax_invoice: generateTaxInvoiceTemplate,
  petty_cash_voucher: generatePettyCashVoucherTemplate,
  iou_voucher: generateIOUVoucherTemplate,
  purchase_order: generatePurchaseOrderTemplate,
  sph_ar_invoice: generateSPHARInvoiceTemplate,
  sph_ar_receipt: generateSPHARReceiptTemplate,
};

// SPH-specific template overrides: when company short_code is SPH, use these for AR docs
export const sphTemplateOverrides: Record<string, () => string> = {
  ar_invoice: generateSPHARInvoiceTemplate,
  ar_receipt: generateSPHARReceiptTemplate,
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
  tax_invoice: "Sri Lanka Tax Invoice",
  petty_cash_voucher: "Petty Cash Voucher",
  iou_voucher: "IOU Voucher",
  purchase_order: "Purchase Order",
};
export function generatePurchaseOrderTemplate(): string { return `
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
  .page { margin: 10px auto; max-width: 850px; background: #ffffff; padding: 30px; color: #000; }
  .header-grid { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
  .logo-area { display: flex; align-items: center; }
  #strict-ncg-logo-container img {
    width: 200px !important;
    max-height: 50px !important;
    object-fit: contain !important;
    object-position: left !important;
  }
  .company-info { text-align: right; }
  .company-name { font-size: 22px; font-weight: bold; margin: 0; text-transform: uppercase; }
  
  .title-container { text-align: center; margin: 20px 0; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 10px 0; background-color: #f8f9fa; }
  .doc-title { font-size: 20px; font-weight: bold; letter-spacing: 2px; }
  
  table.info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
  table.info-table td { border: 1px solid #000; padding: 8px; }
  .bg-light { background-color: #f1f5f9; font-weight: bold; width: 20%; }
  
  table.items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
  table.items-table th { border: 1px solid #000; padding: 8px; background-color: #e2e8f0; text-align: left; font-weight: bold; text-transform: uppercase; }
  table.items-table td { border: 1px solid #000; padding: 8px; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  
  table.auth-table { width: 100%; border-collapse: collapse; border: 1px solid black; margin-top: 40px; font-size: 12px; }
  table.auth-table th { border: 1px solid black; padding: 6px; text-align: center; width: 33.33%; font-weight: bold; background-color: #f8f9fa; }
  table.auth-table td { border: 1px solid black; padding: 5px; height: 80px; position: relative; vertical-align: top; }
</style>
<div class="page">
  <div class="header-grid">
    <div class="logo-area" id="strict-ncg-logo-container">
      {{company_logo}}
    </div>
    <div class="company-info">
      <div class="company-name">{{company_name}}</div>
      <div>{{company_address}}</div>
      <div>Tel: {{company_phone}} | Email: {{company_email}}</div>
    </div>
  </div>

  <div class="title-container">
    <div class="doc-title">PURCHASE ORDER</div>
  </div>

  <table class="info-table">
    <tr>
      <td class="bg-light">PO NUMBER</td>
      <td style="width: 30%; font-weight: bold; font-size: 14px;">{{po_number}}</td>
      <td class="bg-light">PO DATE</td>
      <td style="width: 30%;">{{order_date}}</td>
    </tr>
    <tr>
      <td class="bg-light">VENDOR</td>
      <td colspan="3"><strong>{{vendor_name}}</strong><br/>{{vendor_address}}<br/>Contact: {{vendor_contact}}</td>
    </tr>
    <tr>
      <td class="bg-light">DELIVERY TO</td>
      <td>{{delivery_address}}</td>
      <td class="bg-light">EXPECTED DATE</td>
      <td>{{expected_date}}</td>
    </tr>
  </table>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 5%;">#</th>
        <th style="width: 45%;">DESCRIPTION</th>
        <th style="width: 15%; text-align: center;">QTY</th>
        <th style="width: 15%; text-align: right;">UNIT PRICE</th>
        <th style="width: 20%; text-align: right;">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      {{items_html}}
    </tbody>
  </table>

  <table class="info-table" style="width: 50%; float: right; margin-top: -10px;">
    <tr>
      <td class="bg-light text-right">SUB TOTAL</td>
      <td class="text-right" style="width: 40%;">{{sub_total}}</td>
    </tr>
    <tr>
      <td class="bg-light text-right">TAX AMOUNT</td>
      <td class="text-right">{{tax_amount}}</td>
    </tr>
    <tr>
      <td class="bg-light text-right" style="font-size: 14px;"><strong>GRAND TOTAL</strong></td>
      <td class="text-right" style="font-size: 14px;"><strong>{{currency}} {{grand_total}}</strong></td>
    </tr>
  </table>
  <div style="clear: both;"></div>

  <div style="margin-top: 20px; font-size: 12px;">
    <p><strong>Amount in Words:</strong> {{amount_in_words}}</p>
    <p><strong>Terms & Conditions:</strong><br/>{{terms_conditions}}</p>
  </div>

  <table class="auth-table">
    <tr>
      <th>PREPARED BY</th>
      <th>AUTHORIZED BY</th>
      <th>VENDOR ACCEPTANCE</th>
    </tr>
    <tr>
      <td>
        <div style="position: absolute; top: 5px; left: 5px;">Name: {{prepared_by}}</div>
        <div style="position: absolute; bottom: 5px; left: 25px;">{{prepared_by_signature}}<br>Signature: _________________</div>
      </td>
      <td>
        <div style="position: absolute; top: 5px; left: 5px;">Name: {{approved_by}}</div>
        <div style="position: absolute; bottom: 5px; left: 25px;">{{approved_by_signature}}<br>Signature: _________________</div>
      </td>
      <td>
        <div style="position: absolute; top: 5px; left: 5px;">Date: </div>
        <div style="position: absolute; bottom: 5px; left: 25px;">{{received_by_signature}}<br>Signature: _________________</div>
      </td>
    </tr>
  </table>
</div>
`;
}
