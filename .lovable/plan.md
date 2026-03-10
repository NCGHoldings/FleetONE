

# Fix School Bus Business Unit Tagging + Payment AR Sync

## Root Cause Found

Database evidence confirms the bug: the two newest School Bus invoices and journal entries have `business_unit_code: 'LTV'` instead of `'SBO'`. This happened because `getBusinessUnitCode()` returns whatever sub-company is currently active in the company switcher — if the user had "Light Vehicles" selected while creating School Bus invoices, they get tagged 'LTV'.

```text
CURRENT (BROKEN):
  Company Switcher = "Light Vehicles (LTV)"
  → getBusinessUnitCode() = 'LTV'
  → School Bus invoice created with business_unit_code = 'LTV'  ← WRONG
  → Invoice invisible under "School Bus Operations" view

FIXED:
  School Bus code ALWAYS hard-codes 'SBO'
  → Invoice always visible under "School Bus Operations" view
```

## Changes

### 1. Hard-code 'SBO' in all School Bus finance functions (`src/hooks/useSchoolBusFinance.ts`)

Replace every `businessUnitCode || 'SBO'` with just `'SBO'`. The School Bus module must always tag its records as SBO regardless of company switcher state.

Affected functions:
- `useGenerateBulkARInvoices` — customers, journal entries, journal lines, AR invoices, advance JEs
- `usePostPaymentToGL` — journal entries, journal lines, customers, AR receipts
- `useBackfillARInvoiceLinks` — customers, AR invoices

### 2. Hard-code 'SBO' in RecordPaymentModal AR sync (`src/components/school/RecordPaymentModal.tsx`)

Same fix for the customer creation fallback in the payment sync flow.

### 3. Fix existing bad data (SQL migration)

Update the 2 incorrectly tagged AR invoices and journal entries:
```sql
UPDATE ar_invoices SET business_unit_code = 'SBO' WHERE invoice_number LIKE 'SBS-%' AND business_unit_code != 'SBO';
UPDATE journal_entries SET business_unit_code = 'SBO' WHERE description LIKE 'School Bus%' AND business_unit_code != 'SBO';
UPDATE customers SET business_unit_code = 'SBO' WHERE customer_code LIKE 'SBS-%' AND business_unit_code != 'SBO';
UPDATE ar_receipts SET business_unit_code = 'SBO' WHERE notes LIKE 'School Bus%' AND business_unit_code != 'SBO';
```

### 4. Payment AR auto-update verification

The payment-to-AR-invoice sync in `RecordPaymentModal.tsx` (lines 127-201) already updates `ar_invoices.paid_amount`, `balance`, and `status` after each payment. This is working correctly — confirmed by the existing paid invoice (`SBS-INV-202602-00001` shows `status: paid, paid_amount: 6200`). The only issue was the wrong business unit tag preventing visibility.

## Files to Edit
- `src/hooks/useSchoolBusFinance.ts` — Replace all `businessUnitCode || 'SBO'` with `'SBO'`
- `src/components/school/RecordPaymentModal.tsx` — Same fix for customer creation
- New SQL migration — Fix existing incorrectly tagged records

