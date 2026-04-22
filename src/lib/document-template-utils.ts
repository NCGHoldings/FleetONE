import { format } from "date-fns";

// Convert number to words for amounts - International format (Million/Billion)
const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
  'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

const numberToWords = (num: number): string => {
  if (num === 0) return 'ZERO RUPEES ONLY';

  const convertHundreds = (n: number): string => {
    let result = '';
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' HUNDRED ';
      n %= 100;
    }
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      result += ones[n] + ' ';
    }
    return result;
  };

  const rupees = Math.floor(num);
  const cents = Math.round((num - rupees) * 100);

  let result = '';
  const billion = Math.floor(rupees / 1000000000);
  const million = Math.floor((rupees % 1000000000) / 1000000);
  const thousand = Math.floor((rupees % 1000000) / 1000);
  const remainder = Math.floor(rupees % 1000);

  if (billion) result += convertHundreds(billion) + 'BILLION ';
  if (million) result += convertHundreds(million) + 'MILLION ';
  if (thousand) result += convertHundreds(thousand) + 'THOUSAND ';
  if (remainder) result += convertHundreds(remainder);

  result = result.trim() + ' RUPEES';

  if (cents > 0) {
    result += ' AND ' + convertHundreds(cents).trim() + ' CENTS';
  }

  result += ' ONLY';

  return result;
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

// Generate payment line items table for direct payments (Account Details)
const generatePaymentLineItemsTable = (lineItems: any[]): string => {
  if (!lineItems?.length) {
    return '';
  }
  let html = `<h4 style="margin: 0 0 5px 0; font-size: 14px; font-weight: bold; text-transform: uppercase;">ACCOUNT DETAILS</h4>
  <table style="width:100%;border-collapse:collapse;border: 2px solid black;font-size:12px;font-weight:bold;margin-bottom:20px;">
    <thead><tr>
      <th style="border:1px solid black;padding:6px;text-align:center;">ACCOUNT CODE</th>
      <th style="border:1px solid black;padding:6px;text-align:center;">ACCOUNT NAME</th>
      <th style="border:1px solid black;padding:6px;text-align:center;">DESCRIPTION</th>
      <th style="border:1px solid black;padding:6px;text-align:center;">GROSS AMOUNT<br>(LKR)</th>
      <th style="border:1px solid black;padding:6px;text-align:center;">TAX<br>(LKR)</th>
      <th style="border:1px solid black;padding:6px;text-align:center;">NET AMOUNT<br>(LKR)</th>
    </tr></thead><tbody>`;
  let totalGross = 0;
  let totalTax = 0;
  let totalNet = 0;
  lineItems.forEach((item: any) => {
    const gross = (item.quantity || 1) * (item.unit_price || 0);
    const tax = item.tax_amount || 0;
    const net = gross + tax;
    totalGross += gross;
    totalTax += tax;
    totalNet += net;
    html += `<tr>
      <td style="border:1px solid black;padding:6px;text-align:center;">${item.chart_of_accounts?.account_code || ''}</td>
      <td style="border:1px solid black;padding:6px;text-align:center;">${item.chart_of_accounts?.account_name || ''}</td>
      <td style="border:1px solid black;padding:6px;">${item.description || ''}</td>
      <td style="border:1px solid black;padding:6px;text-align:right;">${formatCurrency(gross).replace('LKR', '').trim()}</td>
      <td style="border:1px solid black;padding:6px;text-align:right;">${formatCurrency(tax).replace('LKR', '').trim()}</td>
      <td style="border:1px solid black;padding:6px;text-align:right;">${formatCurrency(net).replace('LKR', '').trim()}</td>
    </tr>`;
  });
  
  // Add some empty rows to make it look like the template
  for(let i=0; i<3; i++) {
    html += `<tr>
      <td style="border:1px solid black;padding:12px;"></td>
      <td style="border:1px solid black;padding:12px;"></td>
      <td style="border:1px solid black;padding:12px;"></td>
      <td style="border:1px solid black;padding:12px;"></td>
      <td style="border:1px solid black;padding:12px;"></td>
      <td style="border:1px solid black;padding:12px;"></td>
    </tr>`;
  }

  html += `<tr>
    <td colspan="3" style="border:1px solid black;padding:6px;text-align:right;">TOTAL</td>
    <td style="border:1px solid black;padding:6px;text-align:right;">${formatCurrency(totalGross).replace('LKR', '').trim()}</td>
    <td style="border:1px solid black;padding:6px;text-align:right;">${formatCurrency(totalTax).replace('LKR', '').trim()}</td>
    <td style="border:1px solid black;padding:6px;text-align:right;">${formatCurrency(totalNet).replace('LKR', '').trim()}</td>
  </tr>`;
  html += '</tbody></table>';
  return html;
};

// Generate allocations table for receipts/payments (Invoice Allocation)
const generateAllocationsTable = (allocations: any[]): string => {
  if (!allocations?.length) {
    return '';
  }

  let html = `<h4 style="margin: 0 0 5px 0; font-size: 14px; font-weight: bold; text-transform: uppercase;">INVOICE ALLOCATION</h4>
    <table style="width: 100%; border-collapse: collapse; border: 2px solid black; margin-bottom: 20px; font-size: 12px; font-weight: bold;">
      <thead>
        <tr>
          <th style="border: 1px solid black; padding: 6px; text-align: center;">INVOICE NO</th>
          <th style="border: 1px solid black; padding: 6px; text-align: center;">DESCRIPTION</th>
          <th style="border: 1px solid black; padding: 6px; text-align: center;">GROSS AMOUNT<br>(LKR)</th>
          <th style="border: 1px solid black; padding: 6px; text-align: center;">TAX<br>(LKR)</th>
          <th style="border: 1px solid black; padding: 6px; text-align: center;">NET AMOUNT<br>(LKR)</th>
        </tr>
      </thead>
      <tbody>`;
      
  let totalGross = 0;
  let totalTax = 0;
  let totalNet = 0;
  
  allocations.forEach((alloc) => {
    // Usually allocation amount is the net we are paying. Let's assume gross = allocated, tax = 0.
    const net = alloc.allocated_amount || 0;
    const tax = 0;
    const gross = net;
    totalGross += gross;
    totalTax += tax;
    totalNet += net;
    
    html += `
          <tr>
            <td style="border: 1px solid black; padding: 6px; text-align: center;">${alloc.ar_invoices?.invoice_number || alloc.ap_invoices?.invoice_number || alloc.invoice_id}</td>
            <td style="border: 1px solid black; padding: 6px; text-align: center;">${alloc.ap_invoices?.ap_invoice_lines?.map((l: any) => l.description).filter(Boolean).join(', ') || alloc.ap_invoices?.notes || alloc.ar_invoices?.notes || ''}</td>
            <td style="border: 1px solid black; padding: 6px; text-align: right;">${formatCurrency(gross).replace('LKR', '').trim()}</td>
            <td style="border: 1px solid black; padding: 6px; text-align: right;">0.00</td>
            <td style="border: 1px solid black; padding: 6px; text-align: right;">${formatCurrency(net).replace('LKR', '').trim()}</td>
          </tr>
    `;
  });
  
  // Add some empty rows to make it look like the template
  for(let i=0; i<3; i++) {
    html += `<tr>
      <td style="border:1px solid black;padding:12px;"></td>
      <td style="border:1px solid black;padding:12px;"></td>
      <td style="border:1px solid black;padding:12px;"></td>
      <td style="border:1px solid black;padding:12px;"></td>
      <td style="border:1px solid black;padding:12px;"></td>
    </tr>`;
  }
  
  html += `
      <tr>
        <td colspan="2" style="border: 1px solid black; padding: 6px; text-align: right;">TOTAL</td>
        <td style="border: 1px solid black; padding: 6px; text-align: right;">${formatCurrency(totalGross).replace('LKR', '').trim()}</td>
        <td style="border: 1px solid black; padding: 6px; text-align: right;">${formatCurrency(totalTax).replace('LKR', '').trim()}</td>
        <td style="border: 1px solid black; padding: 6px; text-align: right;">${formatCurrency(totalNet).replace('LKR', '').trim()}</td>
      </tr>
      </tbody>
    </table>
  `;
  return html;
};

