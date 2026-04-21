
# Fix: School Bus AR/GL/COA validation and make April match only Katunayaka, Panadura, Nuwara Eliya

## What I found in LIVE

The current numbers are not matching because old and failed batches are still inside Finance.

### Correct target for April 2026
The 3 branches you said are completed are:

| Branch | Active students | Correct 80% invoice total |
|---|---:|---:|
| Katunayaka | 33 | Rs 192,240 |
| Panadura | 440 | Rs 2,762,960 |
| Nuwara Eliya | 197 | Rs 1,139,560 |
| **Total** | **670** | **Rs 4,094,760** |

So your expected outstanding amount **Rs 4,094,760** is correct.

### Current wrong state
Current AR shows:

| Branch | AR count | AR amount | Issue |
|---|---:|---:|---|
| Katunayaka | 69 | Rs 472,495 | 68 rows are old inactive-student invoices from previous failed runs |
| Panadura | 440 | Rs 2,762,960 | Correct |
| Nuwara Eliya | 197 | Rs 1,139,560 | Correct |
| **Total** | **706** | **Rs 4,375,015** | Over by **Rs 280,255** |

Current GL has extra entries too:
- **473 unlinked SBO JEs** on 2026-04-21 with no `school_ar_invoices` and no `ar_invoices`.
- These are extra GL rows and must not appear under School Bus now.
- 440 of these are duplicate Panadura JEs.
- 33 of these are Katunayaka active-student JEs from the correct attempt, but Katunayaka’s visible AR is currently attached mostly to old inactive-student batches, so Katunayaka needs a controlled rebuild.

## Repair plan

### 1. Clean current April School Bus Finance state

I will apply a targeted data repair for April 2026, SBO only, NCG Holding only:

1. Remove old Katunayaka April AR invoices that are linked to inactive students.
2. Remove the linked old Katunayaka school invoices from those failed batches.
3. Remove or reverse/delete only the related Katunayaka old JEs that are safe to remove:
   - no active student
   - April 2026
   - SBO
   - NCG Holding
   - linked to removed old school invoices
4. Convert the 33 correct Katunayaka active-student orphan JEs into proper Finance rows:
   - create `school_ar_invoices`
   - create/link `ar_invoices`
   - attach to existing correct JEs
   - amount = 80% of active student fixed monthly amount
5. Remove the 440 duplicate Panadura orphan JEs because Panadura already has correct 440 AR + school invoices + linked JEs.
6. Recheck final April result:
   - AR count = **670**
   - School invoice count = **670**
   - Linked JE count = **670**
   - Outstanding = **Rs 4,094,760**
   - Branches = Katunayaka, Panadura, Nuwara Eliya only

### 2. Recalculate COA balances correctly

After cleanup, I will recalculate affected COA accounts from the remaining posted JEs, especially:
- `12201001` Trade Receivable - External
- `41103001` Transport Income - School Buses

This is needed because old failed JEs already updated COA balances. After deleting/reversing them, the COA must match the remaining valid School Bus JEs only.

Expected April valid School Bus posting effect:
- DR Trade Receivable: **Rs 4,094,760**
- CR School Bus Transport Income: **Rs 4,094,760**

### 3. Stop future mismatches with validation

I will harden `src/hooks/useSchoolBusFinance.ts` so the system cannot create partial finance records.

New validation before generating:
- Selected branch/month must not already have active invoices unless user deletes/regenerates.
- Only active students are included.
- Billing amount must equal `fixed_monthly_amount * billing_percentage / 100`.
- Customer must exist for the correct company and `business_unit_code = SBO`.
- COA settings must belong to the effective NCG Holding company.
- The branch/month must pass a preflight parity check.

New write order:
1. Resolve customer.
2. Create AR invoice.
3. Create JE header + lines.
4. Link `ar_invoices.journal_entry_id`.
5. Create `school_ar_invoices` with both `ar_invoice_id` and `journal_entry_id`.
6. Update student balance.
7. Update COA.

If any step fails, it will repair/rollback what was created in that loop instead of leaving orphan JEs or orphan AR rows.

### 4. Add auto-matching and verification dashboard

I will add a School Bus Finance verification layer that compares:

```text
Active Students
  = School AR invoices
  = Finance AR invoices
  = Linked Journal Entries
  = COA movement
```

For each branch/month it will show:
- active student count
- school invoice count
- Finance AR count
- linked JE count
- orphan JE count
- duplicate invoice count
- expected total
- AR total
- JE total
- difference

When mismatch exists, the UI will show:
- red warning banner
- exact branch/month problem
- “Repair now” action for safe repairs only

### 5. Database validation objects

I will add/upgrade database-side helpers:

| Object | Purpose |
|---|---|
| `v_sbo_ar_je_parity` | Branch/month AR/JE/school invoice count and amount comparison |
| `v_sbo_orphan_journal_entries` | Shows SBO JEs not linked to school invoice or AR |
| `v_sbo_finance_validation` | Final validation view with status: OK / MISMATCH |
| repair function/RPC | Controlled repair for branch/month, not broad manual SQL |

### 6. UI changes

Files to update:
- `src/hooks/useSchoolBusFinance.ts`
  - atomic generation
  - preflight validation
  - repair hooks
  - active-student-only logic
- `src/components/school/BulkARInvoiceDialog.tsx`
  - show validation summary before generation
  - block generation when mismatch exists
  - repair button for safe orphan/duplicate cases
- School Bus Finance settings/overview component
  - add branch/month validation panel
- New migration / data repair SQL
  - April 2026 cleanup
  - COA recalculation
  - validation views/functions

## Safety scope

This repair will only touch:
- NCG Holding
- `business_unit_code = 'SBO'`
- April 2026
- Katunayaka, Panadura, Nuwara Eliya reconciliation
- School Bus AR/JE/COA records directly involved in this mismatch

It will not touch:
- Special Hire
- Yutong
- Sinotruk
- Light Vehicle
- NCG Express
- unrelated AP/AR records
- other months unless explicitly included in validation views

## Expected result after implementation

- AR invoice list under School Bus shows only:
  - Katunayaka
  - Panadura
  - Nuwara Eliya
- AR count becomes **670**
- Outstanding becomes **Rs 4,094,760**
- School Bus GL JE count matches the same 670 valid AR invoices
- Orphan/duplicate SBO JEs are removed from current School Bus section
- COA balances are recalculated to match valid posted JEs
- Future batches cannot create AR without JE, JE without AR, or COA without linked source
