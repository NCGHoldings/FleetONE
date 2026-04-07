

# Add Toggle to Disable Signature Page on Special Hire Documents

## What You Get
A new toggle in **Settings → Signatures → Special Hire Signature Automation** that lets you disable the entire signature page (Page 2) on all Special Hire invoices, receipts, and payment reminders. When disabled, documents are single-page with just the "computer-generated" note. You can re-enable it anytime.

## How It Works

### 1. Add Setting Row in Database
Add a new row to `special_hire_signature_settings` with `signature_role = 'signature_page'` and `is_enabled = true/false`. No migration needed — just an insert if missing, or reuse the existing table structure.

### 2. Update Settings UI
In `SpecialHireSignatureSettings.tsx`, add a prominent toggle at the top:
- **"Show Signature Page on Documents"** — Switch ON/OFF
- Description: "When disabled, invoices and receipts will be single-page without the signature section"
- This is separate from the per-role auto-signer toggles below it

### 3. Update Invoice Generator
In `invoice-generator.ts`:
- Add `hideSignaturePage?: boolean` to `InvoiceData` interface
- When `hideSignaturePage` is true, skip the entire Page 2 block (lines 403-460) — the signature table and page footer
- Keep the "computer-generated" note on Page 1 instead
- This applies regardless of `forCustomer` flag

### 4. Pass Setting When Generating Documents
In `ConfirmedTripsTable.tsx` (and any other place that calls `generateInvoiceHTML`), fetch the `signature_page` setting from `special_hire_signature_settings` and pass `hideSignaturePage` to the invoice data.

## Files
- **Modify**: `src/components/settings/SpecialHireSignatureSettings.tsx` — add master toggle for signature page visibility
- **Modify**: `src/lib/invoice-generator.ts` — add `hideSignaturePage` field, conditionally skip Page 2
- **Modify**: `src/components/special-hire/ConfirmedTripsTable.tsx` — fetch setting and pass to invoice data

