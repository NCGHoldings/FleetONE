

# Professional AR Revenue Account Resolution — Item Category Based

## Current State (Problem)

1. **Core GL Settings** has a single "Sales Revenue Account" field — this maps ALL revenue to one account regardless of what's being sold
2. **Item categories** already exist with proper `sales_account_id` mappings (Yutong Sales, Light Vehicle Sales, School Bus Revenue, etc.)
3. **Customer categories** have `revenue_account_id` but they are all NULL
4. **Manual AR invoice lines** have an `account_id` field that CAN be set per line — and the GL posting already supports `revenueLines` for multi-account splitting
5. **Vehicle sales** already use item category resolution correctly (4-tier hierarchy)

**The gap**: Manual AR invoices don't have an easy way to select an item category per line, so revenue always falls back to the single global account.

## What Needs to Change

### 1. Add Item Category selector to AR Invoice line items

Each invoice line should have an **Item Category** dropdown (Yutong Sales, School Bus Revenue, Spare Parts, etc.). When selected, it auto-fills the `account_id` with the category's `sales_account_id`.

```text
CURRENT AR INVOICE LINE:
  Description | Qty | Price | Tax | GL Account (manual)

IMPROVED AR INVOICE LINE:
  Item Category | Description | Qty | Price | Tax | GL Account (auto-filled from category)
```

### 2. Remove "Sales Revenue Account" from Core GL Settings

This single global revenue mapping is misleading. Revenue must be mapped per item category. Replace the field with an informational note: "Revenue accounts are configured per Item Category in Settings → Module GL Mappings."

### 3. Update GL posting to enforce category-based revenue

The `useAccountingMutations.ts` AR invoice GL posting already supports `revenueLines`. Currently it only uses them when `account_id` is explicitly set on lines. After adding the category selector, every line will have an `account_id`, so the multi-account revenue posting will activate automatically.

### 4. Populate Customer Category revenue accounts

The two customer categories (External Customer, Internal) have `revenue_account_id = NULL`. These should be populated as defaults, but item-category-level accounts take priority.

## Implementation

### Files to modify

1. **`src/components/accounting/ARInvoiceForm.tsx`**
   - Add `useItemCategories()` data fetch
   - Add Item Category dropdown column to each invoice line
   - When category is selected, auto-set `account_id` from `sales_account_id`
   - Show the resolved GL account name next to the selector

2. **`src/components/settings/CoreGLSettings.tsx`**
   - Remove `sales_revenue_account_id` selector
   - Add informational text: "Revenue accounts are mapped per Item Category"

3. **`src/hooks/useAccountingMutations.ts`** (AR invoice creation)
   - No change needed — it already builds `revenueLines` from lines with `account_id`
   - Add validation: warn if any line is missing `account_id`

4. **`src/lib/gl-posting-utils.ts`**
   - No change needed — `postARInvoiceToGL` already handles `revenueLines` with grouped accounts

## Accounting principle

```text
PROFESSIONAL REVENUE MAPPING (Category-Based)
================================================
Item Category: Yutong Sales       → CR 41101001 SALES INCOME - YUTONG BUSES
Item Category: School Bus Revenue → CR 41102001 RENTAL INCOME - SCHOOL BUSES
Item Category: Spare Parts Sales  → CR 41103001 SPARE PARTS REVENUE
Item Category: Light Vehicle      → CR 41104001 SALES INCOME - LIGHT VEHICLES

Each AR invoice line maps to its correct revenue account.
No single "catch-all" revenue account.
```

## Result
- Every AR invoice line resolves to the correct revenue GL account via item category
- Multi-category invoices correctly split revenue across accounts in the journal entry
- Core GL Settings no longer has a misleading single revenue account
- Vehicle sales modules continue working as before (they already use item categories)

