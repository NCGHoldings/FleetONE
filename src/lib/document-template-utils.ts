import { format } from "date-fns";

// Convert number to words for amounts
const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const numberToWords = (num: number): string => {
  if (num === 0) return 'Zero';
  
  const convert = (n: number): string => {
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  };
  
  const rupees = Math.floor(num);
  const cents = Math.round((num - rupees) * 100);
  
  let result = convert(rupees) + ' Rupees';
  if (cents > 0) {
    result += ' and ' + convert(cents) + ' Cents';
  }
  return result + ' Only';
};

// Format currency
const formatCurrency = (amount: number | null | undefined): string => {
  const value = amount || 0;
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
  }).format(value);
};

// Format date
const formatDate = (date: string | null | undefined): string => {
  if (!date) return '—';
  try {
    return format(new Date(date), 'MMMM dd, yyyy');
  } catch {
    return date;
  }
};

// Generate line items HTML table for AR/AP invoices
const generateLineItemsTable = (lineItems: any[]): string => {
  if (!lineItems?.length) {
    return '<p>No line items</p>';
  }

  return `
    <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
      <thead>
        <tr style="background-color: #f3f4f6;">
          <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">#</th>
          <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">Description</th>
          <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: right;">Qty</th>
          <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: right;">Unit Price</th>
          <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: right;">Tax</th>
          <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${lineItems.map((item, idx) => `
          <tr>
            <td style="border: 1px solid #e5e7eb; padding: 8px;">${idx + 1}</td>
            <td style="border: 1px solid #e5e7eb; padding: 8px;">${item.description || ''}</td>
            <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right;">${item.quantity || 1}</td>
            <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right;">${formatCurrency(item.unit_price)}</td>
            <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right;">${formatCurrency(item.tax_amount)}</td>
            <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right;">${formatCurrency(item.line_total)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
};

// Generate allocations table for receipts/payments
const generateAllocationsTable = (allocations: any[]): string => {
  if (!allocations?.length) {
    return '<p>No allocations</p>';
  }

  return `
    <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
      <thead>
        <tr style="background-color: #f3f4f6;">
          <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">Invoice #</th>
          <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: right;">Allocated Amount</th>
        </tr>
      </thead>
      <tbody>
        ${allocations.map((alloc) => `
          <tr>
            <td style="border: 1px solid #e5e7eb; padding: 8px;">${alloc.ar_invoices?.invoice_number || alloc.ap_invoices?.invoice_number || alloc.invoice_id}</td>
            <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right;">${formatCurrency(alloc.allocated_amount)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
};

