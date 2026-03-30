

# Fix Final Invoice: Fresh Payment Data + Payment Timeline Monitor

## Root Cause

The Final Invoice modal receives `total_paid` as a **prop from the parent table**. If the user opens the modal before the realtime subscription refreshes (common after confirming a payment), the prop contains **stale data** -- e.g., only the balance payment (20,200) instead of the cumulative total (40,367.50).

**DB confirms the data IS correct:**
- QUO-2025-0741-v1.3: `total_paid = 40,367.50` (advance 20,167.50 + balance 20,200)
- But invoice generated with `Total Paid: 20,200` -- only the last payment

The modal must **fetch fresh payment data directly from DB** when it opens, not rely on props.

## Changes

### 1. Fetch fresh cumulative payments when modal opens

**File: `src/components/special-hire/GenerateBalanceInvoiceModal.tsx`**

Add a `useEffect` that runs when `open` becomes true:
- Query `special_hire_payments` WHERE `quotation_id = id` AND `status = 'approved'`
- SUM all payment amounts → `freshTotalPaid`
- Use `freshTotalPaid` instead of `quotationData.total_paid` in all calculations

This eliminates the stale-prop problem entirely. The modal always works with real-time DB data.

### 2. Add Payment Timeline component to the Final Invoice modal

**File: `src/components/special-hire/PaymentTimeline.tsx`** (NEW)

A small reusable component showing the full payment history for a quotation:

```text
┌─────────────────────────────────────────────┐
│ Payment History                             │
├─────────────────────────────────────────────┤
│ ● Advance  │ LKR 20,167.50 │ ✅ Approved  │
│   Mar 30, 18:03                             │
│ ● Balance  │ LKR 20,200.00 │ ✅ Approved  │
│   Mar 30, 18:06                             │
├─────────────────────────────────────────────┤
│ Total Paid: LKR 40,367.50                  │
│ Total Payable: LKR 40,335.00               │
│ Overpaid Credit: LKR 32.50                 │
└─────────────────────────────────────────────┘
```

- Fetches directly from `special_hire_payments` table
- Shows each payment: type, amount, status (color-coded), date
- Shows running total and balance status
- Reusable -- can be embedded in the Final Invoice modal AND in the trip row actions

### 3. Show Payment Timeline in Final Invoice modal

**File: `src/components/special-hire/GenerateBalanceInvoiceModal.tsx`**

Add `<PaymentTimeline quotationId={quotationData.id} />` above the Financial Summary card. This gives the user immediate visibility into all payments before generating the invoice.

### 4. Add "View Payment History" action to trip dropdown

**File: `src/components/special-hire/ConfirmedTripsTable.tsx`**

Add a new dropdown item under the Finance section: "Payment History" -- opens a small dialog with the `<PaymentTimeline>` component for that trip. This lets users monitor payment flows for any trip at any time.

## Technical Detail

**Fresh data fetch in modal (replaces stale props):**
```typescript
const [freshTotalPaid, setFreshTotalPaid] = useState<number | null>(null);

useEffect(() => {
  if (open && quotationData.id) {
    supabase
      .from('special_hire_payments')
      .select('amount, status, payment_type')
      .eq('quotation_id', quotationData.id)
      .eq('status', 'approved')
      .then(({ data }) => {
        const total = (data || []).reduce((sum, p) => sum + (p.amount || 0), 0);
        setFreshTotalPaid(total);
      });
  }
}, [open, quotationData.id]);

// In calculations, use:
const actualTotalPaid = freshTotalPaid ?? quotationData.total_paid ?? quotationData.advance_paid ?? 0;
```

**Files to change:**
1. `src/components/special-hire/GenerateBalanceInvoiceModal.tsx` -- fetch fresh payments on open, embed timeline
2. `src/components/special-hire/PaymentTimeline.tsx` -- NEW component
3. `src/components/special-hire/ConfirmedTripsTable.tsx` -- add "Payment History" dropdown action

## Summary
- Fix stale data: modal fetches fresh cumulative payments from DB on open (not from props)
- Add Payment Timeline: visual audit trail showing every payment, status, and running total
- Add "Payment History" dropdown action: users can monitor any trip's payment flow anytime
- Overpaid credit display continues to work correctly with fresh data

