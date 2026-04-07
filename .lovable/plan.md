

# Fix: Post-Trip Adjustment Leaks to Live GL + Add Accounting Data Transfer Tool

## Problem 1: Test-Mode GL Leakage

The screenshot shows Journal Entries like `SPH-ADJ-QUO-2026-1724-v1.0` hitting the **LIVE** "TRANSPORT INCOME - SPECIAL HIRES EXTERNAL" account (41103003). These were created from the test environment because **4 Special Hire components hardcode `NCG_HOLDING_ID`** for GL posting instead of using the effective company ID from context.

### Affected components (all hardcode `NCG_HOLDING_ID`):

| File | Lines | What it does |
|---|---|---|
| `PostTripAdjustmentModal.tsx` | 281-297 | Posts adjustment JE to live GL |
| `GenerateBalanceInvoiceModal.tsx` | 443, 470, 506, 520, 566, 590 | Posts invoice, advance apply, discount JEs to live GL |
| `TripStatusManagementModal.tsx` | 97, 106 | Posts refund JE to live GL |
| `EnhancedTripStatusManagementModal.tsx` | 142-152 | Posts refund JE to live GL |

### Fix

Each component needs to accept or derive the effective company ID from context instead of importing and using `NCG_HOLDING_ID` directly:

1. **PostTripAdjustmentModal** -- Accept `effectiveCompanyId` as a prop (the parent `TripDetailsModal`/`ConfirmedTripsTable` already has `useCompany()` context). Pass it through to all GL functions.

2. **GenerateBalanceInvoiceModal** -- Accept `effectiveCompanyId` as a prop. Replace all 6 instances of `NCG_HOLDING_ID` with this prop.

3. **TripStatusManagementModal** -- Accept `effectiveCompanyId` prop. Replace 2 instances.

4. **EnhancedTripStatusManagementModal** -- Accept `effectiveCompanyId` prop. Replace 2 instances.

5. **All parent components** that render these modals (mainly `ConfirmedTripsTable.tsx`) -- pass `getEffectiveCompanyId()` as the prop value.

This ensures:
- When user is in test mode (NCG Test company selected), GL posts go to the test company GL
- When user is in live mode (NCG Holding selected), GL posts go to live GL
- No behavior change for live users

---

## Problem 2: Accounting Data Transfer Tool (Live to Test and Test to Live)

### What it does

A new **"Data Transfer"** button in the Test Mode banner (and also accessible from Settings) that lets admins copy accounting data between live and test environments. Scope: accounting data only (customers, vendors, invoices, payments, receipts, JEs, bank transactions, COA).

### Architecture

An **Edge Function** (`transfer-accounting-data`) that:
1. Accepts `{ direction: 'live_to_test' | 'test_to_live', mode: 'clear_then_copy' | 'merge', tables: string[] }`
2. Uses the **service role key** (server-side only) to bypass RLS
3. Copies data between the two company_id sets:
   - Live: `a0000000-0000-0000-0000-000000000001` (NCG Holding)
   - Test: `f40b0a9d-ae5b-41b3-9188-535ae94c9020` (NCG Test)
4. For each table, reads rows from source company, remaps `company_id` to target, and inserts
5. For "clear_then_copy" mode, deletes target company data first
6. Returns a summary of rows copied per table

### UI

Add to `TestModeBanner.tsx`:
- A **"Transfer Data"** button next to "Clear Test Data"
- Opens a dialog with:
  - Direction toggle: "Live → Test" or "Test → Live"
  - Collision mode: "Clear & Replace" or "Merge (skip conflicts)"
  - Table checklist (pre-checked): Customers, Vendors, COA, JEs, AR Invoices, AP Invoices, AR Receipts, AP Payments, Bank Accounts, Bank Transactions
  - Confirmation with warning text
  - Progress indicator

### Tables to transfer (in dependency order):

```text
1. chart_of_accounts (COA structure + balances)
2. customers
3. vendors
4. bank_accounts
5. journal_entries → journal_entry_lines
6. ar_invoices → ar_invoice_lines
7. ap_invoices → ap_invoice_lines
8. ar_receipts → ar_receipt_allocations
9. ap_payments → ap_payment_allocations, ap_payment_lines
10. bank_transactions
```

### Safety guards

- Requires `super_admin` role (verified server-side)
- "Test → Live" direction shows an extra red warning: "This will write to production data"
- ID remapping: generates new UUIDs for target records to avoid PK conflicts; maintains internal FK relationships via an ID mapping table during the copy
- COA accounts are matched by `account_code` (not ID) to link correctly across environments
- Logs every transfer operation for audit

## Files

### Fix 1 (GL isolation):
- **Modify**: `src/components/special-hire/PostTripAdjustmentModal.tsx` -- accept + use `effectiveCompanyId` prop
- **Modify**: `src/components/special-hire/GenerateBalanceInvoiceModal.tsx` -- accept + use `effectiveCompanyId` prop
- **Modify**: `src/components/special-hire/TripStatusManagementModal.tsx` -- accept + use `effectiveCompanyId` prop
- **Modify**: `src/components/special-hire/EnhancedTripStatusManagementModal.tsx` -- accept + use `effectiveCompanyId` prop
- **Modify**: `src/components/special-hire/ConfirmedTripsTable.tsx` -- pass `getEffectiveCompanyId()` to all modal props

### Fix 2 (Transfer tool):
- **New**: `supabase/functions/transfer-accounting-data/index.ts` -- edge function for server-side data copy
- **Modify**: `src/components/accounting/TestModeBanner.tsx` -- add Transfer Data button + dialog UI

