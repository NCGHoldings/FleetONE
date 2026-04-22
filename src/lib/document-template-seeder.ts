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
<style>${commonStyles}</style>
<div class="page"><div class="doc">
  ${buildHeader('Official Receipt', '{{receipt_number}}', '{{receipt_date}}', 'AR Receipt')}

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
      <div class="payment-summary">
        <div class="total-box">
          <span class="label">Total Received</span>
          <span class="value">{{amount}}</span>
        </div>
      </div>
    </div>

    <div class="amount-words"><strong>Amount in Words:</strong> {{amount_in_words}}</div>

    <div class="notes-section">
      <div class="label">Invoice Allocations</div>
    </div>
    {{allocations}}

    <div class="notes-section">
      <div class="label">Notes</div>
      <p>{{notes}}</p>
    </div>
  </div>

  ${buildFooter(['Received By', 'Cashier', 'Authorized By', 'Customer Signature'])}
</div></div>
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
  table.voucher-table { width: 100%; border-collapse: collapse; border: 2px solid black; margin-bottom: 20px; font-weight: bold; font-size: 12px; }
  table.voucher-table td, table.voucher-table th { border: 1px solid black; padding: 6px; }
  h4.section-title { margin: 0 0 5px 0; font-size: 14px; font-weight: bold; text-transform: uppercase; }
  .amount-words-table { width: 100%; border-collapse: collapse; border: 2px solid black; margin-bottom: 20px; font-weight: bold; font-size: 12px; }
  .amount-words-table td { border: 1px solid black; padding: 6px; }
  .auth-table { width: 100%; border-collapse: collapse; border: 2px solid black; margin-bottom: 20px; font-size: 12px; font-weight: bold; }
  .auth-table th { border: 1px solid black; padding: 6px; text-align: center; width: 33.33%; }
  .auth-table td { border: 1px solid black; padding: 5px; height: 80px; position: relative; vertical-align: top; }
</style>
<div class="page">
  <div class="header-container">
    <h2>NCG HOLDINGS PRIVATE LIMITED</h2>
    <h3>PAYMENT VOUCHER</h3>
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
<style>\${commonStyles}
  :root { 
    --ink: #0f172a; 
    --muted: #64748b; 
    --divider: #e2e8f0;
    --accent: #0ea5e9; 
  }
  .page { margin: 10px auto; max-width: 850px; }
  .doc-minimal {
    background: #ffffff;
    padding: 48px 56px;
    color: var(--ink);
    border: 1px solid var(--divider);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  }
  .flex-between { display: flex; justify-content: space-between; align-items: flex-start; }
  .divider { border-bottom: 2px solid var(--ink); margin: 28px 0 32px 0; }
  .light-divider { border-bottom: 1px solid var(--divider); margin: 24px 0; }
  
  .meta-label { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.12em; font-weight: 700; margin-bottom: 6px; }
  .meta-value { font-size: 14px; font-weight: 600; color: var(--ink); }
  
  .header-title { font-size: 26px; font-weight: 800; letter-spacing: 0.05em; color: var(--accent); margin: 0 0 12px 0; }
  
  .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; }
  
  .total-row { display: flex; justify-content: space-between; align-items: center; padding: 20px 0; border-top: 2px solid var(--ink); border-bottom: 2px solid var(--ink); margin-top: 40px; }
  .total-label { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); margin-bottom: 4px; }
  .total-amount { font-size: 28px; font-weight: 800; letter-spacing: -0.02em; }
  
  .text-xs { font-size: 11px; line-height: 1.6; color: var(--muted); }
  .text-sm { font-size: 13px; line-height: 1.6; }
