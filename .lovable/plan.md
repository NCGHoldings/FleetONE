

# Fix: Special Hire Finance Settings Missing for LIVE Company

## Root Cause

The `special_hire_finance_settings` table only has ONE row — for the **TEST** company (`f40b0a9d...`). The **LIVE** company (`a0000000...`) has **no settings row at all**. When you browse Special Hire on LIVE, `getEffectiveCompanyId()` returns `a0000000...`, the query finds nothing, and the system shows "Finance settings not configured."

This is NOT a network issue — it's a missing database record.

The second error in the console (`Could not find a relationship between 'special_hire_ings' and 'chart_of_accounts'`) is a PostgREST schema cache issue from the new bank detail columns added in the last migration. This resolves by reloading the schema cache.

## What Needs to Happen

### 1. SQL Migration — Insert LIVE company finance settings

Create a `special_hire_finance_settings` row for company `a0000000-0000-0000-0000-000000000001` with the correct LIVE COA account IDs:

| Setting | Account Code | Account Name | LIVE ID |
|---------|-------------|--------------|---------|
| Revenue Internal | 41103002 | TRANSPORT INCOME - SPECIAL HIRES INTERNAL | `51f1c30d-1bb8-4056-b423-82ced47ba3b0` |
| Revenue External | 41103003 | TRANSPORT INCOME - SPECIAL HIRES EXTERNAL | `d28e31b7-52b9-45ad-85aa-e75e7661bad9` |
| Trade Receivable | 12201001 | TRADE RECEIVABLE-EXTERNAL | `a1678110-362a-4e45-8014-350e49620b8f` |
| Customer Advance | 22303001 | CUSTOMER ADVANCES | `ffe5f2b1-c2ad-4598-874d-153852a55646` |
| Default Bank | 13001004 | COMMERCIAL BANK C/A - 1000516089 | `829019e2-e498-4c6e-a616-2423f047a535` |
| VAT Output | 22302001 | VAT PAYABLE | `7f4b14be-19ba-453d-ae83-c93f394f60c9` |
| WHT Payable | 22201007 | WHT PAYABLE | `6fdfcd2d-714e-49cc-9c23-35308247bc79` |
| Commission Expense | 61301010 | SALES COMMISSION | `54f07249-a254-4d12-8d1d-7f68c6a76230` |
| Bank details | Commercial Bank - Nugegoda, A/C 1001077213, NCG EXPRESS (PVT) LTD |

Auto-post flags all enabled. Prefixes: `SPH-INV`, `SPH-ADV`.

### 2. Add new SHS bank account to LIVE COA

The new Commercial Bank Nugegoda account (`1001077213`) needs a COA entry. Add:
- Code: `13001011`
- Name: `COMMERCIAL BANK C/A - 1001077213 (SHS)`
- Type: Asset
- Under the existing bank section

Then update the LIVE finance settings `default_bank_account_id` to point to this new account.

### 3. Notify PostgREST to reload schema cache

Add `notify pgrst, 'reload schema'` at the end of the migration to clear the foreign key relationship cache error.

## Files to modify
- **SQL migration** — Insert LIVE settings row, add new bank COA entry, reload schema cache

## Result
- Special Hire finance on LIVE works immediately — no more "not configured" message
- All GL postings use correct LIVE COA accounts
- New SHS bank account (Commercial Bank 1001077213) is properly tracked in COA
- Past quotations unaffected (point-in-time bank snapshot already in place)

