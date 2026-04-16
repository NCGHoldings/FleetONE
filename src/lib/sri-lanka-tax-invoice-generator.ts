import { convertNumberToWords } from './number-to-words';

export interface SriLankaTaxInvoiceLineItem {
  reference?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amountExclVat: number;
}

export interface SriLankaTaxInvoiceData {
  // Header
  invoiceDate: string;
  taxInvoiceNo: string;

  // Supplier
  supplierTin: string;
  supplierName: string;
  supplierAddress: string;
  supplierPhone: string;

  // Purchaser
  purchaserTin: string;
  purchaserName: string;
  purchaserAddress: string;
  purchaserPhone: string;

  // Delivery
  dateOfDelivery?: string;
  placeOfSupply?: string;

  // Additional
  additionalInformation?: string;

  // Line items
  lineItems: SriLankaTaxInvoiceLineItem[];

  // VAT
  vatRate: number; // default 18

  // Payment
  modeOfPayment?: string;

  // Signatures
  preparedBy?: { name: string; signature?: string; date?: string };
  approvedBy?: { name: string; signature?: string; date?: string };
  customerSignature?: { name: string; signature?: string; date?: string };
}

export function generateSriLankaTaxInvoiceHTML(data: SriLankaTaxInvoiceData): string {
  const vatRate = data.vatRate || 18;
  const totalValueOfSupply = data.lineItems.reduce((sum, item) => sum + item.amountExclVat, 0);
  const vatAmount = totalValueOfSupply * (vatRate / 100);
  const totalIncludingVat = totalValueOfSupply + vatAmount;
  const totalInWords = convertNumberToWords(totalIncludingVat);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch { return dateStr; }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const lineItemsHTML = data.lineItems.map((item, index) => `
    <tr>
      <td style="text-align:center; padding:8px 6px; border:1px solid #000;">${item.reference || (index + 1)}</td>
      <td style="padding:8px 6px; border:1px solid #000;">${item.description}</td>
      <td style="text-align:center; padding:8px 6px; border:1px solid #000;">${item.quantity}</td>
      <td style="text-align:right; padding:8px 6px; border:1px solid #000;">${formatCurrency(item.unitPrice)}</td>
      <td style="text-align:right; padding:8px 6px; border:1px solid #000;">${formatCurrency(item.amountExclVat)}</td>
    </tr>
  `).join('');

  // Add empty rows to fill at least 5 rows
  const emptyRows = Math.max(0, 5 - data.lineItems.length);
  const emptyRowsHTML = Array(emptyRows).fill('').map(() => `
    <tr>
      <td style="padding:8px 6px; border:1px solid #000;">&nbsp;</td>
      <td style="padding:8px 6px; border:1px solid #000;">&nbsp;</td>
      <td style="padding:8px 6px; border:1px solid #000;">&nbsp;</td>
      <td style="padding:8px 6px; border:1px solid #000;">&nbsp;</td>
      <td style="padding:8px 6px; border:1px solid #000;">&nbsp;</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=900" />
<title>Tax Invoice - ${data.taxInvoiceNo}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Times New Roman", serif;
    font-size: 13px;
    color: #000;
    background: #fff;
    -webkit-print-color-adjust: exact;
  }
  .tax-invoice-container {
    width: 800px;
    margin: 0 auto;
    padding: 20px;
  }
  .tax-invoice-page {
    width: 100%;
    border: 2px solid #000;
    padding: 0;
    background: #fff;
    position: relative;
  }
  /* Double-bordered title box */
  .ti-title-wrapper {
    text-align: center;
    padding: 12px 0 8px;
  }
  .ti-title-box {
    display: inline-block;
    border: 3px double #000;
    padding: 6px 40px;
    font-size: 20px;
    font-weight: bold;
    letter-spacing: 3px;
    text-transform: uppercase;
  }
  .ti-row {
    display: flex;
    border-top: 1px solid #000;
  }
  .ti-row .ti-cell {
    flex: 1;
    padding: 6px 10px;
    border-right: 1px solid #000;
    font-size: 13px;
  }
  .ti-row .ti-cell:last-child {
    border-right: none;
  }
  .ti-label {
    text-decoration: underline;
    font-weight: bold;
  }
  .ti-two-blocks {
    display: flex;
    border-top: 1px solid #000;
  }
  .ti-block-half {
    flex: 1;
    padding: 8px 10px;
  }
  .ti-block-half:first-child {
    border-right: 1px solid #000;
  }
  .ti-block-row {
    display: flex;
    margin: 2px 0;
    font-size: 13px;
  }
  .ti-block-label {
    font-weight: bold;
    text-decoration: underline;
    min-width: 150px;
    flex-shrink: 0;
  }
  .ti-block-value {
    flex: 1;
  }
  .ti-block {
    border-top: 1px solid #000;
    padding: 6px 10px;
  }
  table.ti-items {
    width: 100%;
    border-collapse: collapse;
    border-top: 1px solid #000;
  }
  table.ti-items th {
    background: #fff;
    font-weight: bold;
    text-align: center;
    padding: 8px 4px;
    border: 1px solid #000;
    font-size: 12px;
    text-decoration: underline;
  }
  table.ti-items td {
    font-size: 13px;
    border: 1px solid #000;
    padding: 6px 4px;
  }
  .ti-totals {
    border-top: 2px solid #000;
  }
  .ti-totals-row {
    display: flex;
    border-bottom: 1px solid #000;
  }
  .ti-totals-row:last-child {
    border-bottom: none;
  }
  .ti-totals-label {
    flex: 1;
    padding: 6px 10px;
    font-weight: bold;
    border-right: 1px solid #000;
    text-decoration: underline;
  }
  .ti-totals-value {
    width: 200px;
    text-align: right;
    padding: 6px 10px;
    font-weight: bold;
  }
  .ti-words-row {
    border-top: 1px solid #000;
    padding: 8px 10px;
  }
  .ti-words-label {
    font-weight: bold;
    text-decoration: underline;
    margin-bottom: 3px;
  }
  .ti-words-value {
    text-transform: uppercase;
    font-weight: bold;
    font-size: 12px;
  }
  .ti-payment-row {
    border-top: 1px solid #000;
    padding: 6px 10px;
    display: flex;
  }
  .ti-footer-ref {
    border-top: 1px solid #000;
    padding: 4px 10px;
    font-size: 10px;
    color: #555;
    text-align: right;
  }
  .ti-signatures {
    border-top: 2px solid #000;
    display: flex;
    padding: 20px 10px 25px;
    justify-content: space-between;
  }
  .ti-sig-box {
    flex: 1;
    text-align: center;
    padding: 0 8px;
  }
  .ti-sig-line {
    border-bottom: 1px solid #000;
    height: 55px;
    margin: 0 12px 6px;
  }
  .ti-sig-label {
    font-weight: bold;
    font-size: 12px;
  }
  .ti-sig-name {
    font-size: 11px;
    color: #444;
    margin-top: 3px;
  }
  .ti-sig-image {
    max-height: 50px;
    max-width: 120px;
    margin: 5px auto;
    display: block;
  }
  @media print {
    body { margin: 0; }
    .tax-invoice-container { width: 100%; padding: 0; }
  }
</style>
</head>
<body>
<div class="tax-invoice-container">
  <div class="tax-invoice-page">
    <!-- Title in double-bordered box -->
    <div class="ti-title-wrapper">
      <div class="ti-title-box">Tax Invoice</div>
    </div>

    <!-- Date of Invoice | Tax Invoice No -->
    <div class="ti-row">
      <div class="ti-cell"><span class="ti-label">Date of Invoice :</span> ${formatDate(data.invoiceDate)}</div>
      <div class="ti-cell"><span class="ti-label">Tax Invoice No. :</span> ${data.taxInvoiceNo}</div>
    </div>

    <!-- Supplier & Purchaser blocks side by side -->
    <div class="ti-two-blocks">
      <div class="ti-block-half">
        <div class="ti-block-row"><span class="ti-block-label">Supplier's TIN :</span><span class="ti-block-value">${data.supplierTin}</span></div>
        <div class="ti-block-row"><span class="ti-block-label">Supplier's Name :</span><span class="ti-block-value">${data.supplierName}</span></div>
        <div class="ti-block-row"><span class="ti-block-label">Address :</span><span class="ti-block-value">${data.supplierAddress}</span></div>
        <div class="ti-block-row"><span class="ti-block-label">Telephone No. :</span><span class="ti-block-value">${data.supplierPhone}</span></div>
      </div>
      <div class="ti-block-half">
        <div class="ti-block-row"><span class="ti-block-label">Purchaser's TIN :</span><span class="ti-block-value">${data.purchaserTin}</span></div>
        <div class="ti-block-row"><span class="ti-block-label">Purchaser's Name :</span><span class="ti-block-value">${data.purchaserName}</span></div>
        <div class="ti-block-row"><span class="ti-block-label">Address :</span><span class="ti-block-value">${data.purchaserAddress}</span></div>
        <div class="ti-block-row"><span class="ti-block-label">Telephone No. :</span><span class="ti-block-value">${data.purchaserPhone}</span></div>
      </div>
    </div>

    <!-- Date of Delivery | Place of Supply -->
    <div class="ti-row">
      <div class="ti-cell"><span class="ti-label">Date of Delivery :</span> ${formatDate(data.dateOfDelivery)}</div>
      <div class="ti-cell"><span class="ti-label">Place of Supply :</span> ${data.placeOfSupply || ''}</div>
    </div>

    <!-- Additional Information -->
    <div class="ti-block" style="min-height:36px;">
      <div class="ti-block-row"><span class="ti-block-label">Additional Information :</span><span class="ti-block-value">${data.additionalInformation || ''}</span></div>
    </div>

    <!-- Line Items Table -->
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
        ${lineItemsHTML}
        ${emptyRowsHTML}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="ti-totals">
      <div class="ti-totals-row">
        <div class="ti-totals-label">Total Value of Supply</div>
        <div class="ti-totals-value">${formatCurrency(totalValueOfSupply)}</div>
      </div>
      <div class="ti-totals-row">
        <div class="ti-totals-label">VAT Amount (Total Value of Supply @ ${vatRate}%)</div>
        <div class="ti-totals-value">${formatCurrency(vatAmount)}</div>
      </div>
      <div class="ti-totals-row" style="font-size:15px;">
        <div class="ti-totals-label">Total Amount including VAT</div>
        <div class="ti-totals-value">${formatCurrency(totalIncludingVat)}</div>
      </div>
    </div>

    <!-- Total Amount in Words -->
    <div class="ti-words-row">
      <div class="ti-words-label">Total Amount in words :</div>
      <div class="ti-words-value">${totalInWords}</div>
    </div>

    <!-- Mode of Payment -->
    <div class="ti-payment-row">
      <span class="ti-block-label">Mode of Payment :</span>
      <span class="ti-block-value">${data.modeOfPayment || ''}</span>
    </div>

    <!-- EOG Format Reference -->
    <div class="ti-footer-ref">EOG 02/04/05</div>

    <!-- Signatures -->
    <div class="ti-signatures">
      <div class="ti-sig-box">
        ${data.preparedBy?.signature ? `<img src="${data.preparedBy.signature}" class="ti-sig-image" alt="Signature" />` : '<div class="ti-sig-line"></div>'}
        <div class="ti-sig-label">Prepared By</div>
        ${data.preparedBy?.name ? `<div class="ti-sig-name">${data.preparedBy.name}</div>` : ''}
        ${data.preparedBy?.date ? `<div class="ti-sig-name">${formatDate(data.preparedBy.date)}</div>` : ''}
      </div>
      <div class="ti-sig-box">
        ${data.approvedBy?.signature ? `<img src="${data.approvedBy.signature}" class="ti-sig-image" alt="Signature" />` : '<div class="ti-sig-line"></div>'}
        <div class="ti-sig-label">Approved By</div>
        ${data.approvedBy?.name ? `<div class="ti-sig-name">${data.approvedBy.name}</div>` : ''}
        ${data.approvedBy?.date ? `<div class="ti-sig-name">${formatDate(data.approvedBy.date)}</div>` : ''}
      </div>
      <div class="ti-sig-box">
        ${data.customerSignature?.signature ? `<img src="${data.customerSignature.signature}" class="ti-sig-image" alt="Signature" />` : '<div class="ti-sig-line"></div>'}
        <div class="ti-sig-label">Customer</div>
        ${data.customerSignature?.name ? `<div class="ti-sig-name">${data.customerSignature.name}</div>` : ''}
        ${data.customerSignature?.date ? `<div class="ti-sig-name">${formatDate(data.customerSignature.date)}</div>` : ''}
      </div>
    </div>
  </div>
</div>
</body>
</html>`;
}
