

# Fix Petty Cash: Missing NCG Holding, Custodian Text Input, and Auto-Deduction

## Problems Found

### 1. NCG Holding missing from Business Unit dropdown
The `BUSINESS_UNITS` constant in `useExpenseRequests.ts` only has 6 entries (SBO, SPH, YUT, SNT, LTV, NCGE). "NCG Holding" is not included. The petty cash fund form uses this same list.

### 2. Custodian is a staff dropdown — should be free text
The form currently fetches `staff_registry` and renders a `Select` dropdown for custodian. The user wants a simple text input instead (type any name). The DB column `custodian_id` is UUID but has no FK constraint — however the query joins `staff_registry`. I will add a new `custodian_name` text column and use that instead.

### 3. Expense "Petty Cash" payment method does NOT auto-deduct
When creating an expense request with `payment_method: "petty_cash"` and selecting a fund, **nothing happens** to the petty cash fund balance. The expense just saves with a `petty_cash_fund_id` reference but no deduction occurs. The deduction only happens when manually creating a disbursement in the Petty Cash tab.

### 4. Disbursements don't link back to expenses
Petty cash disbursements and expense requests are disconnected — no cross-reference or status sync.

## Plan

### Step 1: Add "NCG Holding" to BUSINESS_UNITS
Add `{ value: "NCGH", label: "NCG Holding" }` to the `BUSINESS_UNITS` array in `useExpenseRequests.ts`.

### Step 2: Change Custodian to text input
- **Database migration**: Add `custodian_name` text column to `petty_cash_funds`
- **`PettyCashFundsTab.tsx`**: Replace the custodian `Select` dropdown with a simple `Input` field bound to `custodian_name`. Remove the `staff_registry` query. Update form state, submit, and table display to use `custodian_name` instead of `custodian_id`.
- **`usePettyCash.ts`**: Update `useCreatePettyCashFund` and `useUpdatePettyCashFund` mutations to save `custodian_name`. Remove the `custodian:staff_registry(staff_name)` join from the fund query, or keep it as optional fallback.

### Step 3: Auto-deduct petty cash when expense uses "petty_cash" payment
In `useCreateExpenseRequest` (`useExpenseRequests.ts`):
- When `payment_method === "petty_cash"` and `petty_cash_fund_id` is provided:
  1. Create a `petty_cash_transactions` disbursement record linked to the expense
  2. Update the fund's `current_balance` (deduct the amount)
  3. Auto-create the GL journal entry (same logic as existing disbursement flow)
- This makes the expense system and petty cash system fully interconnected

### Step 4: Update fund query and display
- Update `PettyCashFund` interface to include `custodian_name`
- Update the funds table to show `custodian_name` text instead of joined staff name

## Files to Change

- **New SQL migration** — add `custodian_name` text column to `petty_cash_funds`
- **`src/hooks/useExpenseRequests.ts`** — add "NCG Holding" to `BUSINESS_UNITS`; add petty cash auto-deduction in `useCreateExpenseRequest`
- **`src/hooks/usePettyCash.ts`** — update interface, mutations, and query for `custodian_name`
- **`src/components/accounting/petty-cash/PettyCashFundsTab.tsx`** — replace custodian dropdown with text input

## Result

- NCG Holding appears in Business Unit dropdown
- Custodian is a free text field (type any name)
- Expense requests paid via petty cash automatically deduct from the selected fund and create a disbursement record
- All systems stay interconnected: expense → petty cash transaction → GL journal entry

