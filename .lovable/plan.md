

# Fix Special Hire Trip Page: Document Generation, Balance Invoice & Full Flow

## Problems Found

From code analysis and DB data:

### Issue 1: First-time document generation fails silently
When a payment is confirmed (line 418), `generateAndStoreDraftDocument` runs fire-and-forget in background. If it fails (e.g., PDF generation error, storage upload error), user sees "Payment confirmed!" but no document appears. The only indication is a console error.

### Issue 2: Balance invoice shows wrong balance when fully paid
The `calculateFinalBalance()` in `GenerateBalanceInvoiceModal.tsx` (line 138-142) calculates:
```
balance_due + adjustments
```
But `balance_due` from DB is the **original** balance (total - advance), not accounting for subsequent balance payments. DB example: `sudaraka perera` — total_paid=134,980 vs customer_total=134,976 → balance_due=-4, yet if accessed before trigger updates, it shows stale positive balance. The invoice generator also uses `paidAmount = advanceAmount` (line 166) instead of actual `total_paid`.

### Issue 3: Sales receipt and final invoice not showing after finance approval
The `performBackgroundIntegration` (line 101 in useFinanceApproval.ts) regenerates draft→approved documents but only for existing `document_storage` rows with `payment_id` match. If the initial draft generation failed (Issue 1), there's nothing to regenerate, so no document appears.

### Issue 4: Invoice balance calculation uses wrong `totalAmount`
In `generateInvoiceData()` (line 163): `totalAmount: quotationData.original_quotation_amount` — but this field comes from `selectedAdjustment.original_quotation_amount` which may be 0 or stale. Meanwhile, the actual total should be `gross_revenue + fuel + commission + additional - discount`.

### Issue 5: Missing "Generate Document" action for trips without documents
If a trip has approved payments but no documents (due to Issue 1), there's no easy way to create them except "Re-generate Sales Receipt/Final Invoice" in dropdown — but these call `generateApprovedInvoice` which just downloads a PDF, doesn't store it.

### Issue 6: Pre-existing build errors
Multiple TS errors in lightvehicle, fleet, and accounting components (unrelated to special hire). Need to fix to ensure deployment.

## Plan

### File 1: `src/hooks/useDocumentManagement.ts`
**Add `generateDocumentForPayment` method** — a reliable document creation method that:
- Takes a `paymentId` and creates a proper sales_receipt (advance) or invoice (balance/full) document
- Checks for existing document first (no duplicates)
- Uses proper error handling (not fire-and-forget)
- Fetches fresh payment + quotation data from DB
- Computes `totalAmount` correctly using the standard formula
- Uses actual `total_paid` from approved payments for balance calculation

### File 2: `src/components/special-hire/ConfirmedTripsTable.tsx`
- **Fix fire-and-forget document generation** (lines 391-432): Make `generateAndStoreDraftDocument` awaited with proper error recovery. If it fails, show actionable error toast instead of success.
- **Add "Generate Document" dropdown item** for approved payments that have no document in `document_storage`
- **Fix balance calculation in `calculateTotalAmount`**: Include post-trip adjustment total from `special_hire_trip_adjustments` data
- **Fix `viewInvoice` balance data** (line 852): Use actual `total_paid` from DB, not just `advance_paid`

### File 3: `src/components/special-hire/GenerateBalanceInvoiceModal.tsx`
- **Fix `calculateFinalBalance`** (line 138): Use actual total amount minus total paid, not stale `balance_due`
- **Fix `generateInvoiceData`** (line 163): Calculate `totalAmount` properly: `gross_revenue + fuel + commission + additional_charges - discount`
- **Fix `paidAmount`** (line 166): Fetch and use actual `total_paid` from all approved payments instead of just `advance_paid`
- **Handle fully-paid scenario**: If total_paid >= totalAmount, show "Settled" instead of a positive balance

### File 4: `src/hooks/useFinanceApproval.ts`
- **Fix `performBackgroundIntegration`** (line 341-421): If no draft document exists for the payment, create one instead of silently skipping
- **Fix `generateApprovedInvoice`** (line 487-553): Store the generated document in `document_storage` instead of just downloading it

### File 5: `src/lib/invoice-generator.ts`
- **Fix balance calculation** (line 219): Use `balanceAmount` field when explicitly provided (for balance invoices), falling back to computed `priceAfterDiscount - totalPaid`
- Ensure negative balances display as "Overpaid" or "0.00" instead of negative numbers

### File 6: Fix pre-existing build errors
- `src/components/accounting/APPaymentForm.tsx` — Fix `SearchableAccountSelector` prop name
- `src/components/accounting/ARReceiptForm.tsx` — Same fix
- `src/components/fleet/FleetMasterSpreadsheetCore.tsx` — Fix property names
- Lightvehicle files — Add type assertions for Supabase query results

### Deliverable: Full flow diagram
Generate Mermaid diagram at `/mnt/documents/special-hire-document-flow.mmd` showing:

```text
SPECIAL HIRE DOCUMENT FLOW (A-to-Z)

1. Quotation Confirmed
   |
2. Payment Confirmed (Advance/Balance/Full)
   |→ Create draft document (sales_receipt for advance, invoice for balance/full)
   |→ Auto-add Prepared By signature
   |→ Store in document_storage
   |
3. Finance Approval
   |→ Update payment status → approved
   |→ Background: Create/Get Customer → Create AR Invoice → Post GL → Create AR Receipt
   |→ Auto-add Checked By signature
   |→ Regenerate document as APPROVED (remove DRAFT watermark)
   |   ↳ If no document exists: CREATE one first, then approve
   |
4. Balance Invoice (Post-Trip)
   |→ Finalize post-trip adjustments
   |→ Generate balance invoice with adjustments
   |→ Balance = (grossRevenue + fuel + commission + additional - discount + adjustments) - totalPaid
   |→ Email to customer (forCustomer=true, no signatures)
   |→ Post GL: DR Receivable / CR Revenue
   |
5. Document Actions
   |→ View Documents: Shows all docs for quotation
   |→ Regenerate: Re-creates PDF with latest data/signatures
   |→ Re-generate Sales Receipt / Final Invoice: Creates + stores if missing
```

## Summary
- Fix 6 files to make document generation reliable, balance calculations correct, and missing documents recoverable
- Fix pre-existing build errors for deployment
- Generate comprehensive flow diagram

