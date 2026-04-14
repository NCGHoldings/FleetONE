import { supabase } from "@/integrations/supabase/client";
import { convertNumberToWords } from './number-to-words';
import { generateSriLankaTaxInvoiceHTML, SriLankaTaxInvoiceData } from './sri-lanka-tax-invoice-generator';

/**
 * Fetches the tax_invoice template from the document_templates DB table.
 * Returns the html_content string or null if not found.
 */
export async function fetchTaxInvoiceTemplate(companyId?: string): Promise<string | null> {
  try {
    let query = supabase
      .from("document_templates")
      .select(`
        html_content,
        document_template_types!inner(type_code)
      `)
      .eq("document_template_types.type_code", "tax_invoice")
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .limit(1);

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) return null;
    return data[0].html_content || null;
  } catch {
    return null;
  }
}

/**
 * Replaces all {{placeholder}} tokens in the template HTML with actual data values.
 */
export function replaceTaxInvoicePlaceholders(
  templateHtml: string,
  data: SriLankaTaxInvoiceData
): string {
  const vatRate = data.vatRate || 18;
  const totalValueOfSupply = data.lineItems.reduce((sum, item) => sum + item.amountExclVat, 0);
  const vatAmount = totalValueOfSupply * (vatRate / 100);
  const totalIncludingVat = totalValueOfSupply + vatAmount;
  const totalInWords = convertNumberToWords(totalIncludingVat);

  const formatCurrency = (amount: number) =>
    amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch { return dateStr; }
  };

  // Build line items HTML rows
  const lineItemsHtml = data.lineItems.map((item, index) => `
    <tr>
      <td style="text-align:center; padding:8px 6px; border:1px solid #000;">${item.reference || (index + 1)}</td>
      <td style="padding:8px 6px; border:1px solid #000;">${item.description}</td>
      <td style="text-align:center; padding:8px 6px; border:1px solid #000;">${item.quantity}</td>
      <td style="text-align:right; padding:8px 6px; border:1px solid #000;">${formatCurrency(item.unitPrice)}</td>
      <td style="text-align:right; padding:8px 6px; border:1px solid #000;">${formatCurrency(item.amountExclVat)}</td>
    </tr>
  `).join('');

  // Add empty rows to fill at least 5
  const emptyRows = Math.max(0, 5 - data.lineItems.length);
  const emptyRowsHtml = Array(emptyRows).fill('').map(() => `
    <tr>
      <td style="padding:8px 6px; border:1px solid #000;">&nbsp;</td>
      <td style="padding:8px 6px; border:1px solid #000;">&nbsp;</td>
      <td style="padding:8px 6px; border:1px solid #000;">&nbsp;</td>
      <td style="padding:8px 6px; border:1px solid #000;">&nbsp;</td>
      <td style="padding:8px 6px; border:1px solid #000;">&nbsp;</td>
    </tr>
  `).join('');

  const replacements: Record<string, string> = {
    '{{invoice_date}}': formatDate(data.invoiceDate),
    '{{tax_invoice_no}}': data.taxInvoiceNo || '',
    '{{supplier_tin}}': data.supplierTin || '',
    '{{supplier_name}}': data.supplierName || '',
    '{{supplier_address}}': data.supplierAddress || '',
    '{{supplier_phone}}': data.supplierPhone || '',
    '{{purchaser_tin}}': data.purchaserTin || '',
    '{{purchaser_name}}': data.purchaserName || '',
    '{{purchaser_address}}': data.purchaserAddress || '',
    '{{purchaser_phone}}': data.purchaserPhone || '',
    '{{date_of_delivery}}': formatDate(data.dateOfDelivery),
    '{{place_of_supply}}': data.placeOfSupply || '',
    '{{additional_information}}': data.additionalInformation || '',
    '{{line_items}}': lineItemsHtml + emptyRowsHtml,
    '{{total_value_of_supply}}': formatCurrency(totalValueOfSupply),
    '{{vat_rate}}': vatRate.toString(),
    '{{vat_amount}}': formatCurrency(vatAmount),
    '{{total_including_vat}}': formatCurrency(totalIncludingVat),
    '{{total_in_words}}': totalInWords,
    '{{mode_of_payment}}': data.modeOfPayment || '',
  };

  let result = templateHtml;
  for (const [placeholder, value] of Object.entries(replacements)) {
    result = result.split(placeholder).join(value);
  }

  // Clean up any remaining unreplaced placeholders
  result = result.replace(/\{\{[^}]+\}\}/g, '');

  return result;
}

/**
 * Resolves the tax invoice HTML: tries DB template first, falls back to hardcoded generator.
 */
export async function resolveTaxInvoiceHTML(
  data: SriLankaTaxInvoiceData,
  companyId?: string
): Promise<string> {
  const dbTemplate = await fetchTaxInvoiceTemplate(companyId);

  if (dbTemplate) {
    return replaceTaxInvoicePlaceholders(dbTemplate, data);
  }

  // Fallback to the hardcoded Sri Lankan format
  return generateSriLankaTaxInvoiceHTML(data);
}
