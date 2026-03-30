

# Special Hire: Complete A-to-Z Flow Diagram & Fine-Tuning

## Current State Summary

From code analysis, here's what EXISTS and what's MISSING:

### What Works (Done)
1. **Sales Receipt** on advance payment → Draft created → Finance approval → Approved with signatures
2. **Generate Final Invoice** (with or without adjustment) → Preview, Download, Email
3. **Post-Trip Adjustment** → Record extra KM/expenses → Finalize
4. **GL posting** on email send (invoice sent triggers DR Receivable / CR Revenue)
5. **Re-generate** Sales Receipt and Final Invoice from dropdown

### What's Mixed Up / Missing

**Problem 1: "Invoice without signature" concept doesn't exist as a separate action**
The user wants an option to generate a quick invoice (without signatures) to send to the customer as a payment reminder — BEFORE finance approval, BEFORE post-trip adjustment. Currently the only way to send something is the Final Invoice modal, which auto-saves as "balance" type and triggers GL posting on email. This is wrong for a simple reminder.

**Problem 2: Final Invoice always triggers GL posting on email**
If user just wants to send a reminder invoice (no GL needed), the current flow posts to GL anyway. GL should only post when the FINAL invoice is sent (after all adjustments are done).

**Problem 3: No "Send Sales Receipt" to customer option**
After finance approves advance payment, the approved Sales Receipt exists but there's no button to email it to the customer as confirmation.

**Problem 4: Flow is unclear — too many overlapping document options**
"View Invoice", "View Documents", "Generate Final Invoice", "View Balance Invoice" — confusing.

## Correct Business Flow (All Scenarios)

```text
SCENARIO A: Customer pays ADVANCE before trip
  1. Confirm Advance Payment → Draft Sales Receipt created
  2. Finance Approves → Sales Receipt gets signatures → GL posted
  3. Trip happens
  4a. No extra charges → Generate Final Invoice (same amounts) → Email → GL posted
  4b. Extra charges → Post-Trip Adjustment → Generate Final Invoice (with extras) → Email → GL posted

SCENARIO B: Customer pays FULL before trip  
  1. Confirm Full Payment → Draft Invoice created
  2. Finance Approves → Invoice gets signatures → GL posted
  3. Trip happens
  4a. No extra → Done (settled)
  4b. Extra charges → Post-Trip Adjustment → Generate Supplementary Invoice → Email → GL posted

SCENARIO C: Customer pays NOTHING before trip
  1. Trip happens (no payment yet)
  2. Option: Send Payment Reminder (invoice without signatures, NO GL)
  3. Customer pays → Confirm Payment → Draft document created
  4. Finance Approves → GL posted
  5. If adjustment needed → Post-Trip Adjustment → Final Invoice

SCENARIO D: Customer pays ADVANCE, then BALANCE after trip
  1. Confirm Advance → Sales Receipt → Finance Approval
  2. Trip happens  
  3. Confirm Balance Payment → Draft Invoice created
  4. Finance Approves → GL posted
  5. If adjustment → Post-Trip Adjustment → Supplementary Invoice
```

## Plan: What to Build/Fix

### 1. Create comprehensive Mermaid flow diagram
Create a detailed `.mmd` diagram showing ALL scenarios with clear markers for what's ✅ done and what's ❌ missing.

### 2. Add "Send Payment Reminder" action (NEW)
- New dropdown item: "Send Payment Reminder" — available when customer has unpaid balance and no final invoice sent yet
- Generates a simple invoice PDF (without signatures, without "DRAFT" watermark) using existing `generateInvoicePDF`
- Has "Download" and "Email to Customer" buttons
- Does NOT trigger GL posting (it's just a reminder, not a financial event)
- Stores as document_type = 'payment_reminder' in document_storage

### 3. Add "Email Sales Receipt" action
- After finance approval, add dropdown item to email the approved Sales Receipt PDF to customer
- Uses existing document from storage, no regeneration needed

### 4. Fix Final Invoice GL posting guard
- Only post GL when invoice is the FIRST final invoice sent (check if GL already posted for this quotation's invoice)
- Prevent double GL posting if user re-sends the same final invoice

### 5. Simplify dropdown menu labels
Current confusing labels → Clear labels:
- "View Invoice" → Remove (redundant with "View Documents")
- "Generate Final Invoice" → Keep (clear purpose)
- "View Balance Invoice" → "View Final Invoice" (rename)
- Add "Send Payment Reminder" (new)
- Add "Email Sales Receipt" (new)

### Files to Change

**File 1: `src/components/special-hire/ConfirmedTripsTable.tsx`**
- Add "Send Payment Reminder" dropdown item
- Add "Email Sales Receipt" dropdown item  
- Remove redundant "View Invoice" item
- Rename "View Balance Invoice" → "View Final Invoice"
- Add helper to email existing document

**File 2: `src/components/special-hire/GenerateBalanceInvoiceModal.tsx`**
- Add GL posting guard (check if already posted before posting again)
- This is the Final Invoice modal — no other changes needed

**File 3: Create Mermaid diagram** (`/mnt/documents/special-hire-complete-flow.mmd`)
- All 4 scenarios with decision points
- Mark done vs missing items

## Summary
- Build complete flow diagram marking done/missing
- Add "Send Payment Reminder" (invoice without signatures, no GL) for unpaid customers
- Add "Email Sales Receipt" for sending approved receipt to customer
- Fix GL double-posting guard on Final Invoice
- Clean up dropdown labels for clarity
- No changes to existing GL/AR logic — only adding guards and new lightweight actions

