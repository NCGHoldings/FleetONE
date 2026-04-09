

# Fix All Numbering — Sync, Automate, and Make Continuous

## Problems Found

### 1. `next_number` is massively out of sync with actual records

| Entity | Actual Records | `next_number` | Gap |
|--------|---------------|---------------|-----|
| customer | 63 | 31 | Behind by 32 |
| vendor | 46 | 101 | OK-ish (some imported) |
| ar_invoice | 673 | 102 | Behind by 571 |
| ap_invoice | 104 | 1 | Behind by 103 |
| journal | 1,620 | 27 | Behind by 1,593 |
| payment | 74 | 25,680 | Way ahead |
| receipt | 40 | 20 | Behind by 20 |
| item | 2 | 17 | Ahead |

This means every time you open a form, the generated number could collide with an existing record, or the sequence is jumping randomly.

### 2. Banking forms have NO auto-numbering at all
These forms require manual reference entry or skip numbering entirely:
- **BankTransactionForm** — no reference auto-generation
- **BankFeeForm** — no reference auto-generation
- **InterBankTransferForm** — reference is optional/manual
- **FundTransferForm** — reference is optional/manual

### 3. Two separate Customer/Vendor creation paths
- `CustomerForm.tsx` uses `useGenerateNumber` correctly
- `CustomerMasterView.tsx` ALSO has its own inline form with `useGenerateNumber`
- Both work, but the `next_number` counter is behind actual records

## Plan

### Step 1: Database migration to sync all `next_number` values
Write a SQL migration that:
- For each entity type, queries the actual highest existing number from the relevant table
- Sets `next_number` to `MAX(extracted_sequence) + 1`
- For entities where numbers contain prefixes (like `CUST-2026-0030`), extract the trailing numeric portion
- Add new numbering sequence rows for missing entity types: `bank_transaction`, `bank_fee`, `inter_bank_transfer`, `fund_transfer`

### Step 2: Add auto-numbering to banking forms
- **BankTransactionForm.tsx** — add `useGenerateNumber("bank_transaction")`, auto-fill reference field, make it read-only
- **BankFeeForm.tsx** — add `useGenerateNumber("bank_fee")`, auto-fill a reference/number field
- **InterBankTransferForm.tsx** — add `useGenerateNumber("inter_bank_transfer")`, auto-fill reference field
- **FundTransferForm.tsx** — add `useGenerateNumber("fund_transfer")`, auto-fill reference field

### Step 3: Make number fields read-only on all create forms
Ensure all forms that generate numbers set the field to `readOnly` so users cannot manually type over the auto-generated value. This is already done in some forms (CustomerForm, CustomerMasterView) but should be consistent everywhere.

### Step 4: Add `entityTypeLabels` entries for new types
Update `useNumbering.ts` to include labels for the 4 new banking entity types so they appear properly in NumberingSettings.

## Files to Change

- **New SQL migration** — sync all `next_number` values to actual max + 1; insert 4 new numbering sequences for banking entities
- **`src/hooks/useNumbering.ts`** — add 4 new entity type labels
- **`src/components/accounting/BankTransactionForm.tsx`** — add auto-numbering for reference
- **`src/components/accounting/BankFeeForm.tsx`** — add auto-numbering for reference
- **`src/components/accounting/InterBankTransferForm.tsx`** — add auto-numbering for reference
- **`src/components/accounting/FundTransferForm.tsx`** — add auto-numbering for reference

## Result

- All `next_number` values correctly synced to actual data — no duplicates, no gaps
- All 22+ entity types have continuous, automated numbering
- Banking forms no longer require manual reference entry
- Numbers always start from the correct next value and increment perfectly
- NumberingSettings UI shows all entity types including banking ones

