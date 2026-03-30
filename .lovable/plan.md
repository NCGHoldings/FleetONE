

# Special Hire: Full System Flow Audit & Structural Fixes

## Current System Flow (As-Is)

```text
QUOTATION PHASE
  Customer Request → Create Quotation → Confirm Quotation
                                              |
PAYMENT PHASE                                 v
  ┌─────────────────────────────────────────────────────────┐
  │ Confirm Payment (Operations)                            │
  │   → Choose: Advance / Balance / Full                    │
  │   → Creates payment record (status: pending_finance)    │
  │   → Fire-and-forget: Generate DRAFT document            │
  │     (sales_receipt for advance, invoice for balance/full)│
  └─────────────────────────────────────────────────────────┘
                         |
  ┌─────────────────────────────────────────────────────────┐
  │ Finance Approval                                        │
  │   → Approves payment → Background integration:          │
  │     1. Create Finance Customer                          │
  │     2. Create AR Invoice (full/balance only)            │
  │     3. Post GL Entry                                    │
  │     4. Create AR Receipt                                │
  │     5. Regenerate document as APPROVED with signatures  │
  └─────────────────────────────────────────────────────────┘
                         |
POST-TRIP (OPTIONAL)     v
  ┌─────────────────────────────────────────────────────────┐
  │ Post-Trip Adjustment (if trip exceeded quotation)       │
  │   → Record extra KM, additional expenses                │
  │   → Finalize adjustment                                 │
  │   → Generate Balance Invoice (customer-facing, no sigs) │
  │   → Email to customer → GL posting on send              │
  └─────────────────────────────────────────────────────────┘
```

## Issues Found

### Issue 1: No "Generate Final Invoice" option without Post-Trip Adjustment
Currently, the Balance Invoice (final invoice) can ONLY be created via `GenerateBalanceInvoiceModal`, which REQUIRES a finalized post-trip adjustment. If the trip completed exactly as quoted (no extra KM, no additional expenses), there is no way to generate a final invoice for the customer.

**Fix**: Add a "Generate Final Invoice" action that works without post-trip adjustment. When no adjustment exists, create the final invoice using original quotation amounts.

### Issue 2: Final Invoice missing signatures
The `GenerateBalanceInvoiceModal` explicitly says "Customer copy - No signatures required" and never includes signatures. But the user wants final invoices to have the same signature flow as sales receipts (Prepared By, Checked By, Approved By).

**Fix**: Add signature support to the final invoice flow, same as the sales receipt.

### Issue 3: `busType: 'Standard Bus'` still hardcoded in 2 places
- `ConfirmedTripsTable.tsx` line 404 (draft document on payment confirm)
- `ConfirmedTripsTable.tsx` line 1501 (GenerateBalanceInvoiceModal props)

**Fix**: Use the `resolveBusType` helper from `special-hire-invoice-helpers.ts`.

### Issue 4: Document flow is confusing for users
The dropdown has too many overlapping options: "View Invoice", "View Documents", "View Balance Invoice", "Re-generate Sales Receipt", "Re-generate Final Invoice". Users don't know which to use when.

**Fix**: Consolidate the document actions into a clearer structure.

## Changes

### File 1: `src/components/special-hire/ConfirmedTripsTable.tsx`

1. **Fix busType on draft document creation (line 404)**: Replace `'Standard Bus'` with `resolveBusType(tripForDoc)`.

2. **Fix busType on GenerateBalanceInvoiceModal props (line 1501)**: Replace `'Standard Bus'` with resolved bus type.

3. **Add "Generate Final Invoice" menu item**: For trips with approved payments but NO post-trip adjustment, add a new dropdown item that opens `GenerateBalanceInvoiceModal` with zero adjustment data. This allows creating a final invoice for trips that completed exactly as quoted.

4. **Clean up dropdown actions**: Reorganize into logical groups:
   - Payment section: Confirm Payment
   - Operations: Update Status, Advance Details, Post-Trip Adjustment, Vehicle Assignment
   - Documents: View Documents, Generate Final Invoice (when no adjustment & no final invoice exists)
   - Finance: Approve Payment, Re-generate Sales Receipt/Final Invoice, Retry AR

### File 2: `src/components/special-hire/GenerateBalanceInvoiceModal.tsx`

1. **Make adjustment data optional**: Currently the modal requires adjustment data. Change so it works with zero/empty adjustments (trip completed as quoted).

2. **Add signature support**: Include signature fields (preparedBy, checkedBy, approvedBy) in `generateInvoiceData()`. Fetch existing document approvals from `document_approvals` table and embed in the generated PDF, same as sales receipt flow.

3. **Fix the "Customer copy - no signatures" messaging**: Change to support both internal (with signatures) and customer-facing (without signatures) modes, controlled by a toggle or the document status.

### File 3: `src/hooks/useFinanceApproval.ts`

1. **Fix busType fallback on line 369**: Already partially fixed but still falls back to `'Standard Bus'`. Add `bus_types` join to the quotation query (line 70) so `bus_types.name` is available.

## Correct Flow Diagram (After Fix)

```text
SPECIAL HIRE - COMPLETE DOCUMENT FLOW

1. QUOTATION
   └→ Create → Confirm → Quotation PDF generated

2. PAYMENT CONFIRMATION (Operations)
   ├→ Advance Payment
   │   └→ Draft Sales Receipt created (with bus type + mileage from quotation)
   ├→ Full Payment
   │   └→ Draft Invoice created
   └→ Balance Payment
       └→ Draft Invoice created

3. FINANCE APPROVAL
   └→ Approve Payment
       ├→ GL: DR Bank / CR Customer Advance (advance/full)
       │   OR DR Bank / CR Trade Receivable (balance)
       ├→ AR Invoice created (full/balance only)
       ├→ AR Receipt created
       └→ Document upgraded: DRAFT → APPROVED (with signatures)

4. POST-TRIP ADJUSTMENT (OPTIONAL - only if trip exceeded quotation)
   ├→ Record extra KM + additional expenses
   ├→ Finalize adjustment
   └→ Generate Final Invoice (with adjustment details)

5. FINAL INVOICE (NEW - works with OR without adjustment)
   ├→ If adjustment exists: Shows original + extras + balance
   ├→ If no adjustment: Shows original quotation amounts
   ├→ Includes signatures (Prepared/Checked/Approved)
   ├→ Download PDF
   ├→ Email to Customer → Triggers GL posting
   └→ GL: DR Trade Receivable / CR SPH Revenue

6. DOCUMENT MANAGEMENT
   ├→ View Documents: All docs for quotation
   ├→ Regenerate: Re-create any existing document
   └→ Each document: View / Approve / Regenerate
```

## Summary
- Allow final invoice generation WITHOUT requiring post-trip adjustment
- Add signature support to final invoices (matching sales receipts)
- Fix 2 remaining hardcoded `'Standard Bus'` values
- Reorganize dropdown menu for better usability
- No changes to GL/AR posting logic (already correct from previous fixes)

