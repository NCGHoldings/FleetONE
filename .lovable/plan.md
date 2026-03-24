

# Fix AR/AP Invoice GL Posting: Always Hit GL & COA + Vendor Category Resolution

## Current State

| Action | GL Posted? | Uses Category? | Issue |
|--------|-----------|----------------|-------|
| AR Invoice Create (manual) | Yes | Yes (customer category) | Correct |
| AP Invoice Create (manual) | **NO** | N/A | **Missing GL posting** |
| AP Invoice Approve | Yes | **NO** (global only) | **Missing vendor category** |
| AP Invoice Create (auto from expense/fuel) | No | No | Missing GL posting |

## Problems to Fix

1. **AP invoices never hit GL at creation** -- only on approval, and many AP invoices skip approval
2. **AP approval GL posting ignores vendor categories** -- uses only `gl_settings.default_expense_account_id` instead of the 3-tier resolution (line > vendor category > global)
3. **No double-posting guard** -- if we add GL posting at creation, approval must check `journal_entry_id` before posting again

## Plan

### File 1: `src/hooks/useAccountingMutations.ts`

**`useCreateAPInvoice` (lines 692-777)** -- Add auto GL posting after insert (same pattern as AR):
- Import and call `resolveVendorAPAccounts(vendor_id, companyId)` to get expense/AP accounts from vendor category
- Fall back to `gl_settings.trade_payable_account_id` and `gl_settings.default_expense_account_id` if category has no mapping
- Build expense lines from `ap_invoice_lines` (using per-line `account_id` when set, else category expense account, else global default)
- Call `postAPInvoiceToGL()` with resolved accounts
- Link `journal_entry_id` back to the AP invoice record
- Invalidate `journal-entries` and `chart-of-accounts` query keys in `onSuccess`

**`useApproveAPInvoice` (lines 1623-1700)** -- Add double-posting guard:
- Before GL posting, check if `ap_invoices.journal_entry_id` already exists
- If it does, skip GL posting (already posted at creation)
- If not (legacy invoices created before this fix), proceed with existing GL posting but use vendor category resolution instead of global-only

**`useApproveAPInvoice` GL account resolution (lines 1651-1659)** -- Replace global-only lookup:
- Import `resolveVendorAPAccounts` from `useVendorCategories`
- Use resolved `apAccountId` for Trade Payable (fallback to `gl_settings.trade_payable_account_id`)
- Use resolved `expenseAccountId` for default expense (fallback to `gl_settings.default_expense_account_id`)

### File 2: `src/hooks/useCompanyMutations.ts`

Check the AP invoice creation here too and add the same GL posting pattern if missing.

### No changes needed:
- `src/lib/gl-posting-utils.ts` -- `postAPInvoiceToGL` already supports multi-line expense entries and works correctly
- `src/hooks/useVendorCategories.ts` -- `resolveVendorAPAccounts` already implements the 3-tier resolution

## Flow Diagram

Will generate a Mermaid diagram showing the complete AR/AP invoice flow:

```text
AR Invoice Create --> Resolve Customer Category --> Post GL (DR Receivable / CR Revenue) --> Link JE
AP Invoice Create --> Resolve Vendor Category --> Post GL (DR Expense / CR Payable) --> Link JE
AP Invoice Approve --> Check journal_entry_id --> Skip if exists / Post if missing
```

## Summary

- AP invoices will hit GL/COA immediately at creation (matching AR behavior)
- Vendor category GL mappings will be used (3-tier: line > category > global)
- Double-posting guard on approval prevents duplicate journal entries
- All invoice types (manual + auto) follow the same GL posting standard

