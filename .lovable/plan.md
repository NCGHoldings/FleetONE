
# Document Template System - Complete Fix Plan

## Executive Summary

The document template system has several issues causing the preview to display incorrectly:
1. **Company data is empty** - All companies have NULL values for address, phone, email
2. **Only 1 template exists** - System has 12 document types × 7 companies = 84 potential templates, but only 1 exists
3. **Template structure needs improvement** - Header, body, and footer separation not enforced
4. **No fallback templates** - When no template exists, preview shows basic error message

---

## Issues Analysis

### Issue 1: Missing Company Data
The screenshot shows "Tel: | Email:" with empty values because the companies table has no contact data:

| Company | Address | Phone | Email |
|---------|---------|-------|-------|
| NCG Holding | NULL | NULL | NULL |
| School Bus Operations | NULL | NULL | NULL |
| Yutong Sales | NULL | NULL | NULL |
| Special Hire | NULL | NULL | NULL |
| Light Vehicle Sales | NULL | NULL | NULL |
| Sinotruck Sales | NULL | NULL | NULL |
| NCG Express | NULL | NULL | NULL |

**Fix**: User needs to populate company details in Settings → Company Management

### Issue 2: Missing Templates
Current state: Only 1 template exists (AR Invoice for School Bus Operations named "ar")

**Required Templates** (12 document types × 7 companies):
```
AR Module:
- ar_invoice (AR Invoice / Sales Invoice)
- ar_receipt (AR Receipt / Sales Receipt)
- ar_credit_note (AR Credit Note)
- advance_receipt (Advance Payment Receipt)

AP Module:
- ap_invoice (AP Invoice / Purchase Invoice)
- ap_payment_voucher (AP Payment Voucher)
- ap_debit_note (AP Debit Note)
- advance_payment (Advance Payment Voucher)

Other Modules:
- journal_voucher (General Journal Voucher)
- cheque_voucher (Cheque Payment Voucher)
- wht_certificate (WHT Certificate)
- grn (Goods Receipt Note)
```

### Issue 3: Template Structure
Current template embeds all HTML including header, body, footer in one field. Need structured sections for consistent rendering.

---

## Solution Architecture

### Part 1: Template Seeder System

Create a new utility to auto-generate professional templates for all document types.

#### New File: `src/lib/document-template-seeder.ts`
```typescript
// Professional template generators for each document type
export const defaultTemplates = {
  ar_invoice: generateARInvoiceTemplate(),
  ar_receipt: generateARReceiptTemplate(),
  ar_credit_note: generateCreditNoteTemplate(),
  ap_invoice: generateAPInvoiceTemplate(),
  ap_payment_voucher: generatePaymentVoucherTemplate(),
  ap_debit_note: generateDebitNoteTemplate(),
  advance_receipt: generateAdvanceReceiptTemplate(),
  advance_payment: generateAdvancePaymentTemplate(),
  journal_voucher: generateJournalVoucherTemplate(),
  cheque_voucher: generateChequeVoucherTemplate(),
  wht_certificate: generateWHTCertificateTemplate(),
  grn: generateGRNTemplate(),
};
```

### Part 2: Template HTML Structure

Each template will follow this structure:
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    /* Page setup for A4 printing */
    @page { size: A4 portrait; margin: 15mm; }
    @media print { body { -webkit-print-color-adjust: exact; } }
    
    /* Header section */
    .document-header { /* styling */ }
    
    /* Body section */
    .document-body { /* styling */ }
    
    /* Footer section */
    .document-footer { /* styling */ }
  </style>
</head>
<body>
  <!-- HEADER SECTION -->
  <div class="document-header">
    {{company_logo}}
    <div class="company-info">
      <h1>{{company_name}}</h1>
      <p>{{company_address}}</p>
      <p>Tel: {{company_phone}} | Email: {{company_email}}</p>
    </div>
  </div>
  
  <!-- BODY SECTION -->
  <div class="document-body">
    <h2 class="document-title">INVOICE</h2>
    <!-- Document-specific content -->
  </div>
  
  <!-- FOOTER SECTION -->
  <div class="document-footer">
    <div class="signature-area">...</div>
    <div class="footer-notes">{{notes}}</div>
  </div>
