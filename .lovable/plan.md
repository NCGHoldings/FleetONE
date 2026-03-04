

# Replace Tax Invoice Format with Sri Lankan Government Standard

## Context
The Sri Lankan government mandates a specific Tax Invoice format (shown in the uploaded screenshot) that all companies must follow. Currently, each module (Yutong, Sinotruck, Light Vehicle) has its own custom tax invoice layout that does not match the government format.

## Sri Lankan Tax Invoice Format (from screenshot)
The government format requires these specific fields and layout:
- **Header**: "Tax Invoice" title (centered)
- **Top Row**: Date of Invoice | Tax Invoice No.
- **Supplier Block**: Supplier's TIN, Name, Address, Telephone No.
- **Purchaser Block**: Purchaser's TIN, Name, Address, Telephone No.
- **Middle Row**: Date of Delivery | Place of Supply
- **Additional Information** field
- **Line Items Table**: Reference | Description of Goods or Services | Quantity | Unit Price | Amount Excluding VAT (Rs.)
- **Totals**: Total Value of Supply | VAT Amount (Total Value of Supply @ 18%) | Total Amount including VAT
- **Bottom**: Total Amount in words | Mode of Payment
- **Footer Reference**: EOG format number

## Changes Required

### 1. Create Shared Tax Invoice HTML Generator
**New file: `src/lib/sri-lanka-tax-invoice-generator.ts`**
- Create a `generateSriLankaTaxInvoiceHTML(data)` function that produces the exact government-mandated layout
- Accept a unified data interface covering all modules:
  - Supplier TIN, name, address, phone (from company/system settings)
  - Purchaser TIN, name, address, phone (from customer)
  - Invoice date, tax invoice number, date of delivery, place of supply
  - Line items array: reference, description, quantity, unit price, amount excl. VAT
  - VAT rate (default 18%), totals calculation
  - Amount in words, mode of payment
  - Additional information field
- Clean, minimal black-and-white styling matching the government form (no colored themes)
- Signatures section (Prepared By / Approved By / Customer) appended below the form

### 2. Update Yutong Tax Invoice Generation
**File: `src/lib/yutong-order-invoice-generator.ts`**
- When `isTaxInvoice === true`, call the new shared `generateSriLankaTaxInvoiceHTML()` instead of the current custom layout
- Map Yutong vehicle data into the standardized line items format (description = vehicle make/model/details)
- Pass company TIN from settings, customer VAT number from invoice data

### 3. Update Sinotruck to Support Tax Invoice
**File: `src/lib/sinotruck-order-invoice-generator.ts`**
- Add `tax_invoice` to `invoice_category` type
- Add tax invoice fields (`is_tax_invoice`, `customer_vat_number`, `tax_rate`, etc.)
- When tax invoice, use the shared Sri Lankan format generator

**File: `src/components/sinotruck/SinotruckInvoiceTypeModal.tsx`**
- Add "Tax Invoice" radio option (currently only has direct and proforma)
- Add customer VAT number input field when tax invoice selected

### 4. Update Light Vehicle to Support Tax Invoice
**File: `src/lib/lightvehicle-order-invoice-generator.ts`**
- When `invoiceCategory === 'tax_invoice'`, use the shared Sri Lankan format
- Map light vehicle data into standardized line items

**File: `src/components/lightvehicle/LightVehicleInvoiceTypeModal.tsx`**
- Add "Tax Invoice" radio option
- Add customer VAT number and tax fields

### 5. Update Invoice Type Modals (All Modules)
Add new fields to the tax invoice form across all three modals:
- **Supplier TIN** (pre-filled from company settings, editable)
- **Purchaser TIN** (required for tax invoices)
- **Place of Supply** (text input)
- **Date of Delivery** (date picker)
- **Mode of Payment** (dropdown: Cash/Cheque/Bank Transfer/Credit)
- **Additional Information** (textarea, optional)

### 6. Update PDF Generation
- Ensure `generateYutongOrderInvoicePDF` uses the new HTML when tax invoice
- Add similar PDF support for Sinotruck and Light Vehicle tax invoices

## Result
- All three vehicle sales modules produce the exact Sri Lankan government-mandated Tax Invoice format
- One shared generator ensures consistency and compliance across all companies
- Regular invoices (direct/proforma) remain unchanged with their existing branded layouts
- Tax invoice form collects all required government fields (TIN, place of supply, delivery date, etc.)

