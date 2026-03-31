

# Fix: Yutong Payment Type Detection + AR Invoice Balance Updates

## Root Cause Analysis

**Bug 1 — Wrong field name (Critical)**: `YutongPaymentTracking.tsx` line 346 and `SinotrukPaymentTracking.tsx` line 347 use `orderDetails?.finance_ar_invoice_id` but the actual database column is `ar_invoice_id`. This means `arInvoiceId` is ALWAYS `undefined`, so every payment is posted as `'advance'` (DR Bank / CR Customer Advance) — even payments made AFTER the AR invoice exists.

**Bug 2 — No AR Receipt for post-invoice payments**: Because of Bug 1, the code never enters the `if (arInvoiceId)` branch that creates AR Receipts and updates `ar_invoices.paid_amount`. That's why the AR Invoice shows only LKR 1,000,000 paid (the amount applied at approval time) instead of LKR 6,000,000.

**Bug 3 — Stale orderDetails**: When verifying a payment, the code reads `orderDetails` from local state which may be stale (loaded at modal open). It should re-fetch the order to get the latest `ar_invoice_id` before deciding payment type.

## Fix Plan

### File 1: `src/components/yutong/YutongPaymentTracking.tsx`
- **Line 346**: Change `orderDetails?.finance_ar_invoice_id` → `orderDetails?.ar_invoice_id`
- **Before the payment type check**: Re-fetch the order from Supabase to get the latest `ar_invoice_id` (in case invoice was approved after the modal loaded)

### File 2: `src/components/sinotruck/SinotrukPaymentTracking.tsx`
- **Line 347**: Change `orderDetails?.finance_ar_invoice_id` → `orderDetails?.ar_invoice_id`
- Same re-fetch pattern

### File 3: `src/components/sinotruck/SinotruckPaymentTracking.tsx`
- Already uses correct field (`ar_invoice_id`) — no change needed, but add re-fetch for consistency

### File 4: `src/components/lightvehicle/LightVehiclePaymentTracking.tsx`
- Already uses correct field — add re-fetch for consistency

## What This Fixes

After fix:
- Payment verified BEFORE invoice → `advance` (DR Bank / CR Customer Advance) ✓
- Payment verified AFTER invoice approval → `balance` (DR Bank / CR Trade Receivable) + AR Receipt created + AR Invoice `paid_amount` updated ✓
- AR Invoice balance reflects ALL verified payments, not just the ones known at approval time

## Technical Detail

The re-fetch adds ~3 lines before the payment type decision:

```text
// Re-fetch order to get latest ar_invoice_id
const { data: freshOrder } = await supabase
  .from('yutong_orders')
  .select('ar_invoice_id, finance_customer_id')
  .eq('id', selectedOrderId)
  .single();

const arInvoiceId = freshOrder?.ar_invoice_id;
const paymentType = arInvoiceId ? 'balance' : 'advance';
```

This ensures even if the invoice was approved in another tab/session, the payment verify always checks the latest state.

