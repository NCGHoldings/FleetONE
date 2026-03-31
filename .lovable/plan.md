

# Fix Special Hire: AR Invoice Amount, Duplicate Documents & Clean View

## Problems Found

### 1. Duplicate Final Invoice Documents
- `checkExistingInvoice()` uses `.maybeSingle()` which **errors silently** when multiple balance invoices exist (e.g., from previous auto-save bugs)
- Result: `documentId` stays null, auto-save creates ANOTHER new document every time the modal opens
- DB shows 3 balance invoices + 1 sales receipt for QUO-2025-0035

### 2. AR Invoice paid_amount Wrong (121,408 instead of 115,704)
- AR Invoice created during balance payment approval with `paid_amount: 55,000` (advance)
- Then `updateSPHARInvoiceOnPayment` adds balance `60,704` → `paid_amount: 115,704` (correct at this point)
- But then `handleEmailToCustomer` in `GenerateBalanceInvoiceModal` calls `updateSPHARInvoiceOnInvoiceSent` which recalculates but the advance apply logic also runs, potentially double-counting
- The `createSPHARInvoice` during balance approval already sets `paid_amount: advanceAmount`, then `updateSPHARInvoiceOnPayment` ADDS the balance payment on top -- but the initial `advanceAmount` passed is the balance payment amount, not the advance. Need to verify the flow in `useFinanceApproval.ts` line 190-196.

### 3. View Documents Shows All Drafts
- Should only show the latest approved/active sales receipt and latest final invoice
- Currently shows every draft ever created

## Fixes

### File 1: `GenerateBalanceInvoiceModal.tsx` — Fix duplicate document creation

**`checkExistingInvoice()`** (line 153-173):
- Change `.maybeSingle()` to `.order('created_at', { ascending: false }).limit(1)` then take first result
- This ensures the latest document is found even when duplicates exist
- Also prevents auto-save from creating new documents when one already exists

### File 2: `GenerateBalanceInvoiceModal.tsx` — Fix AR paid_amount double-counting

**`handleEmailToCustomer()` GL section** (line 416-558):
- The advance apply logic on line 529 uses `freshTotalPaid` as advance amount -- this is WRONG because `freshTotalPaid` is the TOTAL paid (advance + balance), not just the advance
- Fix: query only advance payments from `special_hire_payments` where `payment_type = 'advance'` and `status = 'approved'` to get the correct advance-only amount
- Also add a guard: before calling `updateSPHARInvoiceOnInvoiceSent`, check if the AR invoice total_amount already matches to avoid unnecessary updates

### File 3: `ConfirmedTripsTable.tsx` — Clean up View Documents

**Documents modal** — filter documents to show only:
- The **latest** sales receipt (approved > draft priority)
- The **latest** final invoice (approved > draft priority)
- Hide superseded drafts

### File 4: `useFinanceApproval.ts` — Fix AR Invoice creation during balance approval

**Line 190-196**: When creating the AR Invoice during balance payment approval, the `advanceAmount` parameter is set to `paymentData.amount` (the balance payment amount, not the advance). This causes:
- `createSPHARInvoice` sets `paid_amount: 60,704` (balance) instead of advance
- Then `updateSPHARInvoiceOnPayment` adds another `60,704`
- Result: `paid_amount = 121,408` instead of `115,704`

Fix: Query the actual advance payments to pass as `advanceAmount`:
```
const { data: advPmts } = await supabase
  .from('special_hire_payments')
  .select('amount')
  .eq('quotation_id', paymentData.quotation.id)
  .eq('payment_type', 'advance')
  .eq('status', 'approved');
const actualAdvance = (advPmts || []).reduce((s, p) => s + (p.amount || 0), 0);
```
Then pass `advanceAmount: actualAdvance` to `createSPHARInvoice`.

## Data Fix

For QUO-2025-0035, after code fix:
- Delete the 2 duplicate draft documents from `document_storage`
- Correct the AR invoice `paid_amount` to 115,704 and `balance` to 0

## Summary

- Fix `.maybeSingle()` crash causing infinite document duplication
- Fix AR `paid_amount` double-counting by passing correct advance amount (not balance payment) to `createSPHARInvoice`
- Fix advance apply logic using actual advance-only total instead of `freshTotalPaid`
- Filter View Documents to show only latest sales receipt + latest final invoice
- Clean up existing bad data for QUO-2025-0035

