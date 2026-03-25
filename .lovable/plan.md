

# Fix AR/AP Auto GL Posting Across All Modules + Full Flow Diagram

## Current State Analysis

After thorough code review, here is the complete status of every invoice creation point in the system:

### AR Invoice Creation Points

| Source | File | GL at Create? | GL at Approve? | Category Resolution? | Status |
|--------|------|:---:|:---:|:---:|--------|
| Manual AR (Accounting module) | `useAccountingMutations.ts` L395-428 | YES | N/A | YES (customer category) | OK |
| School Bus bulk AR | `useSchoolBusFinance.ts` L627-650 | YES (separate JE) | N/A | Uses branch settings | OK |
| School Bus backfill AR | `useSchoolBusFinance.ts` L1152-1169 | NO | N/A | NO | MISSING |
| Special Hire AR | `useSpecialHireFinance.ts` L1550-1568 | Passed from caller | N/A | NO (uses SPH settings) | PARTIAL |
| Vehicle Sales AR (YUT/SNT/LTV) | `useVehicleSalesFinance.ts` L272-291 | NO | YES (at approval) | YES (at approval) | OK per user choice |
| `useCompanyMutations.ts` AR | L85-148 | NO | N/A | NO | MISSING |

### AP Invoice Creation Points

| Source | File | GL at Create? | Category Resolution? | Status |
|--------|------|:---:|:---:|--------|
| Manual AP (Accounting module) | `useAccountingMutations.ts` L765-813 | YES | YES (vendor category) | OK |
| Manual AP Approval | `useAccountingMutations.ts` L1685-1751 | GUARD (skip if exists) | YES (vendor category) | OK |
| Fuel Expense AP | `useFuelExpenseFinance.ts` L242-258 | YES (linked JE from expense) | Uses fuel settings | OK |
| Maintenance AP | `useMaintenanceFinance.ts` L311-332 | YES (linked JE from maint) | Uses maintenance settings | OK |
| Expense Request AP | `useExpenseRequestFinance.ts` L337-360 | YES (linked JE from expense) | Uses expense mappings | OK |
| Leasing AP | `useLeasingFinance.ts` L156-175 | NO | Uses leasing settings | MISSING |
| `useCompanyMutations.ts` AP | L243-285 | NO | NO | MISSING |

### Key Gaps to Fix

1. **`useCompanyMutations.ts` - `useCompanyCreateARInvoice`**: No GL posting, no category resolution. This is a legacy hook -- need to add GL posting matching `useAccountingMutations.ts` pattern.
2. **`useCompanyMutations.ts` - `useCompanyCreateAPInvoice`**: No GL posting, no category resolution. Same fix needed.
3. **Leasing AP Invoice** (`useLeasingFinance.ts` L156-175): Creates AP invoice without `journal_entry_id` link. The GL is posted separately on payment, but the invoice itself has no JE at creation.
4. **School Bus Backfill AR** (`useSchoolBusFinance.ts` L1152-1169): Creates AR invoices without GL posting (backfill scenario -- acceptable since these are historical).

## Plan

### File 1: `src/hooks/useCompanyMutations.ts`

**`useCompanyCreateARInvoice` (lines 85-148)**: Add auto GL posting after insert, same pattern as `useAccountingMutations.ts`:
- Import `resolveCustomerARAccounts` from `useCustomerCategories`
- After line insert, resolve customer category for AR/revenue accounts
- Fall back to `gl_settings.trade_receivable_account_id` / `sales_revenue_account_id`
- Call `postARInvoiceToGL()` from `gl-posting-utils.ts`
- Link `journal_entry_id` back to `ar_invoices` record
- Add `journal-entries` and `chart-of-accounts` to `onSuccess` invalidation

**`useCompanyCreateAPInvoice` (lines 243-285)**: Add auto GL posting after insert:
- Import `resolveVendorAPAccounts` from `useVendorCategories`
- After insert, resolve vendor category for AP/expense accounts
- Call `postAPInvoiceToGL()` from `gl-posting-utils.ts`
- Link `journal_entry_id` back to `ap_invoices` record
- Add `journal-entries` and `chart-of-accounts` to `onSuccess` invalidation

### File 2: `src/hooks/useLeasingFinance.ts`

**`createLeasingAPInvoice` (lines 130-211)**: The GL JE is already created separately in `postLeasingPaymentToGL`. However, the AP invoice created here does not link a JE. This is by design (leasing GL posts at payment time, not at invoice creation). No change needed -- the leasing payment flow handles GL correctly.

### File 3: Update Flow Diagram

Create/update `src/components/accounting/InvoiceGLFlowDiagram.tsx` with a comprehensive flow showing all modules and their GL posting behavior.

### File 4: Generate Mermaid Diagram

Create a comprehensive Mermaid diagram at `/mnt/documents/gl-posting-flow.mmd` showing:

```text
Organization Structure:
  NCG Holding (Parent)
    ├── SBO (School Bus) ─── AR: GL at bulk create
    ├── YUT (Yutong) ────── AR: GL at approval
    ├── SNT (Sinotruck) ──── AR: GL at approval
    ├── LTV (Light Vehicle) ─ AR: GL at approval
    ├── SPH (Special Hire) ── AR: GL at create (via caller)
    └── FLEET (Leasing) ──── AP: GL at payment
  NCG Express (Standalone)
    └── NCGE ─────────────── Revenue/Expense GL at posting

Manual AR/AP Flow:
  Create Invoice → Resolve Category (3-tier) → Post GL → Link JE
  Approve Invoice → Check journal_entry_id → Skip if exists
```

## Summary of Changes

- Fix 2 legacy hooks in `useCompanyMutations.ts` to auto-post GL with category resolution
- Build comprehensive Mermaid flow diagram covering all companies and modules
- Update the InvoiceGLFlowDiagram component with complete cross-module status
- All other modules (manual AR/AP, fuel, maintenance, expense, vehicle sales, special hire, school bus) are already correctly posting GL