</style>
<div class="page"><div class="doc-minimal">
  <div class="flex-between">
    <div>
      <img src="{{ncg_master_logo}}" style="width: 220px !important; height: auto !important; max-height: 75px !important; object-fit: contain !important; margin-bottom: 12px !important; mix-blend-mode: multiply;" />
      <div style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">{{sector_name}}</div>
      <div class="text-xs">{{company_address}}<br>Tel: {{company_phone}} | Email: {{company_email}}</div>
    </div>
    <div style="text-align: right;">
      <h1 class="header-title">PETTY CASH VOUCHER</h1>
      <div style="display: flex; gap: 32px; justify-content: flex-end; margin-top: 24px;">
        <div style="text-align: left;">
          <div class="meta-label">Voucher No</div>
          <div class="meta-value">{{voucher_number}}</div>
        </div>
        <div style="text-align: left;">
          <div class="meta-label">Date</div>
          <div class="meta-value">{{payment_date}}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="divider"></div>

  <div class="details-grid">
    <div>
      <div class="meta-label" style="border-bottom: 1px solid var(--divider); padding-bottom: 8px; margin-bottom: 16px; color: var(--ink);">Issued To</div>
      <div class="meta-value" style="font-size: 15px; margin-bottom: 4px;">{{payee_name}}</div>
      <div class="text-sm" style="color: var(--muted);">Category: {{expense_category}}</div>
    </div>
    <div>
      <div class="meta-label" style="border-bottom: 1px solid var(--divider); padding-bottom: 8px; margin-bottom: 16px; color: var(--ink);">Payment Information</div>
      <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; margin-bottom: 6px;">
        <span class="text-sm" style="color: var(--muted);">Fund:</span>
        <span class="meta-value" style="font-size: 13px;">{{fund_name}}</span>
      </div>
      <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; margin-bottom: 6px;">
        <span class="text-sm" style="color: var(--muted);">Ref / Receipt:</span>
        <span class="meta-value" style="font-size: 13px;">{{receipt_number}}</span>
      </div>
      <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px;">
        <span class="text-sm" style="color: var(--muted);">Method:</span>
        <span class="meta-value" style="font-size: 13px;">{{payment_method}}</span>
      </div>
    </div>
  </div>
  
  <div class="light-divider" style="margin-top: 32px;"></div>
  
  <div style="margin-top: 16px;">
    <div class="meta-label">Description / Purpose</div>
    <div class="text-sm" style="margin-top: 8px; color: var(--ink);">{{notes}}</div>
  </div>

  <div class="total-row" style="margin-top: 32px; border-top-color: var(--accent); border-bottom-color: var(--accent);">
    <div>
      <div class="meta-label" style="margin-bottom: 4px;">Amount in Words</div>
      <div style="font-size: 13px; font-style: italic; color: var(--muted); max-width: 400px; line-height: 1.5;">{{amount_in_words}}</div>
    </div>
    <div style="text-align: right;">
      <div class="total-label">Amount Paid</div>
      <div class="total-amount" style="color: var(--accent);">{{amount}}</div>
    </div>
  </div>

  <div style="margin-top: 80px;">
    ${buildFooter(['Prepared By', 'Verified By', 'Approved By', 'Received By (Payee)'])}
  </div>
</div></div>
`;

// ==================== IOU Voucher ====================
export const generateIOUVoucherTemplate = (): string => `
<style>${commonStyles}
  :root { 
    --ink: #0f172a; 
    --muted: #64748b; 
    --divider: #e2e8f0;
    --accent: #eab308; 
  }
  .page { margin: 10px auto; max-width: 850px; }
  .doc-minimal {
    background: #ffffff;
    padding: 48px 56px;
    color: var(--ink);
    border: 1px solid var(--divider);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  }
  .flex-between { display: flex; justify-content: space-between; align-items: flex-start; }
  .divider { border-bottom: 2px solid var(--ink); margin: 28px 0 32px 0; }
  .light-divider { border-bottom: 1px solid var(--divider); margin: 24px 0; }
  
  .meta-label { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.12em; font-weight: 700; margin-bottom: 6px; }
  .meta-value { font-size: 14px; font-weight: 600; color: var(--ink); }
  
  .header-title { font-size: 26px; font-weight: 800; letter-spacing: 0.05em; color: var(--accent); margin: 0 0 12px 0; }
  
  .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; }
  
  .total-row { display: flex; justify-content: space-between; align-items: center; padding: 20px 0; border-top: 2px solid var(--ink); border-bottom: 2px solid var(--ink); margin-top: 40px; }
  .total-label { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); margin-bottom: 4px; }
  .total-amount { font-size: 28px; font-weight: 800; letter-spacing: -0.02em; }
  
  .text-xs { font-size: 11px; line-height: 1.6; color: var(--muted); }
  .text-sm { font-size: 13px; line-height: 1.6; }
