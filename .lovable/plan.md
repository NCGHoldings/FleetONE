

# Update Special Hire: Multiple Sales Receipts + Invoice Only After Trip Completion

## Current Limitations Found

1. **Single Sales Receipt assumption**: Code uses `.find()` (singular) to locate sales receipts — only shows/handles ONE per trip
2. **Invoice generated on balance payment approval** — not tied to trip completion status
3. **Document generation** maps `advance → sales_receipt`, `balance/full → invoice` — so a second advance payment overwrites the first receipt document

## What Needs to Change

### Concept
- **Sales Receipts**: One per approved payment (advance, partial, or any pre-trip payment). Multiple allowed.
- **Final Invoice**: Only generated AFTER trip status = "completed". Summarizes all receipts, adjustments, and shows final balance.
- Current JE flow remains intact — no GL changes needed.

### 1. Allow Multiple Sales Receipts per Trip
**File**: `src/components/special-hire/ConfirmedTripsTable.tsx`

- Change all `.find(d => d.document_type === 'sales_receipt')` to `.filter(...)` to handle arrays
- Update `renderDocumentStatusSummary` to show count of receipts (e.g., "2 Sales Receipts")
- In the Documents section, show ALL sales receipts (not just latest)
- When generating a document for a payment, always create a NEW `sales_receipt` document (don't skip if one exists)
- Each sales receipt links to its specific `payment_id` for traceability

### 2. Document Generation — Always Create New Receipt per Payment
**File**: `src/components/special-hire/ConfirmedTripsTable.tsx`

- In the payment capture handler (`handlePaymentCapture`), remove the check that skips document generation if a sales receipt already exists
- Generate unique document numbers per receipt: `SR-{quotation_no}-{payment_index}` (e.g., SR-Q001-01, SR-Q001-02)
- Each receipt shows only THAT payment's amount (not cumulative)

### 3. Final Invoice — Only After Trip Completion
**File**: `src/components/special-hire/ConfirmedTripsTable.tsx`

- "Generate Final Invoice" button: only enabled when `trip_status === 'completed'`
- Show a tooltip "Trip must be completed first" when disabled
- The final invoice collects ALL approved payments, adjustments, and calculates the final balance
- This is already mostly working via the "Generate Final Invoice" flow — just need to enforce the trip status gate

### 4. Finance Approval — Don't Auto-Create AR Invoice on Balance Payment
**File**: `src/hooks/useFinanceApproval.ts`

- Currently, when a balance payment is approved, it auto-creates an AR Invoice (lines 158-226)
- Change: AR Invoice creation should be triggered by "Generate Final Invoice" action (after trip completion), NOT by payment approval
- Payment approval should only: update status, post GL (JE-1 for advance, JE-3 for balance), create AR Receipt if invoice exists, generate Sales Receipt document
- This means: advance payments get Sales Receipts, balance payments also get Sales Receipts (not invoices), and the Final Invoice is a separate action post-trip

### 5. Update Flow Diagram
**File**: `/mnt/documents/special-hire-ops-finance-flow-v2.mmd`

Key updates to the diagram:
- Payment Scenarios: show multiple advance/partial payments, each generating a Sales Receipt
- Remove the "balance payment → invoice" path
- Add explicit "Trip Completed → Generate Final Invoice" gate
- Show that Final Invoice summarizes ALL receipts
- Add new Scenario F: Multiple partial payments before trip

### 6. UI — Documents Column Updates
**File**: `src/components/special-hire/ConfirmedTripsTable.tsx`

- Show badges: "SR ×2" (2 sales receipts) + "Invoice" (if final invoice exists)
- Clicking expands to show all documents with individual view/download
- Re-generate option available per receipt (not just one global re-generate)

## Updated JE Flow (No Changes to GL Logic)

```text
Payment 1 (Advance)  → JE-1: DR Bank / CR Customer Advance  → Sales Receipt #1
Payment 2 (Advance)  → JE-1: DR Bank / CR Customer Advance  → Sales Receipt #2
Payment 3 (Partial)  → JE-1: DR Bank / CR Customer Advance  → Sales Receipt #3
--- Trip Completes ---
Generate Final Invoice → JE-2: DR Trade Receivable / CR Revenue (full amount)
                       → JE-4: DR Customer Advance / CR Trade Receivable (total advances)
Balance Payment (if any) → JE-3: DR Bank / CR Trade Receivable → Sales Receipt #4
```

## Safety
- Existing single-receipt trips continue to work (backward compatible)
- GL posting logic unchanged — each payment still posts its own JE
- Final Invoice still uses the cumulative settlement formula
- No database schema changes needed — `special_hire_documents` already supports multiple rows per quotation via `payment_id` linking

## Files
- **Modify**: `src/components/special-hire/ConfirmedTripsTable.tsx` — multiple receipts UI, trip-completion gate for invoice
- **Modify**: `src/hooks/useFinanceApproval.ts` — remove auto AR Invoice on balance payment, always generate sales receipt
- **Update**: `/mnt/documents/special-hire-ops-finance-flow-v2.mmd` — updated diagram with all scenarios

