

# Recommendation: Separate Test Company (Safest Approach)

## Why This Is Best

Your system already isolates everything by `company_id`. Instead of modifying every table with tags or building complex toggles, we simply create a **mirror test company** with the same COA. This means:

- **Zero risk to live data** — test and live are completely separate database records
- **No schema changes** — no new columns on any existing table
- **Existing company switcher** works as the toggle — just switch to "NCG Test" to test, switch back to "NCG Holding" for live
- **Clear test data** = one button that deletes all transactions for the test company, keeping COA intact

## What Gets Created

```text
EXISTING (LIVE)                    NEW (TEST)
─────────────────                  ─────────────────
NCG Holding (Pvt) Ltd              NCG Test Environment
├── School Bus Operations          ├── Test School Bus
├── Yutong Sales                   ├── Test Yutong
├── Sinotruck Sales                ├── Test Sinotruck
├── Special Hire                   ├── Test Special Hire
└── Light Vehicle Sales            └── Test Light Vehicle
```

## Implementation Steps

### 1. Create test companies (DB migration)
- Insert "NCG Test Environment" as parent with `business_unit_type: 'test'`
- Insert 5 sub-companies mirroring the live ones, each with same `business_unit_type` but prefixed "Test"
- Copy all COA records from NCG Holding to the test parent company
- Copy GL settings from NCG Holding to the test parent

### 2. Add visual indicator in UI
- In `CompanySwitcher.tsx`: Add a 🧪 icon and orange/yellow badge for test companies
- In the main layout or accounting page header: Show a prominent **"TEST MODE"** banner when any test company is selected
- This prevents confusion between test and live

### 3. Add "Clear Test Data" button
- New component in Settings or Accounting page
- Only visible when a test company is selected
- Clears all finance transactions for the test company:
  - `journal_entries`, `journal_entry_lines`
  - `ar_invoices`, `ar_receipts`, `ar_receipt_allocations`
  - `ap_invoices`, `ap_payments`, `ap_payment_allocations`
  - `bank_transactions`, `cashbook_entries`
  - `customers`, `vendors` (test ones only)
  - Yutong/Sinotruck/LV orders and payments (test company linked)
- Resets COA balances to zero
- Does **NOT** delete COA accounts or GL settings

### 4. Protect live data
- The "Clear Test Data" button checks `business_unit_type = 'test'` on the parent company before allowing any deletion
- If someone tries to clear data on a non-test company, it refuses

## Files to Create/Modify

1. **Migration SQL** — Create test companies + copy COA + copy GL settings
2. `src/components/accounting/CompanySwitcher.tsx` — Add test company icon/styling
3. `src/components/accounting/TestModeBanner.tsx` — New banner component
4. `src/components/settings/ClearTestDataButton.tsx` — New clear data component
5. `src/contexts/CompanyContext.tsx` — Add `isTestCompany` helper flag

## How You Use It

1. Open Finance & Accounting
2. Click company switcher → select "NCG Test Environment" or any "Test" sub-company
3. Orange "TEST MODE" banner appears at top
4. Do all your testing — create orders, payments, invoices, JEs
5. When done testing, click "Clear Test Data" to wipe everything
6. Switch back to "NCG Holding" for real/live work — completely untouched