</body>
</html>
```

### Part 3: New Files to Create

| File | Purpose |
|------|---------|
| `src/lib/document-template-seeder.ts` | Template generation utilities |
| `src/components/accounting/settings/TemplateInitializerButton.tsx` | Button to seed all templates |

### Part 4: Files to Update

| File | Changes |
|------|---------|
| `src/components/accounting/settings/DocumentTemplateManager.tsx` | Add "Initialize All Templates" button |
| `src/components/accounting/shared/FinanceDocumentPreviewModal.tsx` | Improved fallback rendering |
| `src/lib/document-template-utils.ts` | Enhanced placeholder mapping |

---

## Implementation Details

### Step 1: Create Template Seeder

Generate professional HTML templates for all 12 document types with:
- Consistent header with company branding
- Document-specific body sections
- Signature areas and footer
- Print-optimized CSS

### Step 2: Update DocumentTemplateManager

Add "Initialize Templates" button that:
1. Checks which templates are missing for each company
2. Creates default templates from seeder
3. Reports success/failure

### Step 3: Improve Preview Modal

When no template exists:
- Show professional fallback with clear guidance
- Option to auto-create template
- Display document data in basic format

### Step 4: Template HTML Examples

**AR Invoice Template:**
```html
<!-- Professional invoice with header image support -->
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
  <h2 class="title">TAX INVOICE</h2>
  
  <div class="info-grid">
    <div class="info-row">
      <span class="label">Invoice No:</span>
      <span class="value">{{invoice_number}}</span>
    </div>
    <div class="info-row">
      <span class="label">Date:</span>
      <span class="value">{{invoice_date}}</span>
    </div>
    <!-- More fields -->
  </div>
  
  <div class="customer-section">
    <h3>Bill To:</h3>
    <p><strong>{{customer_name}}</strong></p>
    <p>{{customer_address}}</p>
  </div>
  
  {{line_items}}
  
  <div class="totals-section">
    <div class="total-row"><span>Subtotal:</span><span>{{subtotal}}</span></div>
    <div class="total-row"><span>Tax:</span><span>{{tax_amount}}</span></div>
    <div class="total-row grand"><span>Total:</span><span>{{total_amount}}</span></div>
    <div class="amount-words">{{amount_in_words}}</div>
  </div>
</div>

<div class="document-footer">
  <div class="signature-grid">
    <div class="sig-box"><div class="sig-line">Prepared By</div></div>
    <div class="sig-box"><div class="sig-line">Authorized Signature</div></div>
  </div>
  <div class="footer-notes">{{notes}}</div>
</div>
```

**AR Receipt Template:**
```html
<div class="document-header">
  {{company_logo}}
  <h1>{{company_name}}</h1>
  <p>{{company_address}}</p>
</div>

<div class="document-body">
  <h2>RECEIPT</h2>
  
  <div class="receipt-details">
    <div><strong>Receipt No:</strong> {{receipt_number}}</div>
    <div><strong>Date:</strong> {{receipt_date}}</div>
    <div><strong>Received From:</strong> {{customer_name}}</div>
  </div>
  
  <div class="amount-box">
    <div class="amount">{{amount}}</div>
    <div class="words">{{amount_in_words}}</div>
  </div>
  
  <div class="payment-info">
    <div><strong>Payment Method:</strong> {{payment_method}}</div>
    <div><strong>Reference:</strong> {{reference}}</div>
  </div>
  
  {{allocations}}
</div>

<div class="document-footer">
  <div class="signature-area">
    <div class="sig-line">Received By</div>
  </div>
</div>
```

---

## User Actions Required

### Before Implementation:
1. **Populate Company Data** - Go to Settings → Company Management → Edit each company to add:
   - Address
   - Phone number
   - Email
   - Tax Registration Number
   - Logo (optional)

### After Implementation:
1. **Initialize Templates** - Click "Initialize All Templates" button in Document Templates settings
2. **Customize Templates** - Edit any template to match specific branding needs
3. **Set Default Templates** - Mark one template per type as "Default"

---

## File Changes Summary

### New Files
```
src/lib/document-template-seeder.ts
src/components/accounting/settings/TemplateInitializerButton.tsx
```

### Modified Files
```
src/components/accounting/settings/DocumentTemplateManager.tsx
src/components/accounting/shared/FinanceDocumentPreviewModal.tsx
src/lib/document-template-utils.ts
```

---

## Expected Results

After implementation:
1. All 12 document types will have professional default templates
2. Templates will display company header correctly when company data is filled
3. Header images (logos) will render properly in preview and print
4. Document body with line items, amounts will be properly formatted
5. Footer with signatures will display correctly
6. Print/PDF output will match A4 page dimensions

---

## Template Type Matrix

| Document Type | Module | Key Placeholders |
|---------------|--------|------------------|
| AR Invoice | AR | invoice_number, customer_name, line_items, total_amount |
| AR Receipt | AR | receipt_number, customer_name, amount, payment_method |
| AR Credit Note | AR | credit_note_number, original_invoice, amount, reason |
| AP Invoice | AP | invoice_number, vendor_name, line_items, total_amount |
| AP Payment Voucher | AP | voucher_number, vendor_name, amount, cheque_number |
| AP Debit Note | AP | debit_note_number, vendor_name, amount, reason |
| Advance Receipt | AR | receipt_number, customer_name, amount, purpose |
| Advance Payment | AP | voucher_number, vendor_name, amount, purpose |
| Journal Voucher | GL | voucher_number, journal_lines, total_debit, total_credit |
| Cheque Voucher | Banking | voucher_number, payee_name, amount, cheque_number |
| WHT Certificate | Tax | certificate_number, vendor_name, wht_amount |
| GRN | Inventory | grn_number, supplier_name, items |
