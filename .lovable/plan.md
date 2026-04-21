

# Fix: Katunayaka (and all SBO branches) AR invoices going to wrong company / not showing on AR page / COA not updating

## What's actually broken (verified in DB)

I queried your live DB and found three connected bugs:

| Symptom | Real cause |
|---|---|
| AR invoices generated today (28 invoices, 2026-04-21) but **AR Invoices page shows 0** | `customer_id` lookup fails → AR insert silently skipped. `customers.customer_code` has a **global UNIQUE constraint** and `SBS-LKA` already exists under the Test company (`f40b0a9d…`). When LIVE mode tries to insert `SBS-LKA` for NCG Holding it fails, the catch sets `customerId = null`, AR insert is skipped — no error toast. |
| **JEs exist but COA tree doesn't update** | The Katunayaka `school_bus_finance_settings` row has `trade_receivable_account_id` and `sbs_collection_account_id` pointing to **Test COA accounts** (`cce9995e…` / `19891c60…`, both `company_id = f40b0a9d…`). The JE is created under NCG Holding (`a000…001`) but its lines reference Test-owned accounts, so `chart_of_accounts.current_balance` updates land on the Test COA — invisible in the Holding tree. |
| **"School Bus Operations" branch picker silently uses Test settings** | The "cross-company fallback" in `useBranchFinanceSettings` (line 153-165) returns ANY row with `trade_receivable_account_id NOT NULL` for that branch, regardless of company. For Katunayaka the only configured row is the Test one → LIVE mode unknowingly inherits Test mappings. |
| Today's 28 `school_ar_invoices` rows all have `ar_invoice_id = NULL` | Same root cause: AR insert silently skipped, so the link back is missing — student payments can't auto-mark the invoice paid. |

## What I'll change

### 1. Fix the customer lookup (eliminate silent failure) — `src/hooks/useSchoolBusFinance.ts` lines 515–542
- Instead of `eq("company_id", effectiveCompanyId).eq("customer_code", "SBS-LKA")`, search by **(business_unit_code='SBO', customer_code)** first, regardless of company.
- If found: reuse it — but if its `company_id` != `effectiveCompanyId`, **migrate it** to `effectiveCompanyId` via UPDATE (one-shot fix, harmless because customer_code is the natural key and is globally unique).
- If not found: insert with a per-company suffix fallback (`SBS-LKA-NCGH`) so the global UNIQUE doesn't bite. Wrap in try/catch and **throw on failure** instead of silently nulling — the user must see "Customer setup failed" toast rather than 28 invoices vanishing.

### 2. Block "wrong-company COA" at the settings layer — same file, `useBranchFinanceSettings` lines 131–195
- Tighten the cross-company fallback (line 153-165): only fall back to another company's settings if **both COA accounts also belong to `effectiveCompanyId`** (verify via a join). Otherwise treat as not configured and force the user to set up branch settings for this company.
- Add a new helper `validateGLAccountsBelongToCompany(settings, effectiveCompanyId)` that runs before any JE insert in `useGenerateBulkARInvoices` and `usePostStudentPaymentToGL`. If any account is owned by another company, throw a clear error: *"Katunayaka GL accounts belong to NCG Test, not NCG Holding. Open Settings → School Bus Finance → Katunayaka and re-pick the Trade Receivable / Sales accounts under NCG Holding."*

### 3. Auto-remap the Katunayaka settings row (one-time DB migration)
The Katunayaka `school_bus_finance_settings` row currently points to Test COA. I'll write a migration that:
- Looks up NCG Holding's equivalent COA accounts by `account_code` (`12201001` → `a1678110…` for TR, `41103001` → `753cb8f4…` for Sales School Buses, plus the liability account).
- Updates the Katunayaka row + the duplicate "branch_id IS NULL" defaults to point at NCG Holding's COA IDs and resets `company_id = a0000000-0000-0000-0000-000000000001`.
- Leaves the Test-environment row (`branch_id = 4b0dcd34…`) alone.

### 4. Backfill the 28 orphan invoices created today
A one-time SQL script that:
- Finds the 28 `school_ar_invoices` rows with `ar_invoice_id IS NULL` created on 2026-04-21 for Katunayaka students.
- Creates the matching `customers` row (`SBS-LKA`, NCG Holding) if missing.
- For each orphan, inserts the corresponding `ar_invoices` row (linking to the existing `journal_entry_id`) and updates `school_ar_invoices.ar_invoice_id`.
- Re-points the existing JE lines to NCG Holding's COA account IDs (so the COA balances update correctly).
- Recomputes `chart_of_accounts.current_balance` for the affected accounts.

### 5. Re-confirm payment auto-allocation works after the link is restored
The student payment posting code (`usePostStudentPaymentToGL`, line ~770+) already DR Bank / CR Trade Receivable. Once `school_ar_invoices.ar_invoice_id` is populated (steps 1+4), the existing AR allocation logic naturally settles the invoice. No code change needed here — it was just missing the link.

## Files touched

| File | Change |
|---|---|
| `src/hooks/useSchoolBusFinance.ts` | Fix customer lookup (search by business_unit_code, migrate company_id, throw on fail); tighten `useBranchFinanceSettings` fallback to validate COA company; add `validateGLAccountsBelongToCompany` guard before JE insert in both bulk-invoice and payment-posting flows |
| `supabase/migrations/<new>.sql` | Re-map Katunayaka `school_bus_finance_settings` to NCG Holding COA IDs; backfill 28 orphan AR invoices + relink JE lines + recompute COA balances |

## What you'll see after the fix

1. The 28 Katunayaka invoices generated today appear under **Accounting → AR → Invoices** with status `unpaid` and the correct customer (`School Bus Students - Katunayaka`).
2. The COA tree under NCG Holding → `41103001 TRANSPORT INCOME - SCHOOL BUSES` shows the credit balance (today's batch ≈ LKR 168,000), and `12201001 TRADE RECEIVABLE-EXTERNAL` shows the matching debit.
3. Generating next month's batch (or any other branch) routes everything to NCG Holding COA, never Test.
4. When a student pays, the existing AR allocation now finds the linked `ar_invoice_id` and auto-marks the invoice paid/partial.
5. If anyone misconfigures GL accounts (cross-company) again, the system throws a clear error toast instead of silently writing orphan JEs.

## Out of scope (say the word for any of these)
- Cleaning the duplicate Katunayaka settings rows (3 exist; 1 is enough). Easy to do once you confirm.
- Same hardening for the other branches if they have the same Test→Holding misconfiguration. I'll quickly extend the migration to all SBO branches if you want.
- Adding a UI banner in **School Bus Finance Settings** that warns when the picked COA account belongs to a different company than the active one.
