

# Fix AR Invoice Account Types + AP Payment Approve Action

## Two issues to fix

### 1. AR Invoice Revenue Account dropdown too restrictive
**Current**: `accountTypes={["revenue", "income"]}` — only shows Revenue/Income accounts.
**Problem**: Sometimes you need to post to Equity accounts (e.g., capital contributions, owner draws recorded via AR).
**Fix**: Add `"equity"` to the `accountTypes` array in `ARInvoiceForm.tsx` line 492.

### 2. AP Payments page has no "Approve" button in action column
**Current**: The AP Payments table shows "Pending Approval" badge but the only way to approve is through a separate Pending Approvals page — not user-friendly.
**Fix**: The hook `useApproveAPPayment` already exists in `useAccountingMutations.ts` but is not imported or used in `APPaymentsView.tsx`. Add an Approve button directly in the action column for payments with `approval_status === "pending"`.

## Files to Change

### `src/components/accounting/ARInvoiceForm.tsx`
- Line 492: Change `accountTypes={["revenue", "income"]}` to `accountTypes={["revenue", "income", "equity"]}`

### `src/components/accounting/APPaymentsView.tsx`
- Import `useApproveAPPayment` from `useAccountingMutations` and `CheckCircle` icon
- Initialize the hook: `const approvePayment = useApproveAPPayment()`
- Add an "Approve" button in the action column (line ~329) for payments where `payment.approval_status === "pending"` — green outline button with CheckCircle icon, same style as the AP Invoice approve button

## Result
- AR Invoice line items can now map to Equity accounts when needed
- AP Payments can be approved directly from the payments list — no need to navigate to a separate approvals page

