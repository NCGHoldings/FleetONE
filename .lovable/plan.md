

# Fix: Duplicate FUEL-BLK journal entries + Backfill missing AP Payment records

## What's actually wrong (verified against the database)

I queried your DB directly and confirmed:

| Finding | Evidence |
|---|---|
| **47 fuel JEs exist for the same date (2026-04-06), but only 28 unique (bus, date) combos** | 19 buses have 2 JEs and 1 bus has 3 JEs — Excel was imported twice |
| **Zero `DP-FUEL-*` rows in `ap_payments`** — that's why nothing shows under AP → Payments | The AP-payment insertion code was added AFTER your last import; the existing 47 JEs predate the fix |
| **VEHICLE FUEL balance Rs 2,913,114** vs Excel Rs ~1.46M — exactly ~2x | Confirms double-posting |
| **Daily_bus_expenses upserts** (adds amounts) but each call still creates a NEW JE | Source of the duplication |

## The 3 fixes I'll ship

### Fix A — Stop future duplicates at the source (`useSchoolBusBulkExpenses.ts`)

Before creating each Journal Entry, check if a `journal_entries` row already exists for the same `(bus_id, entry_date, source_module='school_bus_fuel_import')`. If it does, **skip JE creation, skip AP payment, skip COA balance update** — but still allow daily_bus_expense to be updated if the new amount differs.

Concretely:
1. Stamp every fuel-import JE with `source_module = 'school_bus_fuel_import'` (currently it's null — that's why the integrity scanner can't find them either).
2. Add a one-line guard before the `journal_entries.insert(...)`:
   ```
   const { data: dupe } = await supabase
     .from("journal_entries")
     .select("id").eq("source_module","school_bus_fuel_import")
     .eq("entry_date", expense.expenseDate)
     .filter("id","in", `(select journal_entry_id from journal_entry_lines where bus_id='${expense.busId}' and journal_entry_id is not null)`)
     .maybeSingle();
   if (dupe) { skip the bus, increment a "skipped" counter, continue; }
   ```
3. At the end of the batch, toast: *"Imported X buses, skipped Y duplicates already posted on this date."*

### Fix B — Clean up the existing 19 duplicate JEs (one-time SQL migration)

For every `(bus_id, entry_date)` that has more than one `FUEL-BLK-*` JE, **keep the earliest** (first import) and **reverse + delete the later duplicates**:
1. For each duplicate JE: subtract its debit/credit from `chart_of_accounts.current_balance` (undoes the COA inflation),
2. Delete the duplicate's `journal_entry_lines`,
3. Delete the duplicate `journal_entries` row,
4. Recompute `daily_bus_expenses.fuel_cost` from the remaining single JE (so the per-bus daily total isn't doubled either).

After this runs, VEHICLE FUEL drops from Rs 2,913,114 to ≈Rs 1,456,557 (the true Excel total) and FUEL FLOAT - DIALOG TOUCH_SBS recovers the over-credited amount.

### Fix C — Backfill the missing `ap_payments` for the existing fuel JEs

For each surviving `FUEL-BLK-*` JE (after Fix B dedup), insert one `ap_payments` row with:
- `payment_method='direct'`, `is_direct_payment=true`, `payee_type='direct'`
- `payment_number = 'DP-FUEL-' + entry_date + '-' + busSeq`
- `amount = total_debit`, `journal_entry_id = je.id`, `bus_id`, `bus_no`
- `status='paid'`, `approval_status='approved'`, `business_unit_code='SBO'`
- `notes = 'Backfill: bulk fuel float drawdown'`

After this runs, the AP → Payments tab immediately lists all 28 fuel rows with **Direct (Float)** badge, click-through to JE, and the *Payments Today / This Month* KPIs update.

## Files / actions

| Item | Type | Purpose |
|---|---|---|
| `src/hooks/useSchoolBusBulkExpenses.ts` | Code edit | Add `source_module` stamp + duplicate guard + skipped-counter toast |
| One-time SQL migration | DB migration | Reverse + delete the 19 duplicate JEs, recompute `daily_bus_expenses`, recompute COA balances |
| Same migration | DB migration | Backfill `ap_payments` rows for every surviving fuel JE |

## What you'll see after the fix

1. **VEHICLE FUEL drops to the correct ~Rs 1.46M** (matches Excel exactly), no more double-counting.
2. **FUEL FLOAT - DIALOG TOUCH_SBS rises back** by the duplicated amount that was wrongly credited.
3. **AP → Payments now lists every fuel transaction** with method **Direct (Float)** and a JE drill-through link.
4. **Re-running the same Excel** will toast *"Skipped 28 duplicates already posted"* instead of double-posting again.
5. The COA tree drill-down on VEHICLE FUEL goes from 76 transactions → ~28 (one per bus).

## Out of scope (say the word for any of these)
- Letting the user re-import a previously imported date intentionally (would need a "force re-import" toggle).
- Same dedup guard for the manual single-bus expense form.
- A "Reverse this batch" button on the import history.

