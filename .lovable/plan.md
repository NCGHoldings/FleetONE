

# Spreadsheet Full Automation: DO, Payments, and System Integration

## What You're Getting

The spreadsheet currently shows DO, CR, Cheque, Cash columns as **read-only summaries**. This plan makes them **interactive** -- you can click on any of those cells to open quick-action panels directly from the spreadsheet that let you:

1. **DO Column** -- Click to see existing DOs, update DO status, or create a new DO for that order
2. **CR Column** -- Click to record a new cash receipt or view existing receipts
3. **Payment Columns (Cheque/Cash)** -- Click to record a new payment (cheque or cash method), view existing payments, or verify pending payments
4. **All changes auto-update**: `total_paid`, `balance_due`, invoices, vouchers, and GL entries -- using the **existing** finance hooks (`useYutongFinanceManagement`, `YutongPaymentTracking` verify logic, `useYutongCashReceipts`)

## Architecture

```text
Spreadsheet Cell Click (DO / CR / Payment)
        |
        v
  Popover/Sheet Panel (inline, no page navigation)
        |
        +-- View existing records (list)
        +-- Quick Add (form)
        +-- Update Status (dropdown)
        |
        v
  Existing Hooks (reused, not duplicated)
  - useYutongFinanceManagement.createDeliveryOrder()
  - useYutongFinanceManagement.updateDOStatus()
  - YutongPaymentTracking payment recording logic
  - useYutongCashReceipts.createCashReceipt()
  - postVehiclePaymentToGL() (GL automation)
        |
        v
  Auto-refresh spreadsheet row (realtime subscription already active)
```

## Changes

### 1. New Component: `SpreadsheetQuickActions.tsx`
A set of popover-based panels triggered from spreadsheet cells:

**DO Quick Panel** (`SpreadsheetDOPanel`):
- Shows list of existing DOs for the order (do_no, status, amount)
- Status update dropdown (pending → released → collected)
- "Create DO" mini-form (do_no, issuing_bank, do_amount, vehicle_count)
- Uses `useYutongFinanceManagement` hooks

**Payment Quick Panel** (`SpreadsheetPaymentPanel`):
- Shows list of existing payments with status badges
- "Record Payment" mini-form (amount, method [cash/cheque/bank_transfer], date, reference)
- "Verify" button for pending payments (triggers GL posting via existing `postVehiclePaymentToGL`)
- Auto-generates cash receipt via `useYutongCashReceipts`
- Updates `total_paid` and `balance_due` on `yutong_orders`

**CR Quick Panel** (`SpreadsheetCRPanel`):
- Shows list of cash receipts with receipt_no, amount, status
- Link to view/download receipt PDF
- "Generate Receipt" for unlinked payments

### 2. Update `YutongSpreadsheetCore.tsx`
- Replace static DO/CR/Cheque/Cash cells with clickable Popover triggers
- Each cell shows the summary value but opens the quick panel on click
- Visual indicator (small icon) showing the cell is interactive

### 3. Update `useYutongSpreadsheetData.ts`
- Add `order_id` to `SpreadsheetOrder` (already exists as `id`)
- Fetch additional detail: DO statuses, payment statuses (not just amounts but also pending count)
- Add helper counts: `pending_payments_count`, `do_count`

### 4. New Hook: `useSpreadsheetQuickActions.ts`
Thin wrapper that coordinates:
- `recordPayment(orderId, amount, method, date, reference)` -- inserts into `yutong_customer_payments`, auto-creates cash receipt, updates order totals
- `verifyPayment(paymentId)` -- calls existing GL posting logic
- `createDO(orderId, doData)` -- calls existing `createDeliveryOrder`
- `updateDOStatus(doId, status)` -- calls existing `updateDOStatus`
- Each action triggers spreadsheet refetch

### 5. Update Edge Function for Public Access
- Add `action: 'record_payment'` and `action: 'create_do'` handlers in `yutong-spreadsheet-data` so public users can also use quick actions (with access code validation)

## Files to Create
1. `src/components/yutong/spreadsheet/SpreadsheetQuickActions.tsx` -- DO, Payment, CR popover panels
2. `src/hooks/useSpreadsheetQuickActions.ts` -- coordinating hook

## Files to Modify
1. `src/components/yutong/spreadsheet/YutongSpreadsheetCore.tsx` -- make DO/CR/Cheque/Cash cells interactive
2. `src/hooks/useYutongSpreadsheetData.ts` -- enrich data with payment/DO details
3. `supabase/functions/yutong-spreadsheet-data/index.ts` -- add payment/DO actions
4. `src/components/yutong/spreadsheet/YutongOrderSpreadsheet.tsx` -- pass quick action handlers
5. `src/pages/PublicYutongSpreadsheet.tsx` -- wire public quick actions

## Key Detail: Automation Chain

When a user records a payment from the spreadsheet:
1. Payment inserted into `yutong_customer_payments` (status: pending)
2. User clicks "Verify" → GL posted (DR Bank / CR Customer Advance)
3. Cash receipt auto-generated in `yutong_cash_receipts`
4. `yutong_orders.total_paid` and `balance_due` recalculated
5. Spreadsheet row auto-refreshes via realtime subscription
6. Reports tab reflects updated data immediately

