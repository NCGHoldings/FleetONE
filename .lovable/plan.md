

# Fix Landed Cost: Build the Create Voucher Form

## Problem
The Landed Cost module is non-functional because:
1. The "New Landed Cost Voucher" button has **no onClick handler** — no form or modal exists
2. There are **zero GRNs** in the database, so even with a form, there's nothing to create vouchers from
3. The complete creation workflow (select GRN → pick items → add charges → allocate) is missing

## What to build

### 1. Create `src/components/accounting/inventory/CreateLandedCostVoucherModal.tsx`
A multi-step modal form:

**Step 1 — Voucher Header**
- Auto-generate voucher number (`LCV-YYYY-MMDD-HHMM`)
- Select GRN from dropdown (fetches `goods_receipt_notes` with `grn_number`)
- Posting date (default today)
- Allocation method: By Value / By Quantity / By Weight
- Notes field

**Step 2 — Items** (auto-populated from GRN)
- When GRN is selected, fetch `grn_lines` joined with `items` for that GRN
- Show item code, item name, received quantity, unit cost, line total
- User can check/uncheck items to include
- Original cost = `line_total` from GRN line

**Step 3 — Charges**
- Add rows for charges: charge type (dropdown: Freight, Insurance, Customs Duty, Stamp Duty, Port Charges, Clearing Agent Fee, Other), description, amount, vendor (optional from vendors list), expense account (from COA)
- Dynamic add/remove rows
- Show total charges

**Step 4 — Allocation Preview**
- Show how charges will be allocated across items based on selected method
- Display: item name, original cost, allocated cost, final cost
- Total row

**Submit** calls `useCreateLandedCostVoucher` mutation

### 2. Modify `src/components/accounting/inventory/LandedCostView.tsx`
- Add state for modal open/close
- Wire "New Landed Cost Voucher" button onClick to open modal
- Pass `onSuccess` callback to refresh voucher list

### 3. Allow creating without GRN (manual mode)
Since there are zero GRNs, add a "Manual Entry" option:
- Instead of selecting a GRN, user can manually add items from the `items` table
- Select item → enter original cost → add to list
- This ensures the feature works even without the full PR→PO→GRN pipeline

## Files
- **Create**: `src/components/accounting/inventory/CreateLandedCostVoucherModal.tsx` — full multi-step create form
- **Modify**: `src/components/accounting/inventory/LandedCostView.tsx` — wire button + render modal

## Result
- Users can create landed cost vouchers (from GRN or manually)
- Add multiple charges with GL account mapping
- See allocation preview before saving
- Draft vouchers appear in list, ready to "Post to GL" (existing logic)