</style>
<div class="page"><div class="doc-minimal">
  <div class="flex-between">
    <div>
      <img src="{{ncg_master_logo}}" style="width: 220px !important; height: auto !important; max-height: 75px !important; object-fit: contain !important; margin-bottom: 12px !important; mix-blend-mode: multiply;" />
      <div style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">{{sector_name}}</div>
      <div class="text-xs">{{company_address}}<br>Tel: {{company_phone}} | Email: {{company_email}}</div>
    </div>
    <div style="text-align: right;">
      <h1 class="header-title">STAFF IOU VOUCHER</h1>
      <div style="display: flex; gap: 32px; justify-content: flex-end; margin-top: 24px;">
        <div style="text-align: left;">
          <div class="meta-label">IOU No</div>
          <div class="meta-value">{{iou_number}}</div>
        </div>
        <div style="text-align: left;">
          <div class="meta-label">Date</div>
          <div class="meta-value">{{issued_date}}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="divider"></div>

  <div class="details-grid">
    <div>
      <div class="meta-label" style="border-bottom: 1px solid var(--divider); padding-bottom: 8px; margin-bottom: 16px; color: var(--ink);">Issued To</div>
      <div class="meta-value" style="font-size: 15px; margin-bottom: 4px;">{{staff_name}}</div>
      <div class="text-sm" style="color: var(--muted);">Business Unit: {{business_unit}}</div>
    </div>
    <div>
      <div class="meta-label" style="border-bottom: 1px solid var(--divider); padding-bottom: 8px; margin-bottom: 16px; color: var(--ink);">Repayment Terms</div>
      <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; margin-bottom: 6px;">
        <span class="text-sm" style="color: var(--muted);">Due Date:</span>
        <span class="meta-value" style="font-size: 13px; color: #dc2626;">{{due_date}}</span>
      </div>
    </div>
  </div>
  
  <div class="light-divider" style="margin-top: 32px;"></div>
  
  <div style="margin-top: 16px;">
    <div class="meta-label">Purpose</div>
    <div class="text-sm" style="margin-top: 8px; color: var(--ink);">{{purpose}}</div>
  </div>

  <div class="total-row" style="margin-top: 32px; border-top-color: var(--accent); border-bottom-color: var(--accent);">
    <div>
      <div class="meta-label" style="margin-bottom: 4px;">Amount in Words</div>
      <div style="font-size: 13px; font-style: italic; color: var(--muted); max-width: 400px; line-height: 1.5;">{{amount_in_words}}</div>
    </div>
    <div style="text-align: right;">
      <div class="total-label">Amount Issued</div>
      <div class="total-amount" style="color: var(--accent);">{{amount}}</div>
    </div>
  </div>

  <div style="margin-top: 32px; background: #fffbeb; border: 1px solid #fde68a; padding: 16px; border-radius: 6px;">
    <div class="meta-label" style="color: #92400e; margin-bottom: 8px;">Staff Acknowledgment</div>
    <p style="margin: 0; font-size: 12px; color: #92400e; line-height: 1.6;">I hereby acknowledge receipt of the above amount. I authorize the company to deduct this outstanding amount from my salary or final settlement if not settled in full by the stipulated due date.</p>
  </div>

  <div style="margin-top: 60px;">
    ${buildFooter(['Prepared By', 'Authorized By', 'Staff Signature'])}
  </div>
</div></div>
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
  tax_invoice: generateTaxInvoiceTemplate,
  petty_cash_voucher: generatePettyCashVoucherTemplate,
  iou_voucher: generateIOUVoucherTemplate,
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
};
