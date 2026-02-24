import { VehicleSalesTemplate } from "@/hooks/useVehicleSalesTemplates";

// Default header URLs for each vehicle sales module
export const DEFAULT_VEHICLE_HEADERS = {
  yutong: {
    invoice: '/lovable-uploads/yutong-invoice-header.png',
    tax_invoice: '/lovable-uploads/yutong-tax-invoice-header.png',
    receipt: '/lovable-uploads/yutong-cash-receipt-header.png',
  },
  sinotruck: {
    invoice: null, // Uses CSS gradient header
    receipt: null, // Uses CSS gradient header
  },
  light_vehicle: {
    invoice: null, // Uses CSS gradient header
    receipt: null, // Uses CSS gradient header
  },
};

// Get header URL based on template or fallback to defaults
export function getVehicleSalesHeaderUrl(
  module: 'yutong' | 'sinotruck' | 'light_vehicle',
  documentType: 'invoice' | 'tax_invoice' | 'receipt',
  template?: VehicleSalesTemplate | null
): string | null {
  // If template has a custom header image, use it
  if (template?.header_image_url && template?.header_mode === 'header_image') {
    return template.header_image_url;
  }
  
  // Fall back to module defaults
  const moduleDefaults = DEFAULT_VEHICLE_HEADERS[module];
  return moduleDefaults[documentType] || null;
}

// Generate header HTML based on template configuration
export function generateVehicleSalesHeaderHTML(
  headerImageUrl: string | null,
  headerMode: 'header_image' | 'logo_only' | 'html_only' | 'logo_and_html' | null,
  companyDetails?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  }
): string {
  const mode = headerMode || 'header_image';
  
  switch (mode) {
    case 'header_image':
      if (headerImageUrl) {
        return `
          <div class="header-section">
            <img src="${headerImageUrl}" alt="Company Header" class="header-image" style="width:100%;display:block;" />
          </div>
        `;
      }
      return '';
      
    case 'logo_only':
      if (headerImageUrl) {
        return `
          <div class="header-section" style="text-align:center;padding:20px;">
            <img src="${headerImageUrl}" alt="Company Logo" style="max-width:200px;height:auto;" />
          </div>
        `;
      }
      return '';
      
    case 'html_only':
      if (companyDetails) {
        return `
          <div class="header-section" style="text-align:center;padding:20px;background:#0b2f66;color:white;">
            <h1 style="margin:0;font-size:28px;">${companyDetails.name}</h1>
            ${companyDetails.address ? `<p style="margin:5px 0;font-size:14px;">${companyDetails.address}</p>` : ''}
            ${companyDetails.phone ? `<p style="margin:5px 0;font-size:14px;">Tel: ${companyDetails.phone}</p>` : ''}
          </div>
        `;
      }
      return '';
      
    case 'logo_and_html':
      return `
        <div class="header-section" style="display:flex;align-items:center;padding:20px;border-bottom:2px solid #0b2f66;">
          ${headerImageUrl ? `<img src="${headerImageUrl}" alt="Company Logo" style="max-width:150px;height:auto;margin-right:20px;" />` : ''}
          <div>
            ${companyDetails ? `
              <h1 style="margin:0;font-size:24px;color:#0b2f66;">${companyDetails.name}</h1>
              ${companyDetails.address ? `<p style="margin:5px 0;font-size:13px;color:#666;">${companyDetails.address}</p>` : ''}
              ${companyDetails.phone ? `<p style="margin:5px 0;font-size:13px;color:#666;">Tel: ${companyDetails.phone}</p>` : ''}
            ` : ''}
          </div>
        </div>
      `;
      
    default:
      return '';
  }
}

// Map Yutong invoice data to template placeholders
export function mapYutongInvoiceToPlaceholders(invoiceData: any): Record<string, string> {
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-LK', { minimumFractionDigits: 2 }).format(amount || 0);
    
  return {
    '{{invoice_no}}': invoiceData.invoice_no || '',
    '{{quotation_no}}': invoiceData.quotation_no || '',
    '{{invoice_date}}': invoiceData.invoice_date || '',
    '{{customer_name}}': invoiceData.customer_name || '',
    '{{company_name}}': invoiceData.company_name || '',
    '{{address}}': invoiceData.address || '',
    '{{contact}}': invoiceData.contact || '',
    '{{attn}}': invoiceData.attn || '',
    '{{make}}': invoiceData.make || '',
    '{{bus_model}}': invoiceData.bus_model || '',
    '{{seating_capacity}}': invoiceData.seating_capacity || '',
    '{{year_of_manufacture}}': invoiceData.year_of_manufacture?.toString() || '',
    '{{country_of_origin}}': invoiceData.country_of_origin || '',
    '{{vehicle_condition}}': invoiceData.vehicle_condition || '',
    '{{fuel_type}}': invoiceData.fuel_type || '',
    '{{engine_capacity}}': invoiceData.engine_capacity?.toString() || '',
    '{{color_scheme}}': invoiceData.color_scheme || '',
    '{{engine_number}}': invoiceData.engine_number || '',
    '{{chassis_number}}': invoiceData.chassis_number || '',
    '{{unit_price}}': formatCurrency(invoiceData.unit_price),
    '{{quantity}}': invoiceData.quantity?.toString() || '1',
    '{{subtotal}}': formatCurrency(invoiceData.subtotal),
    '{{total}}': formatCurrency(invoiceData.total),
  };
}

// Replace placeholders in HTML content
export function replacePlaceholders(htmlContent: string, placeholders: Record<string, string>): string {
  let result = htmlContent;
  for (const [placeholder, value] of Object.entries(placeholders)) {
    result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
  }
  return result;
}
