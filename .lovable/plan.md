

# Plan: Cut LIVE School Bus April 2026 to exactly 670 / Rs 4,094,760

## What's actually in LIVE right now (April 2026, SBO)

| Branch | AR rows | AR amount | Date(s) | Status |
|---|---:|---:|---|---|
| Katunayaka | 35 | 221,500 | 04-06 | Old failed batch — DELETE |
| Katunayaka | 33 | 241,155 | 04-09 | Old failed batch — DELETE |
| Katunayaka | 1 | 9,840 | 04-21 | Single test — DELETE |
| Wattala | 536 | 5,130,035 | 04-09 | Not in your "completed 3" — DELETE (⚠ 2 paid) |
| Kurunegala | 499 | 5,090,800 | 04-15 | Not in your "completed 3" — DELETE |
| Nugegoda | 2 | 17,500 | 04-01 | Not in your "completed 3" — DELETE (⚠ 1 paid) |
| Anuradhapura | 1 | 7,120 | 04-15 | Not in your "completed 3" — DELETE (⚠ 1 paid) |
| **Panadura** | **440** | **2,762,960** | 04-21 | ✅ KEEP |
| **Nuwara Eliya** | **197** | **1,139,560** | 04-21 | ✅ KEEP |
| **Total now** | **1,744** | **14,620,470** | | Target after cut: **637 / 3,902,520** |

JEs follow the same pattern: 2,857 SBO JEs in April, of which only ~637 belong to Panadura+Nuwara Eliya (Apr-21 batch). Plus there are 575 zero-debit zombie JEs scattered across 04-01/03/06/09.

After cleanup of the 7 wrong branches, **Katunayaka 33 still needs to be regenerated** (active students with no remaining AR) to reach the 670 / Rs 4,094,760 target.

## Issue requiring your decision

**4 AR invoices in the to-be-deleted branches have payments recorded against them:**
- Nugegoda INV-NCGH-2026-00060 — Rs 7,300 paid
- Wattala INV-NCGH-2026-00241 — Rs 9,000 paid
- Wattala INV-NCGH-2026-00526 — Rs 11,200 paid
- Anuradhapura INV-NCGH-2026-01172 — Rs 7,120 paid

Total Rs 34,620 in real student payments. These were collected from real students. Deleting the AR invoice without handling the payment will **break the cash side**.

I will **NOT** assume; I'll list options below — you pick option **A**, **B**, or **C** before I run anything.

| Option | What happens to the 4 paid AR rows | What happens to the cash already received |
|---|---|---|
| **A** | Keep these 4 AR rows (and their JEs). They stay visible under SBO April. | Cash stays correctly recorded. Final count becomes 641 + 33 Katunayaka = **674** / Rs 3,937,140. Doesn't match your 670 target exactly but books are clean. |
| **B** | Delete them anyway. | I will reverse the receipt postings and credit the student `payment_balance` so cash isn't lost. Money becomes "advance / unallocated" against student. |
| **C** | Delete them and also delete the receipts (treat as test data). | Cash entry for Rs 34,620 is wiped. Only safe if those 4 receipts were test entries — please confirm they're not real. |

## Migration that will run after you pick A / B / C

### Step 1 — Snapshot
- Create `_archive_april_sbo_cleanup_<timestamp>` schema and copy every AR/JE/JE-line/school_ar_invoices/allocation row I'm about to touch. Nothing is lost — recoverable in 1 query.

### Step 2 — Delete wrong-branch April SBO data (scope below)
Targets exactly:
```
business_unit_code = 'SBO'
AND invoice_date / entry_date BETWEEN 2026-04-01 AND 2026-04-30
AND linked-student branch IN (Wattala, Kurunegala, Nugegoda, Anuradhapura)
   OR (Katunayaka AND invoice_date IN 04-06, 04-09, 04-21)
```
For each match:
- delete `school_ar_invoices` row
- delete `journal_entry_lines` then `journal_entries`
- delete `ar_invoices`
- handle 4 paid invoices per option A/B/C

### Step 3 — Delete zero-debit zombie JEs (575 rows, no lines, no AR link)
Apr 01/03/06/09 with `total_debit = 0` AND `id NOT IN (ar_invoices.journal_entry_id)` AND no `journal_entry_lines`.

### Step 4 — Regenerate the 33 Katunayaka active-student invoices (Apr 21 batch)
Same atomic flow that now works for Panadura/NE: customer → ar_invoice → JE+lines → school_ar_invoices link.

### Step 5 — Recalculate COA balances
For NCG Holding `12201001` (Trade Receivable - External) and `41103001` (Transport Income - School Buses): wipe `current_balance`, then sum all remaining posted JE lines from project start. Result must show DR 4,094,760 / CR 4,094,760 movement from the April SBO batch (plus any prior history, untouched).

### Step 6 — Verification view
Add `v_sbo_finance_validation` that returns OK / MISMATCH per branch+month. Migration aborts if final April SBO totals ≠ 670 / Rs 4,094,760.

## Code hardening (after data is clean)
- `src/hooks/useSchoolBusFinance.ts` — atomic per-student write with rollback; preflight blocks regeneration when month already has invoices for that branch; only active students included.
- `src/components/school/BulkARInvoiceDialog.tsx` — pre-generate validation panel showing Active vs AR vs JE vs COA, "Repair now" button only when drift exists.

## Out of scope
- TEST environment — not touched.
- Other modules (SPH, YUT, SNT, LTV, NCGE) — not touched.
- Months other than April 2026 — not touched.
- Other COA accounts — only the two affected ones recalculated.

## ⚠ Need your reply before I proceed

**Reply with one of:**
- **"A"** — keep the 4 paid invoices; final count 674
- **"B"** — delete + push Rs 34,620 to student advance balances
- **"C"** — delete everything including receipts (only if these 4 were test payments)

