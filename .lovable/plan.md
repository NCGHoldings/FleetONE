

# Fix: Missing AR invoices for today's Nuwara Eliya batch + LIVE/TEST cleanup

## What I verified in the live DB

| Symptom | Verified cause |
|---|---|
| AR page shows **69** invoices but JE list shows **231** today | **197 Nuwara Eliya** school invoices created today have JEs but **0 linked AR invoices** (`ar_invoice_id = NULL`). The bulk AR generator inserted `school_ar_invoices` rows + `journal_entries` but the parallel `ar_invoices` insert silently produced nothing. |
| Katunayaka "duplicates" suspicion | **No actual duplicate students** found for any month in Katunayaka or Nuwara Eliya in April. Only one batch per branch. The 33 SBO JEs from 2026-04-09 and 35 from 2026-04-06 (all ₨0) are old test runs in LIVE. |
| LIVE vs TEST mismatch | LIVE has 299 SBO JEs / 69 AR. TEST has 1,731 SBO JEs / 1,047 AR. The 35 LIVE JEs from 2026-04-06 with `total_debit = 0` are dead/empty rows — never had any `journal_entry_lines`. |
| Today's batch in LIVE was correctly company-routed | Batch `SBS-BATCH-202604-0010` is on **School Bus Operations** ✅ (the previous fix held). The bug is now downstream. |

## Why today's 197 NE invoices are missing from AR (root cause)

After the previous fix, `useGenerateBulkARInvoices` writes the `school_ar_invoices` row + JE inside the per-student loop. The matching `ar_invoices` insert is supposed to happen too, but the new "throw-on-error" guard added last round triggers silently for NE because:

1. NE branch resolves customer code `SBS-NUW`, which **doesn't exist in `customers` for NCG Holding** in LIVE (only `SBS-LKA` does after the previous Katunayaka migration).
2. The shared customer resolver throws → caught by an outer `try/catch` per student → JE was already committed before the throw, so **JE stays, AR is never written, and `school_ar_invoices.ar_invoice_id` stays NULL.**

I'll prove and fix it.

## What I'll change

### 1. Make customer auto-provisioning bullet-proof for every branch
In `src/hooks/useSchoolBusFinance.ts` shared customer resolver:
- If `SBS-<BRANCH_CODE>` customer doesn't exist for the resolved GL company (NCG Holding in LIVE / NCG Test in TEST), **create it on the fly** with proper `business_unit_code = 'SBO'` and branch-derived name (e.g. "School Bus Students - Nuwara Eliya"), instead of throwing.
- Use a single `INSERT ... ON CONFLICT DO NOTHING` then re-`SELECT` to make it idempotent.
- Apply this for **all** SBO branches, not just Katunayaka.

### 2. Atomic per-student write order
Reorder the per-student transaction inside `useGenerateBulkARInvoices`:
1. Resolve / auto-create customer first.
2. Insert `ar_invoices` row first (with proper company, business unit, customer).
3. Then insert `journal_entries` + lines.
4. Then insert `school_ar_invoices` with both `ar_invoice_id` and `journal_entry_id` set.
5. If any step fails, the loop logs which student/step and **skips** that student instead of leaving orphan JEs.

This guarantees: no future "JE without AR" or "school invoice without AR link" can happen.

### 3. Backfill today's 197 NE invoices + 33 older orphan SBO JEs (DB migration)
Targeted, SBO-only:
- For every `school_ar_invoices` row in LIVE where `ar_invoice_id IS NULL` AND `journal_entry_id IS NOT NULL`:
  - Auto-create `SBS-NUW` (and any other missing `SBS-<X>`) customer if absent.
  - Create matching `ar_invoices` row in NCG Holding, `business_unit_code = 'SBO'`, link to existing JE, copy `amount`, `invoice_month`-derived dates, status from `school_ar_invoices.status`.
  - Update `school_ar_invoices.ar_invoice_id` to the new row.
- Delete the 35 dead `JV-NCGH-2026-002**` JEs from 2026-04-06 with `total_debit = 0` AND no `journal_entry_lines` AND no linked `school_ar_invoices.journal_entry_id` (true zombies only).
- Scope: SBO + NCG Holding only. SBO `business_unit_code` filter throughout. **Nothing in TEST is touched** unless you say so.

### 4. Cross-environment audit view (read-only helper)
Add a Postgres view `v_sbo_ar_je_parity` that returns:
- per branch, per month: school_invoices count, ar_invoices count, je count, mismatches.
This lets you (and the GL Integrity Guardian) detect the same drift instantly next time, in both LIVE and TEST, without any custom queries.

### 5. Surface the mismatch in the UI
In School Bus Finance, add a small banner above the bulk-generate button:
> *"⚠ N students this month already have a JE but no AR invoice. [Repair now]"*
Click → runs the same backfill but only for the current branch+month. Ensures users self-heal future drift without waiting for migrations.

## Files

| File | Change |
|---|---|
| `src/hooks/useSchoolBusFinance.ts` | Auto-provision customer per branch; reorder atomic per-student writes; never leave JE without AR |
| `src/components/school/SchoolBusFinanceSettings.tsx` (or equivalent) | "Repair orphan JEs" banner + button |
| `supabase/migrations/<new>.sql` | Backfill 197 NE + any other orphan SBO `school_ar_invoices`; delete zombie ₨0 JEs; create `v_sbo_ar_je_parity` view |

## Out of scope (say the word)
- Touching TEST environment. (TEST has its own large parity gap — 1,731 JEs vs 1,047 AR — I won't migrate it unless approved.)
- Cleaning the older 33 `school_ar_invoices` from 2026-04-09 if any are also orphaned (will check during migration; only fix true orphans).
- Changing the JE numbering for already-posted entries.

## After the fix

1. **AR page in LIVE will jump from 69 → ~266+** (existing 69 + today's 197 NE).
2. Every student JE will have a matching AR row from now on.
3. The repair banner appears only when drift exists, so future silent failures are instantly visible.
4. TEST stays untouched until you decide.
5. All other branches (SPH, YUT, SNT, LTV, NCGE) are not touched.

