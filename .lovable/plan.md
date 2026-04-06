

# Fix: AP Direct Payment Voucher — Show Account Code, Name, Description, Amount

## Problem
When previewing a Direct Payment voucher, the document shows "No allocations" because:
1. The modal only fetches `ap_payment_allocations` — but direct payments use `ap_payment_lines` instead
2. The placeholder mapping has no `{{payment_line_items}}` for direct payment lines
3. The voucher template has no section to display line item details (account code, account name, description, qty, price, amount)

## Solution

### 1. Fetch `ap_payment_lines` for direct payments
**File**: `src/components/accounting/shared/FinanceDocumentPreviewModal.tsx`

Add a new `useQuery` that fetches `ap_payment_lines` (joined with `chart_of_accounts` for account code/name) when `documentType === "ap_payment_voucher"` and `documentData?.is_direct_payment === true`.

Pass the fetched lines into `mapDocumentToPlaceholders` as the `lineItems` parameter.

### 2. Generate payment line items table
**File**: `src/lib/document-template-utils.ts`

In the `ap_payment_voucher` case:
- Add a new function `generatePaymentLineItemsTable()` that renders columns: Account Code, Account Name, Description, Qty, Unit Price, Tax, Amount
- Set `{{payment_line_items}}` placeholder with this table
- When direct payment lines exist, also override `{{allocations}}` with the line items table (so existing templates show the data instead of "No allocations")

### 3. No template changes needed
The existing `{{allocations}}` placeholder position in the voucher template will now show the payment line items table for direct payments, and the normal allocations table for regular payments.

## Files
- **Modify**: `src/components/accounting/shared/FinanceDocumentPreviewModal.tsx` — fetch `ap_payment_lines` with joined account data
- **Modify**: `src/lib/document-template-utils.ts` — generate payment lines table and set as `{{allocations}}` for direct payments