// Header mode type
export type HeaderMode = 'header_image' | 'logo_only' | 'html_only' | 'logo_and_html';

// Map document data to placeholders based on document type
export const mapDocumentToPlaceholders = (
  documentType: string,
  documentData: any,
  companyData?: any,
  lineItems?: any[],
  allocations?: any[],
  headerImageUrl?: string,
  headerMode: HeaderMode = 'logo_and_html'
): Record<string, string> => {
  const placeholders: Record<string, string> = {};

  // Company placeholders (always available) - with fallback guidance for empty fields
  placeholders['{{company_name}}'] = companyData?.name || '';
  placeholders['{{company_address}}'] = companyData?.address || '';
  placeholders['{{company_phone}}'] = companyData?.phone || '';
  placeholders['{{company_email}}'] = companyData?.email || '';
  placeholders['{{company_tax_id}}'] = companyData?.tax_number || companyData?.registration_number || companyData?.tax_registration_number || '';
  placeholders['{{company_registration}}'] = companyData?.registration_number || '';
  // Raw logo URL for templates that use src="{{company_logo}}" directly (not as <img> tag)
  placeholders['{{company_logo_url}}'] = companyData?.logo_url || '';
  
  // NCG Master placeholders + Sector specific
  placeholders['{{sector_name}}'] = companyData?.name || '';
  placeholders['{{sector_code}}'] = companyData?.short_code || '';
  placeholders['{{ncg_master_logo}}'] = companyData?.logo_url || `${window.location.origin}/ncg-holdings-logo.png`;

  
  // Use company logo_url for logo_and_html mode when no header image is set
  const companyLogoUrl = companyData?.logo_url;
  
  // Generate header and logo placeholders based on header mode
  switch (headerMode) {
    case 'header_image':
      // Full-width banner image replaces entire header section
      placeholders['{{document_header}}'] = headerImageUrl 
        ? `<div class="full-header-image" style="width: 100%; margin-bottom: 10px;"><img src="${headerImageUrl}" style="width: 100%; max-height: 250px; object-fit: contain; display: block;" alt="Document Header" /></div>`
        : '';
      placeholders['{{company_logo}}'] = ''; // No separate logo in this mode
      break;
      
    case 'logo_only':
      // Centered logo only, no company text in header
      placeholders['{{company_logo}}'] = headerImageUrl 
        ? `<img src="${headerImageUrl}" style="max-height: 200px; display: block; margin: 0 auto;" alt="Company Logo" />`
        : '';
      placeholders['{{document_header}}'] = ''; // No full header banner
      break;
      
    case 'html_only':
      // No images, only HTML/text-based header
      placeholders['{{company_logo}}'] = '';
      placeholders['{{document_header}}'] = '';
      break;
      
    case 'logo_and_html':
    default: {
      // Standard mode: logo on left + company details (default)
      // Try headerImageUrl first, then fall back to company logo_url
      const logoToUse = headerImageUrl || companyLogoUrl;
      placeholders['{{company_logo}}'] = logoToUse 
        ? `<img src="${logoToUse}" style="max-height: 200px; max-width: 400px; object-fit: contain;" alt="Company Logo" />`
        : '';
      placeholders['{{document_header}}'] = ''; // No full header banner in this mode
      break;
    }
  }

  // Common date
  placeholders['{{current_date}}'] = formatDate(new Date().toISOString());
  placeholders['{{print_date}}'] = formatDate(new Date().toISOString());

  // Document-type specific mappings
  switch (documentType) {
    case 'ar_invoice': {
      placeholders['{{invoice_number}}'] = documentData?.invoice_number || '';
      placeholders['{{invoice_date}}'] = formatDate(documentData?.invoice_date);
      placeholders['{{due_date}}'] = formatDate(documentData?.due_date);
      placeholders['{{customer_name}}'] = documentData?.customers?.customer_name || '';
      placeholders['{{customer_address}}'] = documentData?.customers?.billing_address || '';
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
      // Aliases for custom templates
      placeholders['{{payee_name}}'] = documentData?.customers?.customer_name || '';
      placeholders['{{payee_tax_id}}'] = documentData?.customers?.tax_id || '';
      placeholders['{{currency}}'] = 'LKR';
      placeholders['{{narration}}'] = documentData?.notes || '';
      const arInvStatus = documentData?.status || 'draft';
      placeholders['{{status_text}}'] = arInvStatus.charAt(0).toUpperCase() + arInvStatus.slice(1);
      placeholders['{{status_class}}'] = arInvStatus === 'paid' ? '' : arInvStatus === 'unpaid' ? 'pending' : 'rejected';
      placeholders['{{system_uuid}}'] = documentData?.id || '';
      placeholders['{{hash}}'] = documentData?.id ? documentData.id.substring(0, 8).toUpperCase() : '';
      const arInvLogo = companyData?.logo_url || headerImageUrl || '';
      if (arInvLogo) placeholders['{{company_logo}}'] = `<img src="${arInvLogo}" style="width:100%;height:100%;object-fit:contain;" alt="Company Logo" />`;
      break;
    }

    case 'ar_receipt': {
      placeholders['{{receipt_number}}'] = documentData?.receipt_number || '';
      placeholders['{{receipt_date}}'] = formatDate(documentData?.receipt_date);
      placeholders['{{customer_name}}'] = documentData?.customers?.customer_name || '';
      placeholders['{{customer_address}}'] = documentData?.customers?.billing_address || '';
      placeholders['{{customer_code}}'] = documentData?.customers?.customer_code || '';
      placeholders['{{amount}}'] = formatCurrency(documentData?.amount);
      placeholders['{{total_amount}}'] = formatCurrency(documentData?.amount);
      placeholders['{{amount_in_words}}'] = numberToWords(documentData?.amount || 0);
      placeholders['{{payment_method}}'] = documentData?.payment_method?.replace('_', ' ')?.toUpperCase() || '';
      placeholders['{{reference}}'] = documentData?.reference || '';
      placeholders['{{cheque_number}}'] = documentData?.cheque_number || '';
      placeholders['{{notes}}'] = documentData?.notes || '';
      placeholders['{{allocations}}'] = generateAllocationsTable(allocations || []);
      // Aliases
      placeholders['{{voucher_no}}'] = documentData?.receipt_number || '';
      placeholders['{{voucher_date}}'] = formatDate(documentData?.receipt_date);
      placeholders['{{payee_name}}'] = documentData?.customers?.customer_name || '';
      placeholders['{{currency}}'] = 'LKR';
      placeholders['{{payment_ref}}'] = documentData?.reference || documentData?.cheque_number || '';
      placeholders['{{narration}}'] = documentData?.notes || '';
      placeholders['{{system_uuid}}'] = documentData?.id || '';
      placeholders['{{hash}}'] = documentData?.id ? documentData.id.substring(0, 8).toUpperCase() : '';
      const arRcptLogo = companyData?.logo_url || headerImageUrl || '';
      if (arRcptLogo) placeholders['{{company_logo}}'] = `<img src="${arRcptLogo}" style="width:100%;height:100%;object-fit:contain;" alt="Company Logo" />`;
      break;
    }

    case 'ar_credit_note': {
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
      // Aliases
      placeholders['{{payee_name}}'] = documentData?.customers?.customer_name || '';
      placeholders['{{currency}}'] = 'LKR';
      placeholders['{{narration}}'] = documentData?.reason || '';
      placeholders['{{system_uuid}}'] = documentData?.id || '';
      placeholders['{{hash}}'] = documentData?.id ? documentData.id.substring(0, 8).toUpperCase() : '';
      const arCnLogo = companyData?.logo_url || headerImageUrl || '';
      if (arCnLogo) placeholders['{{company_logo}}'] = `<img src="${arCnLogo}" style="width:100%;height:100%;object-fit:contain;" alt="Company Logo" />`;
      break;
    }

    case 'ap_invoice': {
      // Standard mappings
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

      // ===== Extended Vendor Details =====
      placeholders['{{vendor_tax_id}}'] = documentData?.vendors?.tax_id || '';
      placeholders['{{vendor_bank_account}}'] = documentData?.vendors?.bank_account || '';
      placeholders['{{vendor_bank_name}}'] = documentData?.vendors?.bank_name || '';
      placeholders['{{vendor_bank_branch}}'] = documentData?.vendors?.bank_branch || '';
      placeholders['{{vendor_email}}'] = documentData?.vendors?.email || '';
      placeholders['{{vendor_phone}}'] = documentData?.vendors?.phone || '';
      placeholders['{{vendor_contact}}'] = documentData?.vendors?.contact_person || '';
      placeholders['{{currency}}'] = documentData?.vendors?.currency || 'LKR';
      placeholders['{{payment_terms}}'] = documentData?.vendors?.payment_terms ? `${documentData.vendors.payment_terms} days` : '';

      // Payee aliases (for Yutong-style templates)
      placeholders['{{payee_name}}'] = documentData?.vendors?.vendor_name || '';
      placeholders['{{payee_account}}'] = documentData?.vendors?.bank_account || '';
      placeholders['{{payee_bank}}'] = documentData?.vendors?.bank_name || '';
      placeholders['{{payee_tax_id}}'] = documentData?.vendors?.tax_id || '';

      // Status helpers
      const invStatus = documentData?.status || 'draft';
      placeholders['{{status_text}}'] = invStatus.charAt(0).toUpperCase() + invStatus.slice(1);
      placeholders['{{status_class}}'] = invStatus === 'paid' ? '' : invStatus === 'unpaid' ? 'pending' : invStatus === 'overdue' ? 'rejected' : '';

      // Narration alias
      placeholders['{{narration}}'] = documentData?.notes || '';

      // Balance aliases
      placeholders['{{balance_due}}'] = formatCurrency(documentData?.balance);
      placeholders['{{net_payable}}'] = formatCurrency(documentData?.total_amount);
      placeholders['{{freight}}'] = formatCurrency(documentData?.freight_amount || 0);
      placeholders['{{discount}}'] = formatCurrency(documentData?.discount_amount || 0);

      // System identifiers
      placeholders['{{system_uuid}}'] = documentData?.id || '';
      placeholders['{{hash}}'] = documentData?.id ? documentData.id.substring(0, 8).toUpperCase() : '';

      // Signature placeholders (name + signature image)
      placeholders['{{verified_by}}'] = documentData?.verified_by || '';
      placeholders['{{verified_by_signature}}'] = documentData?.verified_by_signature 
        ? `<img src="${documentData.verified_by_signature}" style="max-height: 60px; max-width: 150px;" alt="Signature" />`
        : '';
      placeholders['{{approved_by}}'] = documentData?.approved_by || '';
      placeholders['{{approved_by_signature}}'] = documentData?.approved_by_signature 
        ? `<img src="${documentData.approved_by_signature}" style="max-height: 60px; max-width: 150px;" alt="Signature" />`
        : '';
      placeholders['{{received_by}}'] = documentData?.received_by || '';
      placeholders['{{received_by_signature}}'] = documentData?.received_by_signature 
        ? `<img src="${documentData.received_by_signature}" style="max-height: 60px; max-width: 150px;" alt="Signature" />`
        : '';
      placeholders['{{finance_controller}}'] = documentData?.finance_controller || '';
      placeholders['{{finance_controller_signature}}'] = documentData?.finance_controller_signature 
        ? `<img src="${documentData.finance_controller_signature}" style="max-height: 60px; max-width: 150px;" alt="Signature" />`
        : '';
      placeholders['{{prepared_by}}'] = documentData?.prepared_by || '';
      placeholders['{{authorized_by}}'] = documentData?.authorized_by || '';

      // Company logo URL for custom templates
      const invLogoUrl = companyData?.logo_url || headerImageUrl || '';
      if (invLogoUrl) {
        placeholders['{{company_logo}}'] = `<img src="${invLogoUrl}" style="width:100%;height:100%;object-fit:contain;" alt="Company Logo" />`;
      }
      break;
    }

    case 'ap_payment_voucher': {
      // Branch payee data source based on payee_type (vendor | customer | employee)
      // The AP Payments query joins customers via ap_payments_payee_customer_id_fkey,
      // so when payee_type='customer' we must read from documentData.customers, not vendors.
      const payeeType = documentData?.payee_type || 'vendor';
      const isCustomerPayee = payeeType === 'customer';
      const isEmployeePayee = payeeType === 'employee';
      const customerPayee = documentData?.customers || null;
      const employeePayee = documentData?.employees || documentData?.staff_registry || null;

      // Resolved payee fields (name / address / code / bank / contact / currency)
      const payeeName = isCustomerPayee
        ? (customerPayee?.customer_name || '')
        : isEmployeePayee
          ? (employeePayee?.staff_name || '')
          : (documentData?.vendors?.vendor_name || '');
      const payeeAddress = isCustomerPayee
        ? (customerPayee?.billing_address || '')
        : isEmployeePayee
          ? (employeePayee?.address || '')
          : (documentData?.vendors?.address || '');
      const payeeCode = isCustomerPayee
        ? (customerPayee?.customer_code || '')
        : isEmployeePayee
          ? (employeePayee?.staff_code || employeePayee?.id?.substring(0, 8) || '')
          : (documentData?.vendors?.vendor_code || '');
      const payeeBankAccount = isCustomerPayee
        ? (customerPayee?.bank_account || '')
        : isEmployeePayee
          ? (employeePayee?.bank_account || '')
          : (documentData?.vendors?.bank_account || '');
      const payeeBankName = isCustomerPayee
        ? (customerPayee?.bank_name || '')
        : isEmployeePayee
          ? (employeePayee?.bank_name || '')
          : (documentData?.vendors?.bank_name || '');
      const payeeBankBranch = isCustomerPayee
        ? (customerPayee?.bank_branch || '')
        : isEmployeePayee
          ? (employeePayee?.bank_branch || '')
          : (documentData?.vendors?.bank_branch || '');
      const payeeEmail = isCustomerPayee
        ? (customerPayee?.email || '')
        : isEmployeePayee
          ? (employeePayee?.email || '')
          : (documentData?.vendors?.email || '');
      const payeePhone = isCustomerPayee
        ? (customerPayee?.phone || '')
        : isEmployeePayee
          ? (employeePayee?.phone || employeePayee?.mobile_number || '')
          : (documentData?.vendors?.phone || '');
      const payeeContact = isCustomerPayee
        ? (customerPayee?.contact_person || customerPayee?.customer_name || '')
        : isEmployeePayee
          ? (employeePayee?.staff_name || '')
          : (documentData?.vendors?.contact_person || '');
      const payeeTaxId = isCustomerPayee
        ? (customerPayee?.tax_id || '')
        : isEmployeePayee
          ? (employeePayee?.nic_number || '')
          : (documentData?.vendors?.tax_id || '');
      const payeeCurrency = isCustomerPayee
        ? (customerPayee?.currency || 'LKR')
        : (documentData?.vendors?.currency || 'LKR');
      const payeeTypeLabel = isCustomerPayee ? 'Customer' : isEmployeePayee ? 'Employee' : 'Vendor';

      // Standard field mappings
      placeholders['{{payment_number}}'] = documentData?.payment_number || '';
      placeholders['{{payment_date}}'] = formatDate(documentData?.payment_date);
      placeholders['{{vendor_name}}'] = payeeName;
      placeholders['{{vendor_address}}'] = payeeAddress;
      placeholders['{{vendor_code}}'] = payeeCode;
      placeholders['{{payee_type_label}}'] = payeeTypeLabel;
      placeholders['{{amount}}'] = formatCurrency(documentData?.amount);
      placeholders['{{total_amount}}'] = formatCurrency(documentData?.amount);
      placeholders['{{amount_in_words}}'] = numberToWords(documentData?.amount || 0);
      const payMethod = documentData?.payment_method?.replace(/_/g, ' ');
      placeholders['{{payment_method}}'] = payMethod?.toUpperCase() || '';
      placeholders['{{reference}}'] = documentData?.reference || '';
      placeholders['{{cheque_number}}'] = documentData?.cheque_number || '';
      placeholders['{{notes}}'] = documentData?.notes || '';
      // For direct payments or advance payments, show payment line items instead of allocations
      if (documentData?.is_direct_payment && lineItems?.length) {
        placeholders['{{allocations}}'] = generatePaymentLineItemsTable(lineItems);
        placeholders['{{payment_line_items}}'] = generatePaymentLineItemsTable(lineItems);
      } else if (documentData?.is_advance) {
        // For advance payments, show account details with notes as description
        const mockLineItem = {
          chart_of_accounts: {
            account_code: '',
            account_name: 'Advance Payment',
          },
          description: documentData?.notes || 'Advance Payment',
          quantity: 1,
          unit_price: documentData?.amount || 0,
          tax_amount: 0,
        };
        placeholders['{{allocations}}'] = generatePaymentLineItemsTable([mockLineItem]);
        placeholders['{{payment_line_items}}'] = generatePaymentLineItemsTable([mockLineItem]);
      } else {
        placeholders['{{allocations}}'] = generateAllocationsTable(allocations || []);
      }
      
      // Voucher title
      placeholders['{{voucher_title}}'] = documentData?.is_advance ? 'ADVANCE PAYMENT VOUCHER' : 'PAYMENT VOUCHER';

      // ===== Yutong / Custom Template Aliases =====
      // Voucher aliases
      placeholders['{{voucher_no}}'] = documentData?.payment_number || '';
      placeholders['{{voucher_date}}'] = formatDate(documentData?.payment_date);

      // Payee aliases (resolved from payee_type-aware variables above)
      placeholders['{{payee_name}}'] = payeeName;
      placeholders['{{payee_account}}'] = payeeBankAccount;
      placeholders['{{payee_bank}}'] = payeeBankName;
      placeholders['{{payee_tax_id}}'] = payeeTaxId;

      // Vendor bank account details (vendor_bank_accounts join still preferred when present)
      const vendorBankAccount = documentData?.vendor_bank_accounts;
      placeholders['{{vendor_bank_name}}'] = vendorBankAccount?.bank_name || payeeBankName;
      placeholders['{{vendor_bank_branch}}'] = vendorBankAccount?.bank_branch || payeeBankBranch;
      placeholders['{{vendor_account_number}}'] = vendorBankAccount?.account_number || payeeBankAccount;
      placeholders['{{vendor_account_holder}}'] = vendorBankAccount?.account_holder_name || payeeName;
      placeholders['{{vendor_email}}'] = payeeEmail;
      placeholders['{{vendor_phone}}'] = payeePhone;
      placeholders['{{vendor_contact}}'] = payeeContact;

      // AP Payment Specific Fields
      const isCheque = (payMethod || '').toLowerCase() === 'cheque';
      placeholders['{{date_label}}'] = isCheque ? 'CHEQUE DATE' : 'VALUE DATE';
      
      const paymentDateFormatted = formatDate(documentData?.payment_date);
      placeholders['{{date_value}}'] = isCheque && documentData?.cheque_date ? formatDate(documentData?.cheque_date) : paymentDateFormatted;
      
      if (!isCheque) {
        placeholders['{{beneficiary_bank_details}}'] = `
        <h4 style="margin: 0 0 5px 0; font-size: 14px; font-weight: bold; text-transform: uppercase;">BENEFICIARY BANK DETAILS</h4>
        <table style="width: 100%; border-collapse: collapse; border: 2px solid black; margin-bottom: 20px; font-weight: bold;">
          <tr>
            <td style="border: 1px solid black; padding: 5px; width: 25%;">BANK NAME</td>
            <td style="border: 1px solid black; padding: 5px; width: 75%;">${vendorBankAccount?.bank_name || payeeBankName}</td>
          </tr>
          <tr>
            <td style="border: 1px solid black; padding: 5px;">BRANCH</td>
            <td style="border: 1px solid black; padding: 5px;">${vendorBankAccount?.bank_branch || payeeBankBranch}</td>
          </tr>
          <tr>
            <td style="border: 1px solid black; padding: 5px;">PAYEE NAME</td>
            <td style="border: 1px solid black; padding: 5px;">${vendorBankAccount?.account_holder_name || payeeName}</td>
          </tr>
          <tr>
            <td style="border: 1px solid black; padding: 5px;">ACCOUNT NO.</td>
            <td style="border: 1px solid black; padding: 5px;">${vendorBankAccount?.account_number || payeeBankAccount}</td>
          </tr>
        </table>
        `;
      } else {
        placeholders['{{beneficiary_bank_details}}'] = '';
      }
      
      if (isCheque) {
        placeholders['{{payment_received_by}}'] = `
        <h4 style="margin: 0 0 5px 0; font-size: 14px; font-weight: bold; text-transform: uppercase;">PAYMENT RECEIVED BY</h4>
        <table style="width: 100%; border-collapse: collapse; border: 2px solid black; margin-bottom: 20px; font-weight: bold;">
          <tr>
            <td style="border: 1px solid black; padding: 5px; width: 25%;">NAME</td>
            <td style="border: 1px solid black; padding: 5px; width: 45%;"></td>
            <td style="border: 1px solid black; padding: 5px; width: 30%; text-align: center;">Signature</td>
          </tr>
          <tr>
            <td style="border: 1px solid black; padding: 5px;">NIC NO.</td>
            <td style="border: 1px solid black; padding: 5px;"></td>
            <td style="border: 1px solid black; padding: 5px;" rowspan="2"></td>
          </tr>
          <tr>
            <td style="border: 1px solid black; padding: 5px;">CONTACT NO.</td>
            <td style="border: 1px solid black; padding: 5px;"></td>
          </tr>
        </table>
        `;
      } else {
        placeholders['{{payment_received_by}}'] = '';
      }

      // Currency (resolved by payee type)
      placeholders['{{currency}}'] = payeeCurrency;

      // Payment reference (reference or cheque number)
      placeholders['{{payment_ref}}'] = documentData?.reference || documentData?.cheque_number || '';

      // Source bank account (from joined bank_accounts)
      placeholders['{{source_account}}'] = documentData?.bank_accounts?.account_name || '';
      placeholders['{{source_bank}}'] = documentData?.bank_accounts?.bank_name || '';
      placeholders['{{source_account_number}}'] = documentData?.bank_accounts?.account_number || '';

      // Narration alias for notes
      placeholders['{{narration}}'] = documentData?.notes || '';

      // Status
      const statusVal = documentData?.status || documentData?.approval_status || 'draft';
      placeholders['{{status_text}}'] = statusVal.charAt(0).toUpperCase() + statusVal.slice(1);
      placeholders['{{status_class}}'] = statusVal === 'approved' ? '' : statusVal === 'pending' ? 'pending' : statusVal === 'rejected' ? 'rejected' : '';

      // System identifiers
      placeholders['{{system_uuid}}'] = documentData?.id || '';
      placeholders['{{hash}}'] = documentData?.id ? documentData.id.substring(0, 8).toUpperCase() : '';

      // Signature placeholders (name + signature image)
      placeholders['{{prepared_by}}'] = documentData?.prepared_by || '';
      placeholders['{{prepared_by_signature}}'] = documentData?.prepared_by_signature 
        ? `<img src="${documentData.prepared_by_signature}" style="max-height: 60px; max-width: 150px;" alt="Signature" />`
        : '';
      placeholders['{{verified_by}}'] = documentData?.verified_by || '';
      placeholders['{{verified_by_signature}}'] = documentData?.verified_by_signature 
        ? `<img src="${documentData.verified_by_signature}" style="max-height: 60px; max-width: 150px;" alt="Signature" />`
        : '';
      placeholders['{{authorized_by}}'] = documentData?.authorized_by || '';
      placeholders['{{authorized_by_signature}}'] = documentData?.authorized_by_signature 
        ? `<img src="${documentData.authorized_by_signature}" style="max-height: 60px; max-width: 150px;" alt="Signature" />`
        : '';
      placeholders['{{approved_by}}'] = documentData?.approved_by || '';
      placeholders['{{approved_by_signature}}'] = documentData?.approved_by_signature 
        ? `<img src="${documentData.approved_by_signature}" style="max-height: 60px; max-width: 150px;" alt="Signature" />`
        : '';
      placeholders['{{received_by}}'] = documentData?.received_by || '';
      placeholders['{{finance_controller}}'] = documentData?.finance_controller || '';
      placeholders['{{payee_signature_name}}'] = payeeName;

      // Use company logo URL directly for custom templates that use src="{{company_logo}}"
      // Override the <img> tag version with the raw URL for custom templates
      const logoUrl = companyData?.logo_url || headerImageUrl || '';
      if (logoUrl) {
        placeholders['{{company_logo}}'] = `<img src="${logoUrl}" style="width:100%;height:100%;object-fit:contain;" alt="Company Logo" />`;
      }
      break;
    }

    case 'ap_debit_note': {
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
      // Aliases
      placeholders['{{vendor_address}}'] = documentData?.vendors?.address || '';
      placeholders['{{vendor_tax_id}}'] = documentData?.vendors?.tax_id || '';
      placeholders['{{payee_name}}'] = documentData?.vendors?.vendor_name || '';
      placeholders['{{currency}}'] = documentData?.vendors?.currency || 'LKR';
      placeholders['{{narration}}'] = documentData?.reason || '';
      placeholders['{{notes}}'] = documentData?.notes || '';
      placeholders['{{system_uuid}}'] = documentData?.id || '';
      placeholders['{{hash}}'] = documentData?.id ? documentData.id.substring(0, 8).toUpperCase() : '';
      const dnLogo = companyData?.logo_url || headerImageUrl || '';
      if (dnLogo) placeholders['{{company_logo}}'] = `<img src="${dnLogo}" style="width:100%;height:100%;object-fit:contain;" alt="Company Logo" />`;
      break;
    }

    case 'advance_receipt': {
      placeholders['{{receipt_number}}'] = documentData?.receipt_number || '';
      placeholders['{{receipt_date}}'] = formatDate(documentData?.receipt_date);
      placeholders['{{customer_name}}'] = documentData?.customers?.customer_name || '';
      placeholders['{{customer_address}}'] = documentData?.customers?.billing_address || '';
      placeholders['{{customer_code}}'] = documentData?.customers?.customer_code || '';
      placeholders['{{amount}}'] = formatCurrency(documentData?.amount);
      placeholders['{{total_amount}}'] = formatCurrency(documentData?.amount);
      placeholders['{{amount_in_words}}'] = numberToWords(documentData?.amount || 0);
      placeholders['{{payment_method}}'] = documentData?.payment_method?.replace(/_/g, ' ')?.toUpperCase() || '';
      placeholders['{{reference}}'] = documentData?.reference || '';
      placeholders['{{cheque_number}}'] = documentData?.cheque_number || '';
      placeholders['{{notes}}'] = documentData?.notes || '';
      placeholders['{{voucher_no}}'] = documentData?.receipt_number || '';
      placeholders['{{voucher_date}}'] = formatDate(documentData?.receipt_date);
      placeholders['{{payee_name}}'] = documentData?.customers?.customer_name || '';
      placeholders['{{currency}}'] = 'LKR';
      placeholders['{{narration}}'] = documentData?.notes || 'Advance payment received';
      placeholders['{{system_uuid}}'] = documentData?.id || '';
      placeholders['{{hash}}'] = documentData?.id ? documentData.id.substring(0, 8).toUpperCase() : '';
      const arAdvLogo = companyData?.logo_url || headerImageUrl || '';
      if (arAdvLogo) placeholders['{{company_logo}}'] = `<img src="${arAdvLogo}" style="width:100%;height:100%;object-fit:contain;" alt="Company Logo" />`;
      break;
    }

    case 'advance_payment': {
      placeholders['{{payment_number}}'] = documentData?.payment_number || '';
      placeholders['{{payment_date}}'] = formatDate(documentData?.payment_date);
      placeholders['{{vendor_name}}'] = documentData?.vendors?.vendor_name || '';
      placeholders['{{vendor_address}}'] = documentData?.vendors?.address || '';
      placeholders['{{vendor_code}}'] = documentData?.vendors?.vendor_code || '';
      placeholders['{{amount}}'] = formatCurrency(documentData?.amount);
      placeholders['{{total_amount}}'] = formatCurrency(documentData?.amount);
      placeholders['{{amount_in_words}}'] = numberToWords(documentData?.amount || 0);
      placeholders['{{payment_method}}'] = documentData?.payment_method?.replace(/_/g, ' ')?.toUpperCase() || '';
      placeholders['{{reference}}'] = documentData?.reference || '';
      placeholders['{{cheque_number}}'] = documentData?.cheque_number || '';
      placeholders['{{notes}}'] = documentData?.notes || '';
      placeholders['{{voucher_no}}'] = documentData?.payment_number || '';
      placeholders['{{voucher_date}}'] = formatDate(documentData?.payment_date);
      placeholders['{{payee_name}}'] = documentData?.vendors?.vendor_name || '';
      placeholders['{{currency}}'] = 'LKR';
      placeholders['{{narration}}'] = documentData?.notes || 'Advance payment made';
      placeholders['{{system_uuid}}'] = documentData?.id || '';
      placeholders['{{hash}}'] = documentData?.id ? documentData.id.substring(0, 8).toUpperCase() : '';
      const apAdvLogo = companyData?.logo_url || headerImageUrl || '';
      if (apAdvLogo) placeholders['{{company_logo}}'] = `<img src="${apAdvLogo}" style="width:100%;height:100%;object-fit:contain;" alt="Company Logo" />`;
      break;
    }

    case 'journal_voucher': {
      placeholders['{{voucher_no}}'] = documentData?.entry_number || documentData?.voucher_number || '';
      placeholders['{{voucher_date}}'] = formatDate(documentData?.entry_date || documentData?.voucher_date);
      placeholders['{{description}}'] = documentData?.description || '';
      placeholders['{{reference}}'] = documentData?.reference || '';
      placeholders['{{total_debit}}'] = formatCurrency(documentData?.total_debit);
      placeholders['{{total_credit}}'] = formatCurrency(documentData?.total_credit);
      placeholders['{{total_amount}}'] = formatCurrency(documentData?.total_debit || documentData?.total_credit);
      placeholders['{{amount_in_words}}'] = numberToWords(documentData?.total_debit || 0);
      placeholders['{{status}}'] = documentData?.status?.toUpperCase() || '';
      placeholders['{{narration}}'] = documentData?.description || '';
      placeholders['{{notes}}'] = documentData?.notes || documentData?.description || '';
      placeholders['{{currency}}'] = 'LKR';
      placeholders['{{system_uuid}}'] = documentData?.id || '';
      placeholders['{{hash}}'] = documentData?.id ? documentData.id.substring(0, 8).toUpperCase() : '';
      const jvLogo = companyData?.logo_url || headerImageUrl || '';
      if (jvLogo) placeholders['{{company_logo}}'] = `<img src="${jvLogo}" style="width:100%;height:100%;object-fit:contain;" alt="Company Logo" />`;
      break;
    }

    case 'cheque_voucher': {
      placeholders['{{voucher_no}}'] = documentData?.payment_number || documentData?.cheque_number || '';
      placeholders['{{voucher_date}}'] = formatDate(documentData?.payment_date || documentData?.cheque_date);
      placeholders['{{cheque_number}}'] = documentData?.cheque_number || '';
      placeholders['{{cheque_date}}'] = formatDate(documentData?.cheque_date);
      placeholders['{{payee_name}}'] = documentData?.vendors?.vendor_name || documentData?.payee || '';
      placeholders['{{amount}}'] = formatCurrency(documentData?.amount);
      placeholders['{{total_amount}}'] = formatCurrency(documentData?.amount);
      placeholders['{{amount_in_words}}'] = numberToWords(documentData?.amount || 0);
      placeholders['{{payment_method}}'] = 'CHEQUE';
      placeholders['{{reference}}'] = documentData?.reference || '';
      placeholders['{{notes}}'] = documentData?.notes || '';
      placeholders['{{narration}}'] = documentData?.notes || '';
      placeholders['{{source_account}}'] = documentData?.bank_accounts?.account_name || '';
      placeholders['{{source_bank}}'] = documentData?.bank_accounts?.bank_name || '';
      placeholders['{{currency}}'] = 'LKR';
      placeholders['{{system_uuid}}'] = documentData?.id || '';
      placeholders['{{hash}}'] = documentData?.id ? documentData.id.substring(0, 8).toUpperCase() : '';
      const cvLogo = companyData?.logo_url || headerImageUrl || '';
      if (cvLogo) placeholders['{{company_logo}}'] = `<img src="${cvLogo}" style="width:100%;height:100%;object-fit:contain;" alt="Company Logo" />`;
      break;
    }

    case 'wht_certificate': {
      placeholders['{{certificate_number}}'] = documentData?.certificate_number || '';
      placeholders['{{certificate_date}}'] = formatDate(documentData?.certificate_date || documentData?.payment_date);
      placeholders['{{payee_name}}'] = documentData?.vendors?.vendor_name || documentData?.customers?.customer_name || '';
      placeholders['{{payee_tax_id}}'] = documentData?.vendors?.tax_id || documentData?.customers?.tax_id || '';
      placeholders['{{payee_address}}'] = documentData?.vendors?.address || documentData?.customers?.billing_address || '';
      placeholders['{{gross_amount}}'] = formatCurrency(documentData?.gross_amount || documentData?.amount);
      placeholders['{{wht_rate}}'] = documentData?.wht_rate ? `${documentData.wht_rate}%` : '';
      placeholders['{{wht_amount}}'] = formatCurrency(documentData?.wht_amount);
      placeholders['{{net_amount}}'] = formatCurrency(documentData?.net_amount || ((documentData?.gross_amount || 0) - (documentData?.wht_amount || 0)));
      placeholders['{{amount}}'] = formatCurrency(documentData?.wht_amount || documentData?.amount);
      placeholders['{{total_amount}}'] = formatCurrency(documentData?.gross_amount || documentData?.amount);
      placeholders['{{amount_in_words}}'] = numberToWords(documentData?.wht_amount || 0);
      placeholders['{{reference}}'] = documentData?.reference || '';
      placeholders['{{notes}}'] = documentData?.notes || '';
      placeholders['{{currency}}'] = 'LKR';
      placeholders['{{system_uuid}}'] = documentData?.id || '';
      placeholders['{{hash}}'] = documentData?.id ? documentData.id.substring(0, 8).toUpperCase() : '';
      const whtLogo = companyData?.logo_url || headerImageUrl || '';
      if (whtLogo) placeholders['{{company_logo}}'] = `<img src="${whtLogo}" style="width:100%;height:100%;object-fit:contain;" alt="Company Logo" />`;
      break;
    }

    case 'grn': {
      placeholders['{{grn_number}}'] = documentData?.grn_number || '';
      placeholders['{{grn_date}}'] = formatDate(documentData?.grn_date || documentData?.received_date);
      placeholders['{{vendor_name}}'] = documentData?.vendors?.vendor_name || '';
      placeholders['{{vendor_code}}'] = documentData?.vendors?.vendor_code || '';
      placeholders['{{vendor_address}}'] = documentData?.vendors?.address || '';
      placeholders['{{po_number}}'] = documentData?.po_number || documentData?.purchase_order_number || '';
      placeholders['{{invoice_number}}'] = documentData?.invoice_number || '';
      placeholders['{{total_amount}}'] = formatCurrency(documentData?.total_amount);
      placeholders['{{total_quantity}}'] = String(documentData?.total_quantity || '');
      placeholders['{{reference}}'] = documentData?.reference || '';
      placeholders['{{notes}}'] = documentData?.notes || '';
      placeholders['{{status}}'] = documentData?.status?.toUpperCase() || '';
      placeholders['{{line_items}}'] = generateLineItemsTable(lineItems || []);
      placeholders['{{currency}}'] = 'LKR';
      placeholders['{{system_uuid}}'] = documentData?.id || '';
      placeholders['{{hash}}'] = documentData?.id ? documentData.id.substring(0, 8).toUpperCase() : '';
      const grnLogo = companyData?.logo_url || headerImageUrl || '';
      if (grnLogo) placeholders['{{company_logo}}'] = `<img src="${grnLogo}" style="width:100%;height:100%;object-fit:contain;" alt="Company Logo" />`;
      break;
    }
    case 'petty_cash_voucher': {
      const isGrouped = Array.isArray(documentData?.lines) && documentData.lines.length > 0;
      const totalAmount = isGrouped ? documentData.lines.reduce((sum: number, line: any) => sum + line.amount, 0) : documentData?.amount;
      const combinedNotes = isGrouped ? documentData.lines.map((l: any) => l.description).filter(Boolean).join(", ") : documentData?.description || documentData?.notes || '';
      const combinedCategory = isGrouped ? documentData.lines.map((l: any) => l.expense_category).filter(Boolean).join(", ") : documentData?.expense_category || '';

      placeholders['{{voucher_number}}'] = documentData?.voucher_number || documentData?.id?.substring(0, 8)?.toUpperCase() || '';
      placeholders['{{payment_date}}'] = formatDate(documentData?.created_at || new Date().toISOString());
      placeholders['{{fund_name}}'] = documentData?.fund?.fund_name || documentData?.petty_cash_funds?.fund_name || '';
      placeholders['{{payee_name}}'] = documentData?.payee_name || '';
      placeholders['{{expense_category}}'] = combinedCategory;
      placeholders['{{amount}}'] = formatCurrency(totalAmount);
      placeholders['{{amount_in_words}}'] = numberToWords(totalAmount || 0);
      placeholders['{{notes}}'] = combinedNotes;
      placeholders['{{reference}}'] = documentData?.reference_number || documentData?.reference || '';
      placeholders['{{receipt_number}}'] = documentData?.receipt_number || '';
      placeholders['{{payment_method}}'] = documentData?.payment_method?.toUpperCase() || 'CASH';
      
      const linesTable = isGrouped ? generateLineItemsTable(documentData.lines.map((l: any) => ({
        description: l.description || l.expense_category || 'Disbursement',
        quantity: 1,
        unit_price: l.amount,
        tax_amount: 0,
        line_total: l.amount
      }))) : '';
      placeholders['{{line_items}}'] = linesTable;
      break;
    }

    case 'iou_voucher': {
      placeholders['{{iou_number}}'] = documentData?.iou_number || '';
      placeholders['{{issued_date}}'] = formatDate(documentData?.issued_date || documentData?.created_at);
      placeholders['{{due_date}}'] = formatDate(documentData?.due_date) || '—';
      placeholders['{{staff_name}}'] = documentData?.staff?.staff_name || documentData?.staff_name || '';
      placeholders['{{business_unit}}'] = documentData?.business_unit_code || '';
      placeholders['{{amount}}'] = formatCurrency(documentData?.amount);
      placeholders['{{amount_in_words}}'] = numberToWords(documentData?.amount || 0);
      placeholders['{{purpose}}'] = documentData?.purpose || documentData?.notes || '';
      break;
    }
  }
  // Automatically map ALL fields from documentData as {{field_name}} placeholders.
  // This ensures custom templates can reference any data field without explicit mapping.
  // Explicit mappings above take priority (won't be overwritten).
  if (documentData && typeof documentData === 'object') {
    Object.entries(documentData).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      // Don't overwrite explicitly mapped placeholders
      if (placeholders[placeholder] !== undefined) return;
      
      if (value === null || value === undefined) {
        placeholders[placeholder] = '';
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        // For nested objects (e.g. vendors, customers), flatten as {{parent_child}}
        Object.entries(value as Record<string, any>).forEach(([nestedKey, nestedValue]) => {
          const nestedPlaceholder = `{{${key}_${nestedKey}}}`;
          if (placeholders[nestedPlaceholder] === undefined) {
            placeholders[nestedPlaceholder] = nestedValue === null || nestedValue === undefined 
              ? '' 
              : String(nestedValue);
          }
        });
      } else if (Array.isArray(value)) {
        // Skip arrays (handled by specific generators like line_items, allocations)
      } else {
        placeholders[placeholder] = String(value);
      }
    });
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
  
  // Remove any remaining unreplaced placeholders to keep document professional
  result = result.replace(/\{\{[^}]+\}\}/g, '');
  
  return result;
};

