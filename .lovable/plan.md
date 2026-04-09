

# Configurable Expense Categories + IOU Flow Fixes

## What You Want

1. **Expense categories should be show/hide per company** — some companies don't need all 21 categories (e.g., "Body Wash" is irrelevant for NCG Holding). You want flexibility to enable/disable categories per company.
2. **IOU side should also work properly** — cross-check the full IOU flow (create, settle, GL posting, link to expenses).

## What I Found

### Expense Categories
- Currently, `EXPENSE_CATEGORIES` is a hardcoded array of 21 items in `useExpenseRequests.ts`
- Used in: Disbursement form, Disbursement filter, Dashboard, Reports, Expense Request form, GL integrity scanner
- No per-company configuration exists — every company sees all 21 categories
- No `expense_category_settings` table exists in the database

### IOU System
- IOU create works: issues IOU, auto-posts GL (DR Staff Advance / CR Cash)
- IOU settle works: marks settled, auto-posts reversal GL (DR Cash / CR Staff Advance)
- **Missing**: No partial settlement support — "Settle" button always marks full amount settled, no way to record partial payments
- **Missing**: When expense request uses `payment_method: "iou"`, the selected IOU's `settled_amount` and `balance` are NOT updated — the expense saves but IOU stays "pending"
- IOU numbering uses empty string on create (`iou_number: ""`) — should use auto-numbering

## Plan

### Step 1: Create company expense category settings table
New migration to create `company_expense_categories` table:
- `company_id` (uuid, FK to companies)
- `category_value` (text, matches EXPENSE_CATEGORIES value)
- `is_enabled` (boolean, default true)
- Unique constraint on (company_id, category_value)
- When no rows exist for a company, all categories are enabled (backward compatible)

### Step 2: Create hook to manage category visibility
New hook `useCompanyExpenseCategories` in `src/hooks/useExpenseRequests.ts`:
- Fetches enabled categories for the current company
- Returns filtered `EXPENSE_CATEGORIES` list
- Provides mutation to toggle categories on/off
- Falls back to all categories if no settings exist

### Step 3: Add category settings UI to Petty Cash or Expenses settings
Add a settings panel (accessible from the Petty Cash or Expenses area) where admin can:
- See all 21 categories with toggle switches per company
- Enable/disable categories — changes take effect immediately
- Simple card with checkboxes/switches grouped by category group (Operational, Staff, Maintenance, Administrative, Other)

### Step 4: Replace hardcoded EXPENSE_CATEGORIES usage with filtered list
Update these components to use the filtered categories hook instead of raw `EXPENSE_CATEGORIES`:
- `PettyCashDisbursementsTab.tsx` — form dropdown and filter dropdown
- `PettyCashDashboardTab.tsx` — category labels
- `PettyCashReportsTab.tsx` — category labels
- `ExpenseRequestForm.tsx` — category dropdown

### Step 5: Fix IOU auto-settlement from expense requests
In `useCreateExpenseRequest` (`useExpenseRequests.ts`):
- When `payment_method === "iou"` and `iou_id` is provided:
  - Fetch the IOU record
  - Update `settled_amount += expense amount`, recalculate `balance`
  - If balance reaches 0, set `status: "settled"`; otherwise `status: "partially_settled"`
  - This makes the expense system and IOU system interconnected

### Step 6: Add partial settlement to IOU Management
In `IOUManagementView.tsx`:
- Replace the "Settle" button with a dialog that allows entering a settlement amount (default: full balance)
- Update `useUpdateIOU` to handle partial amounts: update `settled_amount`, `balance`, and `status` accordingly
- Auto-post proportional GL entries for partial settlements

### Step 7: Fix IOU numbering
- Add `iou` to numbering sequences (same pattern as other entities)
- Use `useGenerateNumber("iou")` in `IOUManagementView.tsx` create form
- Set the generated number before insert instead of empty string

## Files to Change

- **New SQL migration** — create `company_expense_categories` table; add `iou` numbering sequence
- **`src/hooks/useExpenseRequests.ts`** — add `useCompanyExpenseCategories` hook; fix IOU auto-settlement in `useCreateExpenseRequest`
- **`src/components/accounting/petty-cash/PettyCashDisbursementsTab.tsx`** — use filtered categories
- **`src/components/accounting/petty-cash/PettyCashDashboardTab.tsx`** — use filtered categories
- **`src/components/accounting/petty-cash/PettyCashReportsTab.tsx`** — use filtered categories
- **`src/components/accounting/ExpenseRequestForm.tsx`** — use filtered categories
- **`src/components/accounting/PettyCashView.tsx`** — add a "Category Settings" button/tab
- **New file: `src/components/accounting/petty-cash/ExpenseCategorySettings.tsx`** — toggle UI for categories
- **`src/components/accounting/IOUManagementView.tsx`** — add partial settlement dialog; add auto-numbering
- **`src/hooks/usePettyCash.ts`** — update `useUpdateIOU` for partial settlement GL; fix `useCreateIOU` numbering
- **`src/hooks/useNumbering.ts`** — add `iou` entity type label

## Result

- Each company can show/hide expense categories — no irrelevant items in dropdowns
- Default: all categories enabled (backward compatible)
- IOU settlement works both from expense requests and directly from IOU management
- Partial IOU settlements supported with proper GL entries
- IOU numbering is automated and sequential
- All systems interconnected: Expense → Petty Cash → IOU → GL

