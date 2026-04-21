

# Fix: GL data routed to wrong company COA + AP Payments visibility for Direct Payments

## Root causes (3 connected bugs)

### Bug 1: Cross-company COA contamination
- The "Pay From Account" dropdown in the import page (`SchoolBusExpenseImport.tsx`) queries `chart_of_accounts` **without filtering by `company_id`**, so it returns accounts from every company in the database.
- In Test mode the user actually selected `FUEL FLOAT - DIALOG TOUCH_SBS` belonging to **NCG Holding** (`a0000000…`), then the JE was written under **NCG Test** (`f40b0a9d…`).
- Result: the Holding-side FUEL FLOAT visibly updated (image 2), but the Test-side `VEHICLE FUEL` account did receive the debits (`current_balance` is now Rs 1,858,144) — yet the COA tree only ever shows NCG Holding's COA, so the user sees the stale Holding `VEHICLE FUEL` (Rs 54,900) and thinks nothing posted.

### Bug 2: COA tree is hardcoded to NCG Holding
- `src/components/accounting/ChartOfAccountsView.tsx` line 25: `const effectiveCompanyId = NCG_HOLDING_ID;` — overrides the company context, so Test-mode users always look at Holding's COA. New entries posted under NCG Test never appear in the drill-down they open.

### Bug 3: Direct Payments are invisible in AP → Payments
- "Direct Payment" mode skips `ap_invoices` *and* `ap_payments`, so the AP Payments listing never shows the fuel float spend. User wants every cash outflow visible in AP Payments for traceability.

## What I'll change

### Fix 1 — Filter the "Pay From Account" dropdown by the active GL company
File: `src/pages/SchoolBusExpenseImport.tsx`
- Add `.eq("company_id", effectiveCompanyId)` to the `chart_of_accounts` fetch in `initData` so only the accounts belonging to the user's GL universe are shown.
- Add same scoping to the petty-cash funds and vendors queries (defensive — same risk).

### Fix 2 — Make ChartOfAccountsView respect company context
File: `src/components/accounting/ChartOfAccountsView.tsx`
- Replace the hardcoded `const effectiveCompanyId = NCG_HOLDING_ID;` with `const effectiveCompanyId = getEffectiveCompanyId();` from `useCompany()`. Falls back to NCG Holding only if nothing is selected.
- Same query-key change so React Query refetches when company switches.

### Fix 3 — Validate company match before posting (guard rail)
File: `src/hooks/useSchoolBusBulkExpenses.ts`
- Before writing JE lines, verify both `defaultFuelAccountId` and `creditAccountId` belong to `effectiveCompanyId`. If either doesn't, abort with a clear error: *"Selected account belongs to a different company. Pick an account from the current company's COA."*
- This stops the silent cross-company posting permanently.

### Fix 4 — Surface Direct Payments in AP → Payments (the main UX request)
File: `src/hooks/useSchoolBusBulkExpenses.ts`
- After the JE is posted in the `direct` branch, also insert one consolidated `ap_payments` row per import batch:
  - `payment_number`: `DP-FUEL-{date}-{seq}` via the existing numbering pattern
  - `vendor_id`: null (Direct Payment without vendor)
  - `payee_type`: `'direct'`
  - `payment_method`: `'direct'`
  - `bank_account_id`: null (since the source is a float account, not a bank — store the float account id in `notes`/`reference`)
  - `is_direct_payment`: true
  - `amount` / `total_with_fees`: sum of the batch
  - `journal_entry_id`: null at batch level (each row's JE is per-bus); store the batch JE list in `notes` for traceability
  - `status`: `paid`, `approval_status`: `approved`
  - `business_unit_code`: `SBO`, `company_id`: `effectiveCompanyId`
  - `notes`: includes "Bulk fuel float drawdown — N buses, source: <float account name>"

  Optional alternative (cleaner): create one `ap_payments` row **per bus** linked to that bus's JE — this makes the per-bus drill-down work in AP Payments. I'll go with this per-bus option since it preserves audit trail and matches existing AP Payments UX.

- Result: every Direct Payment now appears in the AP → Payments tab with a "Direct" payment method badge, full amount, bus reference, and a click-through to the JE.

### Fix 5 — Display "Direct" payment method label in the AP Payments table
File: `src/components/accounting/APPaymentsView.tsx` (or wherever the method column renders)
- Add a `'direct'` case to the payment-method label/badge mapping so it renders as **"Direct (Float)"** instead of "—".

## Files touched

| File | Purpose |
|---|---|
| `src/pages/SchoolBusExpenseImport.tsx` | Scope COA + petty cash + vendor fetches to `effectiveCompanyId` |
| `src/components/accounting/ChartOfAccountsView.tsx` | Respect company context instead of hardcoding NCG Holding |
| `src/hooks/useSchoolBusBulkExpenses.ts` | Cross-company guard + per-bus `ap_payments` insertion in `direct` branch |
| `src/components/accounting/APPaymentsView.tsx` | Render "Direct (Float)" label for the new method |

## What you'll see after the fix

1. **In Test mode**, the COA tree now shows NCG Test's accounts (including the correct `VEHICLE FUEL` with the real Rs 1,858,144 balance and 76 transactions).
2. The "Pay From Account" dropdown only lists accounts that belong to the active GL company — no more cross-company selection.
3. If anyone tries to post against a foreign-company account, the import is blocked with a clear error.
4. Every "Direct Payment" fuel batch now creates `ap_payments` rows visible at **/accounting → AP → Payments**, one per bus, marked **Direct (Float)**, showing amount, bus, date, and a link to the JE.
5. AP Payments KPIs ("Payments Today", "This Month") now correctly include float-funded fuel spend.

## Out of scope (mention if you want them next)
- Backfill: re-tag the existing 76 mis-routed JE lines so they show under the correct COA tree. Needs a one-time SQL migration once you confirm which company they should belong to.
- Cleaning the duplicate `61204003` accounts (one in Holding, one in Test) — both can stay if intentional, but worth a separate review.
- Same Direct Payment visibility for the manual single-bus expense form.

