
# Execute: Option C — Hard delete all wrong-branch April SBO data including the 4 paid receipts

You picked **C**: treat the 4 paid invoices in Wattala/Nugegoda/Anuradhapura as test data and wipe them along with their receipts. Final April SBO target: **670 invoices / Rs 4,094,760** across Katunayaka (33), Panadura (440), Nuwara Eliya (197).

## What will run (single migration, LIVE only)

### Step 1 — Snapshot to archive schema
Create `_archive_april_sbo_<timestamp>` and copy every row about to be deleted from:
- `ar_invoices`, `journal_entries`, `journal_entry_lines`
- `school_ar_invoices`, `school_student_ar_link`
- `ar_receipts`, `ar_receipt_allocations` (the 4 paid + linked rows)

Recoverable via 1 query if anything looks wrong.

### Step 2 — Delete the 4 receipts (Option C)
Targets exactly these 4 paid invoices:
- Nugegoda INV-NCGH-2026-00060 (Rs 7,300)
- Wattala INV-NCGH-2026-00241 (Rs 9,000)
- Wattala INV-NCGH-2026-00526 (Rs 11,200)
- Anuradhapura INV-NCGH-2026-01172 (Rs 7,120)

Delete: `ar_receipt_allocations` → `ar_receipts` → reverse cash JE lines → delete cash JEs.

### Step 3 — Delete wrong-branch April SBO AR + JE data
Scope:
```
business_unit_code = 'SBO'
AND date BETWEEN 2026-04-01 AND 2026-04-30
AND (
  branch IN ('Wattala','Kurunegala','Nugegoda','Anuradhapura')
  OR (branch = 'Katunayaka' AND invoice_date IN ('2026-04-06','2026-04-09','2026-04-21'))
)
```
Order: `school_student_ar_link` → `school_ar_invoices` → `journal_entry_lines` → `journal_entries` → `ar_invoices`.

### Step 4 — Delete 575 zombie zero-debit JEs
April SBO with `total_debit = 0`, no lines, no AR link, no AP link, no expense_request link, no operational link.

### Step 5 — Regenerate 33 Katunayaka active-student invoices (Apr 21)
Atomic per-student write (same flow that worked for Panadura/NE):
1. Resolve customer
2. Create `ar_invoices`
3. Create `journal_entries` + lines (DR 12201001, CR 41103001)
4. Link `ar_invoices.journal_entry_id`
5. Insert `school_ar_invoices` with both IDs
6. Insert `school_student_ar_link`
7. Update student `payment_balance`

Amount = `fixed_monthly_amount * 0.80` per active Katunayaka student.

### Step 6 — Recalculate COA balances
For NCG Holding only:
- `12201001` Trade Receivable - External
- `41103001` Transport Income - School Buses

Reset `current_balance = 0`, then re-sum from all remaining posted `journal_entry_lines` (project-start to today).

### Step 7 — Add validation views
- `v_sbo_finance_validation` — branch+month parity (active vs AR vs JE vs school invoice vs total)
- `v_sbo_orphan_journal_entries` — exposes any drift going forward

Migration **aborts and rolls back** if final April SBO totals ≠ 670 / Rs 4,094,760.

## Code hardening (after migration succeeds)

| File | Change |
|---|---|
| `src/hooks/useSchoolBusFinance.ts` | Atomic per-student write with rollback. Preflight blocks regeneration when month already has invoices for that branch. Only active students included. Customer auto-provision (`SBS-<BRANCH>`). |
| `src/components/school/BulkARInvoiceDialog.tsx` | Validation panel before generation: Active vs AR vs JE vs COA. Block button on mismatch. "Repair now" only when safe. |
| New SBO Finance overview card | Live OK / MISMATCH banner sourced from `v_sbo_finance_validation`. |

## Expected end state (LIVE only)

| Metric | Value |
|---|---:|
| April 2026 SBO AR invoices | 670 |
| April 2026 SBO linked JEs | 670 |
| April 2026 SBO outstanding | Rs 4,094,760 |
| Branches visible | Katunayaka, Panadura, Nuwara Eliya |
| 12201001 movement (April SBO) | DR 4,094,760 |
| 41103001 movement (April SBO) | CR 4,094,760 |
| Orphan SBO JEs | 0 |

## Out of scope
TEST environment, other modules (SPH/YUT/SNT/LTV/NCGE), other months, other COA accounts.
