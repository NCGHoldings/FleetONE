
# Fix: Katunayaka AR invoices still empty in LIVE while COA updates

## What’s actually wrong now

I cross-checked the code and live DB. There are 2 separate Katunayaka problems:

1. **Katunayaka’s latest broken batch was posted into TEST company IDs**
   - `school_ar_invoice_batches` on **2026-04-21** for Katunayaka was saved with `company_id = NCG Test parent (f40b...)`
   - its JE was also created under **NCG Test**
   - the school invoice `SBS-INV-202604-01142` has **`ar_invoice_id = NULL`**
   - result: **COA can move**, but **AR invoice list stays empty** because no Finance AR row exists in LIVE

2. **Older Katunayaka AR rows are hidden by the AR list filter**
   - Katunayaka school invoices from **2026-04-09** already have linked `ar_invoice_id`s
   - but those linked `ar_invoices` live under **NCG Test company_id**
   - and the AR list uses brittle fallback logic based on invoice-number prefixes (`SBS-%`)
   - meanwhile **live “School Bus Operations” has no `short_code`**, so it does not auto-resolve `SBO` cleanly
   - result: even valid SBO invoices can stay invisible if their numbers are like `INV-NCGH-*`

## What I’ll change

### 1. Add a dedicated School Bus posting-context resolver
In `src/hooks/useSchoolBusFinance.ts`, stop using raw `selectedCompanyId` directly for School Bus finance posting.

I’ll add a resolver that determines:
- **operational company id** = School Bus child company
  - LIVE: `School Bus Operations` (`a000...0002`)
  - TEST: `Test School Bus` (`0fba...`)
- **effective GL company id**
  - LIVE: `NCG Holding` (`a000...0001`)
  - TEST: `NCG Test` (`f40b...`)
- **business unit code** = always `SBO`

Then I’ll use that resolver in:
- `useBranchFinanceSettings`
- `useGenerateBulkARInvoices`
- `usePostPaymentToGL`
- `useBackfillARInvoiceLinks`

This prevents Katunayaka from writing batches/JEs/AR into the wrong company just because the current selector/context drifted.

### 2. Fix AR invoice visibility logic for School Bus
In `src/contexts/CompanyContext.tsx` and `src/hooks/useAccountingData.ts`:

- add a fallback business-unit mapping when `short_code` is missing
  - `school_bus -> SBO`
  - `special_hire -> SPH`
  - `yutong -> YUT`
  - `sinotruck -> SNT`
  - `light_vehicle -> LTV`
- update `useARInvoices()` to prefer **`business_unit_code = SBO`** for School Bus sub-company views
- keep invoice-number prefix filtering only as a legacy last-resort, not the main rule

This ensures School Bus AR shows all SBO invoices regardless of numbering pattern (`SBS-*` or `INV-NCGH-*`).

### 3. Unify customer resolution for School Bus AR + payment sync
Create one shared helper in `src/hooks/useSchoolBusFinance.ts` for branch finance customer resolution:
- Katunayaka -> `SBS-LKA`
- Nuwara Eliya -> `SBS-NUW`
- etc.

Use the same helper in:
- bulk AR generation
- orphan/backfill linking
- payment-time sync when `ar_invoice_id` is missing

This restores the rule:
- **invoice created -> linked Finance AR exists**
- **student payment -> same AR invoice auto-updates to partial/paid**

### 4. Add a targeted migration for Katunayaka only
Create a new migration to safely fix only Katunayaka’s broken records.

The migration will:

#### A. normalize finance settings
- move/copy Katunayaka School Bus finance settings from **Test School Bus company** to the correct **live School Bus company**
- preserve the current correct Holding COA account IDs

#### B. repair broken 2026-04-21 records
- find Katunayaka `school_ar_invoices` with `ar_invoice_id IS NULL`
- create missing `ar_invoices` in **NCG Holding**
- link them back into `school_ar_invoices.ar_invoice_id`

#### C. migrate wrongly-posted Katunayaka finance rows from TEST to LIVE hierarchy
for Katunayaka-linked historical School Bus finance records:
- move `school_ar_invoice_batches.company_id` to live School Bus company
- move `ar_invoices.company_id` to NCG Holding
- move `journal_entries.company_id` to NCG Holding
- align `journal_entry_lines.company_id` to NCG Holding
- preserve `business_unit_code = 'SBO'`
- keep existing JE/account links intact

This is the key step that makes Katunayaka history visible in LIVE AR without touching branches that already work.

### 5. Harden against future silent damage
Before posting School Bus AR or payment JEs:
- validate posting context is coherent
- validate School Bus settings belong to the resolved operational company
- validate COA accounts belong to the resolved effective GL company
- fail loudly with a toast instead of silently producing hidden records

## Files to touch

| File | Change |
|---|---|
| `src/hooks/useSchoolBusFinance.ts` | Add School Bus company-context resolver, shared customer resolver, update generation/payment/backfill flows |
| `src/hooks/useAccountingData.ts` | Fix `useARInvoices()` filtering to rely on `business_unit_code` for SBO views |
| `src/contexts/CompanyContext.tsx` | Add fallback BU-code mapping when `short_code` is missing |
| `src/components/school/RecordPaymentModal.tsx` | Point payment sync to shared School Bus customer/linking logic if needed |
| `supabase/migrations/<new>.sql` | Katunayaka-only settings normalization + batch/AR/JE migration + missing AR backfill |

## What you’ll see after the fix

1. **Katunayaka AR invoices appear in LIVE Accounting → AR → Invoices**
2. The missing latest invoice(s), including the broken **2026-04-21** batch, will exist as proper Finance AR rows
3. Older Katunayaka invoices that were wrongly sitting under TEST become visible in LIVE
4. When a **student pays**, the linked AR invoice updates to **partial/paid** again
5. Other branches stay safe because:
   - migration is scoped to **Katunayaka only**
   - AR query change is additive and based on correct `business_unit_code`
   - School Bus posting guard prevents future wrong-company writes

## Technical notes
- Verified broken Katunayaka batch on `2026-04-21` was saved under **NCG Test parent**
- Verified broken school invoice `SBS-INV-202604-01142` currently has **no Finance AR link**
- Verified older Katunayaka linked AR rows exist but are under **TEST company_id**
- Verified live `School Bus Operations` company currently lacks a usable `short_code`, which is why the AR list falls back to fragile invoice-prefix filtering
