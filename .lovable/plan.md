
# Fix Special Hire Finance Approval Capture First

## What I found

There are 2 separate bugs causing what you see:

1. Payment History / approved total shows `0`
- `src/components/special-hire/PaymentTimelineFresh.tsx` is querying `reference_number`
- Actual DB column is `reference_no`
- Because of that query error, the component fails, shows `0 payments`, and sends `0` back to the Final Invoice modal

2. Sales Receipt stays looking like draft / not moving correctly after finance approval
- Finance approval updates `document_status` to `approved`
- But several places still rely on incomplete/stale document data and `invoice_status` remains `draft`
- DB confirms approved records exist, but UI flow is not consistently reading the right status source

## Implementation plan

### 1. Fix the broken payment timeline query
Update `src/components/special-hire/PaymentTimelineFresh.tsx`:
- Replace `reference_number` with `reference_no`
- Align the local type too
- Keep approved total based only on `status === 'approved'`

This should immediately fix:
- approved amount showing `0`
- payment history modal showing no payments
- fresh total passed into Final Invoice modal

### 2. Make document approval status use `document_status` as the source of truth
Audit and fix Special Hire document status checks so approved Sales Receipts are treated as approved when:
- `document_status === 'approved'`
- not `invoice_status`

Focus files:
- `src/components/special-hire/ConfirmedTripsTable.tsx`
- `src/components/special-hire/DocumentReadyIndicator.tsx`
- `src/components/special-hire/SignatureWorkflowIndicator.tsx`
- any document list/view logic that still behaves as if draft remains active

### 3. Refresh document state immediately after finance approval
In `src/components/special-hire/ConfirmedTripsTable.tsx`:
- after `approvePayment(...)` succeeds, reload both:
  - quotations/payment data via `refetch()`
  - document status via `loadDocumentStatus(...)` for the related quotation
- make sure the selected finance payment carries quotation id if needed, or fetch it before refresh

This removes the UI lag where payment is approved but the row still looks old.

### 4. Make approved Sales Receipt preview/load pick the latest approved document correctly
Review document selection logic in:
- `src/components/special-hire/FinanceApprovalModal.tsx`
- `src/hooks/useDocumentManagement.ts`
- `src/components/special-hire/DocumentViewer.tsx`

Adjust so:
- approved payment → approved document is preferred
- draft document is only fallback before finance approval
- preview buttons open the correct approved Sales Receipt after finance approval

### 5. Clean up the mixed draft flags
Right now DB records often become:
- `document_status = approved`
- `invoice_status = draft`

That mismatch is confusing. Standardize the UI to ignore `invoice_status` for Special Hire stored documents, or update approval/regeneration flow to keep both statuses aligned for consistency.

## Expected result after fix

For a finance-approved sales receipt:
- Payment History shows the actual approved payments
- Approved amount no longer shows `0`
- Sales Receipt row stops behaving like draft
- Documents modal / preview opens the approved receipt correctly
- Final Invoice flow reads the real paid amount

## Technical notes
- Confirmed from DB schema: `special_hire_payments.reference_no` exists, `reference_number` does not
- Confirmed from logs: current 400/42703 error is exactly from that wrong column
- Confirmed from DB data: finance-approved documents already exist, so this is mainly a UI/status-source issue, not a missing approval write