// Map document data to placeholders based on document type
export const mapDocumentToPlaceholders = (
  documentType: string,
  documentData: any,
  companyData?: any,
  lineItems?: any[],
  allocations?: any[],
  headerImageUrl?: string
): Record<string, string> => {
  const placeholders: Record<string, string> = {};

  // Company placeholders
  placeholders['{{company_name}}'] = companyData?.name || '';
  placeholders['{{company_address}}'] = companyData?.address || '';
  placeholders['{{company_phone}}'] = companyData?.phone || '';
  placeholders['{{company_email}}'] = companyData?.email || '';
  placeholders['{{company_tax_id}}'] = companyData?.tax_number || companyData?.registration_number || '';
  placeholders['{{company_registration}}'] = companyData?.registration_number || '';
  placeholders['{{company_logo}}'] = headerImageUrl 
    ? `<img src="${headerImageUrl}" style="max-height: 80px; max-width: 200px;" alt="Company Logo" />`
    : '';

  // Common date
  placeholders['{{current_date}}'] = formatDate(new Date().toISOString());
  placeholders['{{print_date}}'] = formatDate(new Date().toISOString());

  // Document-type specific mappings
  switch (documentType) {
    case 'ar_invoice':
      placeholders['{{invoice_number}}'] = documentData?.invoice_number || '';
      placeholders['{{invoice_date}}'] = formatDate(documentData?.invoice_date);
      placeholders['{{due_date}}'] = formatDate(documentData?.due_date);
      placeholders['{{customer_name}}'] = documentData?.customers?.customer_name || '';
      placeholders['{{customer_address}}'] = documentData?.customers?.address || '';
      placeholders['{{customer_email}}'] = documentData?.customers?.email || '';
      placeholders['{{customer_phone}}'] = documentData?.customers?.phone || '';
      placeholders['{{customer_code}}'] = documentData?.customers?.customer_code || '';
      placeholders['{{subtotal}}'] = formatCurrency(documentData?.subtotal);
      placeholders['{{tax_amount}}'] = formatCurrency(documentData?.tax_amount);
      placeholders['{{discount_amount}}'] = formatCurrency(documentData?.discount_amount);
      placeholders['{{total_amount}}'] = formatCurrency(documentData?.total_amount);
      placeholders['{{paid_amount}}'] = formatCurrency(documentData?.paid_amount);
      placeholders['{{balance}}'] = formatCurrency(documentData?.balance);
      placeholders['{{amount_in_words}}'] = numberToWords(documentData?.total_amount || 0);
      placeholders['{{status}}'] = documentData?.status?.toUpperCase() || '';
      placeholders['{{reference}}'] = documentData?.reference || '';
      placeholders['{{notes}}'] = documentData?.notes || '';
      placeholders['{{line_items}}'] = generateLineItemsTable(lineItems || []);
      break;

    case 'ar_receipt':
      placeholders['{{receipt_number}}'] = documentData?.receipt_number || '';
      placeholders['{{receipt_date}}'] = formatDate(documentData?.receipt_date);
      placeholders['{{customer_name}}'] = documentData?.customers?.customer_name || '';
      placeholders['{{customer_address}}'] = documentData?.customers?.address || '';
      placeholders['{{customer_code}}'] = documentData?.customers?.customer_code || '';
      placeholders['{{amount}}'] = formatCurrency(documentData?.amount);
      placeholders['{{total_amount}}'] = formatCurrency(documentData?.amount);
      placeholders['{{amount_in_words}}'] = numberToWords(documentData?.amount || 0);
      placeholders['{{payment_method}}'] = documentData?.payment_method?.replace('_', ' ')?.toUpperCase() || '';
      placeholders['{{reference}}'] = documentData?.reference || '';
      placeholders['{{cheque_number}}'] = documentData?.cheque_number || '';
      placeholders['{{notes}}'] = documentData?.notes || '';
      placeholders['{{allocations}}'] = generateAllocationsTable(allocations || []);
      break;

    case 'ar_credit_note':
      placeholders['{{credit_note_number}}'] = documentData?.credit_note_number || '';
      placeholders['{{credit_date}}'] = formatDate(documentData?.credit_date);
      placeholders['{{customer_name}}'] = documentData?.customers?.customer_name || '';
      placeholders['{{customer_code}}'] = documentData?.customers?.customer_code || '';
      placeholders['{{amount}}'] = formatCurrency(documentData?.amount);
      placeholders['{{total_amount}}'] = formatCurrency(documentData?.amount);
      placeholders['{{amount_in_words}}'] = numberToWords(documentData?.amount || 0);
      placeholders['{{original_invoice}}'] = documentData?.ar_invoices?.invoice_number || '';
      placeholders['{{reason}}'] = documentData?.reason || '';
      placeholders['{{status}}'] = documentData?.status?.toUpperCase() || '';
      break;

    case 'ap_invoice':
      placeholders['{{invoice_number}}'] = documentData?.invoice_number || '';
      placeholders['{{invoice_date}}'] = formatDate(documentData?.invoice_date);
      placeholders['{{due_date}}'] = formatDate(documentData?.due_date);
      placeholders['{{vendor_name}}'] = documentData?.vendors?.vendor_name || '';
      placeholders['{{vendor_address}}'] = documentData?.vendors?.address || '';
      placeholders['{{vendor_code}}'] = documentData?.vendors?.vendor_code || '';
      placeholders['{{subtotal}}'] = formatCurrency(documentData?.subtotal);
      placeholders['{{tax_amount}}'] = formatCurrency(documentData?.tax_amount);
      placeholders['{{wht_amount}}'] = formatCurrency(documentData?.wht_amount);
      placeholders['{{total_amount}}'] = formatCurrency(documentData?.total_amount);
      placeholders['{{paid_amount}}'] = formatCurrency(documentData?.paid_amount);
      placeholders['{{balance}}'] = formatCurrency(documentData?.balance);
      placeholders['{{amount_in_words}}'] = numberToWords(documentData?.total_amount || 0);
      placeholders['{{status}}'] = documentData?.status?.toUpperCase() || '';
      placeholders['{{approval_status}}'] = documentData?.approval_status?.toUpperCase() || '';
      placeholders['{{reference}}'] = documentData?.reference || '';
      placeholders['{{notes}}'] = documentData?.notes || '';
      placeholders['{{line_items}}'] = generateLineItemsTable(lineItems || []);
      break;

    case 'ap_payment_voucher':
      placeholders['{{payment_number}}'] = documentData?.payment_number || '';
      placeholders['{{payment_date}}'] = formatDate(documentData?.payment_date);
      placeholders['{{vendor_name}}'] = documentData?.vendors?.vendor_name || '';
      placeholders['{{vendor_address}}'] = documentData?.vendors?.address || '';
      placeholders['{{vendor_code}}'] = documentData?.vendors?.vendor_code || '';
      placeholders['{{amount}}'] = formatCurrency(documentData?.amount);
      placeholders['{{total_amount}}'] = formatCurrency(documentData?.amount);
      placeholders['{{amount_in_words}}'] = numberToWords(documentData?.amount || 0);
      placeholders['{{payment_method}}'] = documentData?.payment_method?.replace('_', ' ')?.toUpperCase() || '';
      placeholders['{{reference}}'] = documentData?.reference || '';
      placeholders['{{cheque_number}}'] = documentData?.cheque_number || '';
      placeholders['{{notes}}'] = documentData?.notes || '';
      placeholders['{{allocations}}'] = generateAllocationsTable(allocations || []);
      break;

    case 'ap_debit_note':
      placeholders['{{debit_note_number}}'] = documentData?.debit_note_number || '';
      placeholders['{{debit_date}}'] = formatDate(documentData?.debit_date);
      placeholders['{{vendor_name}}'] = documentData?.vendors?.vendor_name || '';
      placeholders['{{vendor_code}}'] = documentData?.vendors?.vendor_code || '';
      placeholders['{{amount}}'] = formatCurrency(documentData?.amount);
      placeholders['{{total_amount}}'] = formatCurrency(documentData?.amount);
      placeholders['{{amount_in_words}}'] = numberToWords(documentData?.amount || 0);
      placeholders['{{original_invoice}}'] = documentData?.ap_invoices?.invoice_number || '';
      placeholders['{{reason}}'] = documentData?.reason || '';
      placeholders['{{status}}'] = documentData?.status?.toUpperCase() || '';
      break;
  }

  return placeholders;
};

// Replace placeholders in HTML content
export const replacePlaceholders = (
  htmlContent: string,
  placeholders: Record<string, string>
): string => {
  let result = htmlContent;
  
  Object.entries(placeholders).forEach(([key, value]) => {
    const escapedKey = key.replace(/[{}]/g, '\\$&');
    result = result.replace(new RegExp(escapedKey, 'g'), value);
  });
  
  return result;
};

// Generate full HTML document for printing
export const generatePrintableDocument = (
  htmlContent: string,
  cssStyles?: string,
  paperSize: string = 'A4',
  orientation: string = 'portrait'
): string => {
  const pageStyles = `
    @page {
      size: ${paperSize} ${orientation};
      margin: 20mm;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #333;
      margin: 0;
      padding: 20px;
    }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f3f4f6; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: bold; }
    .mt-4 { margin-top: 16px; }
    .mb-4 { margin-bottom: 16px; }
    ${cssStyles || ''}
  `;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Document</title>
        <style>${pageStyles}</style>
      </head>
      <body>${htmlContent}</body>
    </html>
  `;
};
