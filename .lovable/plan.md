

# Landed Cost Complete Flow — Diagram + Gap Analysis

## Current State Assessment

After reviewing the codebase, here is what exists and what is **missing**:

### What EXISTS
- **3 database tables**: `landed_cost_vouchers`, `landed_cost_items`, `landed_cost_charges`
- **CRUD hooks**: Create voucher with items + charges, list/filter vouchers
- **Allocation logic**: By Value (proportional) and By Quantity (equal split); By Weight is a placeholder (same as quantity)
- **UI**: List view with status badges, search, dropdown actions
- **Item categories** have `inventory_account_id` and `cogs_account_id` columns (ready for GL mapping)
- **Charges** have `expense_account_id` FK to `chart_of_accounts`

### What is MISSING (Critical Gaps)

| Gap | Impact |
|-----|--------|
| **No `journal_entry_id`** on `landed_cost_vouchers` table | Cannot link voucher to GL — violates Rule 6 (persistent linkage) |
| **No GL posting logic** | "Post to GL" button exists in UI but does nothing — zero double-entry |
| **No item valuation update** | `items.standard_cost` never updated with landed cost — items show wrong cost |
| **No vendor linkage** on charges | Charges have no `vendor_id` — cannot track which vendor provided freight/customs/etc |
| **No AP Invoice creation** for charges | Charges like freight, customs duty should optionally create AP Invoices for the charge vendor |
| **No business_unit_code** on voucher | Violates consolidated GL isolation standard |
| **No COA balance update** | Even if JE were created, COA balances would not be adjusted |
| **No source_module tagging** | Violates Rule 3 (mandatory source_module on JEs) |

## Plan

### 1. Database Migration — Add missing columns

```sql
-- Add journal_entry_id to landed_cost_vouchers
ALTER TABLE landed_cost_vouchers 
  ADD COLUMN journal_entry_id uuid REFERENCES journal_entries(id),
  ADD COLUMN business_unit_code text;

-- Add vendor_id to landed_cost_charges (who provided the charge)
ALTER TABLE landed_cost_charges 
  ADD COLUMN vendor_id uuid REFERENCES vendors(id);
```

### 2. Create Landed Cost GL Posting Logic

New function `usePostLandedCostToGL` in `useInventoryEnhanced.ts`:

When "Post to GL" is clicked on a draft voucher:

**Double-Entry per Charge:**
```text
For each charge in landed_cost_charges:
  DR  Inventory Account (from item_category.inventory_account_id)  — charge amount
  CR  Expense/Payable Account (charge.expense_account_id)          — charge amount
```

This increases the item's inventory valuation and credits the source (expense account or AP if vendor-linked).

**Steps:**
1. Validate all charges have `expense_account_id` set
2. Resolve inventory account from `item_categories.inventory_account_id` for each item
3. Build balanced JE lines (DR inventory / CR expense per charge, allocated proportionally)
4. Create journal entry via `createAndPostJournalEntry` with `source_module: 'landed_cost'`
5. Link `journal_entry_id` back to voucher
6. Update `items.standard_cost` with new `final_cost` from `landed_cost_items`
7. Update COA balances
8. Set voucher status to `posted`

### 3. Wire "Post to GL" Button in UI

In `LandedCostView.tsx`, the existing dropdown "Post to GL" item will call the new posting mutation with confirmation dialog.

### 4. Create Mermaid Diagram

File: `/mnt/documents/Landed_Cost_Complete_Flow.mmd`

Covering:
- Full procurement chain (PR → PO → GRN → LCV)
- Database schema with PKs/FKs
- All 3 allocation methods
- Double-entry journal entries with GL account codes
- Item valuation update flow
- Status lifecycle (Draft → Posted → Cancelled)
- Integration with AP (optional vendor charges)

### Files to modify
- **Migration**: Add `journal_entry_id`, `business_unit_code` to `landed_cost_vouchers`; `vendor_id` to `landed_cost_charges`
- **`src/hooks/useInventoryEnhanced.ts`**: Add `usePostLandedCostToGL` mutation
- **`src/components/accounting/inventory/LandedCostView.tsx`**: Wire Post button with confirmation + show RelatedJournalEntries
- **Create**: `/mnt/documents/Landed_Cost_Complete_Flow.mmd`

### Result
- Landed cost posting creates proper balanced JEs (DR Inventory / CR Expense)
- Item standard_cost updated with landed cost allocation
- Full audit trail: voucher → JE → COA balance
- Source module tagged as `landed_cost`
- Business unit isolation maintained
- Diagram documents the complete flow

