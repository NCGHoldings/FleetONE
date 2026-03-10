

# Fix School Student Import: Service Type, Amount Fields, Admission Numbers & CSV

## Problems Found

1. **Import fails for ~70 students** — The `service_type` DB column has a CHECK constraint allowing only `'OneWay'` or `'BothWay'`, but the Excel has `"yes"/"Yes"` which violates this constraint.

2. **Amount columns are confusing** — User wants:
   - **"Fixed Amount"** = the new/updated monthly fee (maps to `update_new` in DB)
   - **"Amount Due"** = what student has paid (maps to `payment_amount` in DB)
   - Currently only "Update New (Expected Fee)" exists in the mapping UI.

3. **"RO" vs "R0" in admission numbers** — Admission numbers like `RO1731` should be `R01731` (letter O → digit 0). This affects the Ratnapura branch students.

4. **No CSV support** — Only `.xlsx`/`.xls` accepted; user wants `.csv` too.

5. **Batch insert fails silently** — In `replace_all` mode, the entire batch of 250 fails if even one row has bad `service_type`. Need per-record error handling.

## Changes

### 1. Edge Function `supabase/functions/process-school-excel/index.ts`
- **Normalize `service_type`**: Map `"yes"` → `"BothWay"`, `"no"` → `"OneWay"`, empty/null → `null`. Any unrecognized value gets mapped to `"BothWay"` as default.
- **Fix admission_no**: Auto-correct `RO`/`Ro` prefix to `R0` (replace capital/lowercase O after R with zero).
- **Switch `replace_all` from batch insert to per-record insert** so one bad row doesn't kill the entire batch.
- **Add `amount_due` field** as alias for `payment_amount` — if client sends `amount_due`, store it in `payment_amount`.
- **Add `fixed_amount` field** as alias for `update_new` — if client sends `fixed_amount`, store it in `update_new`.

### 2. `src/components/school/SchoolExcelImport.tsx`
- **Add CSV support**: Accept `.csv` files, parse with `XLSX.read` (which handles CSV natively).
- **Rename column labels**: Change "Update New (Expected Fee)" → "Fixed Amount (New Fee)" and add a new mapping option "Amount Due (Paid)" mapping to `payment_amount`.
- **Add `fixed_amount` and `amount_due`** to `REQUIRED_COLUMNS` array with clear labels.
- **Improve auto-mapping**: Use flexible matching for "fixed amount", "amount due", "update new", etc.
- **Update file input accept**: `.xlsx,.xls,.csv`

### 3. Column Mapping Updates (in `REQUIRED_COLUMNS`)
| Label in UI | DB Column | Purpose |
|---|---|---|
| Fixed Amount (New Fee) | `update_new` | The expected/updated monthly fee |
| Amount Due (Paid) | `payment_amount` | What student has already paid |

