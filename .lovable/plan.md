

# Full GL Automation for Fixed Assets Module

## Overview

This plan adds automated double-entry journal posting for all fixed asset operations: **Acquisition**, **Disposal**, **Revaluation**, and switches **Depreciation** to use the existing GL-posting hook. It also adds new GL account mapping fields to asset categories so users can fully customize which accounts are used -- similar to how the Bank Account and Leasing Finance settings already work.

---

## Database Changes

### Add 3 new columns to `asset_categories` table:

| Column | Type | Purpose |
|--------|------|---------|
| `bank_account_id` | UUID (FK to chart_of_accounts) | Bank/Cash account used when acquiring assets |
| `gain_loss_disposal_account_id` | UUID (FK to chart_of_accounts) | Gain/Loss on Disposal account |
| `revaluation_surplus_account_id` | UUID (FK to chart_of_accounts) | Revaluation Surplus (Equity) account |

These follow the same pattern as the existing `asset_account_id`, `accumulated_dep_account_id`, and `depreciation_expense_account_id` columns.

---

## File Changes

### 1. AssetCategoryForm.tsx -- Add GL Account Selectors

Add 3 new Select dropdowns for the new GL accounts:
- **Bank/Cash Account** (filtered to `account_type = 'asset'`)
- **Gain/Loss on Disposal Account** (filtered to `account_type IN ('revenue', 'expense']`)
- **Revaluation Surplus Account** (filtered to `account_type = 'equity'`)

Also add red asterisk markers on the 6 GL account fields and a validation warning if mandatory accounts are missing, matching the pattern used in vehicle sales finance settings.

### 2. useAccountingMutations.ts -- useCreateAssetCategory

Update the mutation to pass the 3 new fields (`bank_account_id`, `gain_loss_disposal_account_id`, `revaluation_surplus_account_id`) to the database insert.

### 3. useAccountingMutations.ts -- useCreateFixedAsset (Acquisition GL)

After inserting the asset into `fixed_assets`, automatically post a journal entry:
- **DR** Fixed Asset Account (from category's `asset_account_id`) = purchase_cost
- **CR** Bank/Cash Account (from category's `bank_account_id`) = purchase_cost

Uses the existing `createAndPostJournalEntry()` utility from `gl-posting-utils.ts`. Skips GL posting gracefully (with a warning toast) if accounts are not configured.

### 4. useAccountingMutations.ts -- useCreateAssetDisposal (Disposal GL)

After recording the disposal, automatically post a journal entry with up to 4 lines:
- **DR** Bank/Cash Account = disposal_value (sale proceeds)
- **DR** Accumulated Depreciation Account = accumulated_depreciation
- **DR or CR** Gain/Loss on Disposal Account = gain_loss amount
- **CR** Fixed Asset Account = purchase_cost (original cost)

The entry is balanced: Bank + Accum Dep +/- Gain/Loss = Asset Cost.

### 5. AssetRevaluationForm.tsx (Revaluation GL)

After recording the revaluation and updating the asset value, automatically post:
- **Upward revaluation (surplus > 0):**
  - DR Fixed Asset Account = surplus amount
  - CR Revaluation Surplus Account = surplus amount
- **Downward revaluation (deficit < 0):**
  - DR Revaluation Surplus Account = deficit amount
  - CR Fixed Asset Account = deficit amount

### 6. DepreciationRunView.tsx -- Switch to useRunDepreciationWithGL

Replace `import { useRunDepreciation }` with `import { useRunDepreciationWithGL }` and update the variable name. This existing hook already creates proper journal entries (DR Depreciation Expense / CR Accumulated Depreciation) and marks schedule entries as `is_posted: true`.

### 7. FixedAssetForm.tsx -- Fetch Category with GL Accounts

Update the asset creation flow to also fetch the selected category's GL account IDs so they can be passed to the acquisition GL posting logic.

---

## Automation Summary

| Operation | Debit | Credit | Auto? |
|-----------|-------|--------|-------|
| **Acquisition** | Fixed Asset a/c | Bank/Cash a/c | NEW |
| **Depreciation** | Depreciation Expense a/c | Accumulated Depreciation a/c | FIX (switch hook) |
| **Disposal** | Bank + Accum Dep + Loss | Fixed Asset + Gain | NEW |
| **Revaluation Up** | Fixed Asset a/c | Revaluation Surplus a/c | NEW |
| **Revaluation Down** | Revaluation Surplus a/c | Fixed Asset a/c | NEW |

All GL postings use the centralized `createAndPostJournalEntry()` utility which handles:
- Unique entry_number generation
- Debit = Credit validation
- COA balance auto-update
- Company isolation via `company_id`

All postings include graceful fallback: if GL accounts are not configured on the category, the operation still succeeds but shows a warning toast indicating "GL accounts not configured -- no journal entry created."

---

## Technical Details

- **Entry Number Pattern**: `ACQ-{date}-{hash}`, `DSP-{date}-{hash}`, `RVL-{date}-{hash}` following the established convention
- **Category fetch for GL accounts**: The `useCreateFixedAsset` mutation will query `asset_categories` to retrieve GL account IDs when creating an asset
- **AssetRevaluationForm**: Currently uses direct `supabase` calls; GL posting will be added inline after the existing revaluation insert, fetching category GL accounts from the asset's category
- **No new tables required** -- only 3 new columns on `asset_categories`