/**
 * Sanitize HTML by removing interactive elements that shouldn't appear in document previews or PDFs.
 * Also fixes logo image sizing by stripping inline size constraints.
 */
const sanitizeDocumentHtml = (html: string): string => {
  if (!html) return html;

  // Remove buttons/links containing "Back", "Print", "Export PDF", "Download" text
  html = html.replace(/<(button|a)\b[^>]*>[\s\S]*?(Back|Print|Export\s*PDF|Download\s*PDF)[\s\S]*?<\/\1>/gi, '');

  // Remove elements with onclick handlers
  html = html.replace(/<[^>]+onclick\s*=\s*["'][^"']*["'][^>]*>[\s\S]*?<\/[^>]+>/gi, '');

  // Remove javascript: links
  html = html.replace(/<a\b[^>]*href\s*=\s*["']javascript:[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, '');

  // Remove any remaining no-print divs/buttons
  html = html.replace(/<div\b[^>]*class\s*=\s*["'][^"']*no-print[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');

  // Remove empty wrapper divs that contained only buttons
  html = html.replace(/<div\b[^>]*>\s*<\/div>/g, '');

  // FIX LOGO SIZING: Find logo images and remove inline size constraints
  // Match img tags that are logos (in logo-area, header, or with logo-related alt/src)
  html = html.replace(
    /(<img\b[^>]*)(style\s*=\s*["'])([^"']*)(["'][^>]*>)/gi,
    (match, before: string, styleStart: string, styleContent: string, after: string) => {
      // Check if this is a logo image (by src containing supabase storage, or alt containing "logo" or "Company")
      const isLogo = /supabase\.co\/storage/i.test(before + after) ||
                     /alt\s*=\s*["'][^"']*(logo|company|header)/i.test(before + after) ||
                     /class\s*=\s*["'][^"']*(logo|header)/i.test(before + after);
      
      if (isLogo) {
        // Strip size constraints and replace with generous sizing
        let newStyle = styleContent
          .replace(/max-height\s*:\s*[^;]+;?/gi, '')
          .replace(/max-width\s*:\s*[^;]+;?/gi, '')
          .replace(/height\s*:\s*\d+[^;]*;?/gi, '')
          .replace(/width\s*:\s*\d+[^;]*;?/gi, '')
          .trim();
        
        // Add generous sizing
        newStyle = `max-height: 200px; max-width: 400px; width: auto; height: auto; object-fit: contain; ${newStyle}`;
        
        return `${before}${styleStart}${newStyle}${after}`;
      }
      
      return match;
    }
  );

  return html;
};

// Generate full HTML document for printing
export const generatePrintableDocument = (
  htmlContent: string,
  cssStyles?: string,
  paperSize: string = 'A4',
  orientation: string = 'portrait'
): string => {
  // Sanitize: remove interactive buttons/links that shouldn't appear in previews or PDFs
  const sanitizedContent = sanitizeDocumentHtml(htmlContent);

  // Base styles
  const baseStyles = `
    @page {
      size: ${paperSize} ${orientation};
      margin: 15mm;
    }
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
      padding: 20px;
      background: #fff;
    }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f3f4f6; font-weight: 600; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: bold; }
    .mt-4 { margin-top: 16px; }
    .mb-4 { margin-bottom: 16px; }
    button, [role="button"], a[href="javascript:void(0)"] { display: none !important; }
  `;

  // Logo override styles — MUST come LAST so they win over everything
  const logoOverrides = `
    /* ============================================
       LOGO SIZE OVERRIDES — applied last to win
       ============================================ */
    .logo-area img,
    .header-logo img,
    .document-header img,
    .header-row img,
    img[alt*="Logo" i],
    img[alt*="Company" i],
    img[alt*="Header" i],
    img[src*="supabase"],
    img[src*="storage"],
    img[src*="logo"],
    img:first-of-type {
      max-height: 200px !important;
      min-height: 60px !important;
      max-width: 400px !important;
      width: auto !important;
      height: auto !important;
      object-fit: contain !important;
      display: block !important;
    }
    /* Don't apply logo sizing to signature images or table images */
    .sig-box img,
    .signature img,
    td img,
    img[alt*="Signature" i] {
      max-height: 60px !important;
      min-height: auto !important;
      max-width: 150px !important;
    }
  `;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Document</title>
        <style>
          ${baseStyles}
          /* Custom template styles */
          ${cssStyles || ''}
          /* Logo overrides — ALWAYS last to ensure they win */
          ${logoOverrides}
        </style>
      </head>
      <body>${sanitizedContent}</body>
    </html>
  `;
};
