

# Link Company Phone/Email to All Document Templates

## Problem
1. The Payment Voucher shows "Tel: | Email:" with **empty values** because the company records in the database don't have phone/email saved yet
2. Several document generators (Sinotruck invoice, Light Vehicle invoice, cash receipts) have **hardcoded** phone/email (`+94 11 234 5678`, `info@ncgholdings.lk`) instead of pulling from company data
3. The Edit Company form already supports phone/email — data just needs to be entered and all documents need to use it

## What needs to happen

### 1. SQL Migration — Populate company phone/email for LIVE companies
Insert the actual NCG Holdings contact details (phone, email, address) into the companies table for the LIVE parent company and sub-companies so all templates immediately show real values.

### 2. Replace hardcoded contact info in document generators

**Files with hardcoded values to fix:**

| File | Current Hardcoded Value | Fix |
|------|------------------------|-----|
| `src/lib/sinotruck-order-invoice-generator.ts` | `Tel: +94 11 234 5678 \| info@ncgholdings.lk` | Accept company data as parameter, use `data.companyPhone` / `data.companyEmail` |
| `src/lib/lightvehicle-order-invoice-generator.ts` | `Tel: +94 11 XXX XXXX \| Email: sales@ncgholdings.lk` | Same — use passed-in company data |
| `src/components/lightvehicle/LightVehicleCashReceiptPreview.tsx` | `info@ncgholdings.lk` fallback | Use company email from context |
| `src/components/sinotruck/SinotruckCashReceiptPreview.tsx` | `info@ncgholdings.lk` hardcoded | Use company email from context |
| `src/components/lightvehicle/LightVehicleQuotationPreview.tsx` | `info@ncgholdings.lk` fallback | Use company email |

### 3. Template-based documents (already working)
The AP Payment Voucher, AR Invoice, Journal Voucher, etc. already use `{{company_phone}}` and `{{company_email}}` placeholders via `document-template-utils.ts` — these will automatically show the correct values once the company records have phone/email populated in the database.

### 4. No changes needed to Edit Company form
The form already saves phone and email to the `companies` table. Users can update contact details anytime and all future documents will reflect the changes.

## Files to modify
- **SQL migration** — Update LIVE company records with real phone/email/address
- `src/lib/sinotruck-order-invoice-generator.ts` — Replace hardcoded footer
- `src/lib/lightvehicle-order-invoice-generator.ts` — Replace hardcoded header/footer
- `src/components/lightvehicle/LightVehicleCashReceiptPreview.tsx` — Use company data
- `src/components/sinotruck/SinotruckCashReceiptPreview.tsx` — Use company data
- `src/components/lightvehicle/LightVehicleQuotationPreview.tsx` — Use company data

## Result
- All documents pull phone/email from the company record — no more hardcoded values
- Editing company details in Settings immediately reflects on all future documents
- LIVE companies show real contact details right away

