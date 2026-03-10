

# Fix: Fixed Amount & Admission No Not Mapping During Import

## Investigation Results

I checked the Ratnapura branch database directly:
- **103 students** imported, **88 have `update_new` (Fixed Amount)** values, **15 are NULL** (likely empty in Excel)
- **0 have `admission_no`** — the column was never mapped during import
- **0 have `payment_amount`** — the column was never mapped during import

**Root cause**: The auto-mapping function isn't detecting the user's Excel column headers for `admission_no` and possibly `payment_amount`. The `admission_no` field has no aliases defined, so it only matches if the Excel header exactly contains "Admission No". If the Excel header is slightly different (e.g., "Ad No", "Reg No", "Student ID"), it won't match.

The `update_new` IS working for 88/103 records — the 15 NULL ones likely had empty cells in the Excel.

## Plan

### 1. `src/components/school/SchoolExcelImport.tsx`
- Add `admission_no` aliases: `['admission no', 'admission_no', 'ad no', 'reg no', 'registration', 'student id', 'id no']`
- Add more aliases for other commonly mismatched columns (grade, parent_name, etc.)
- Add **console.log** of the auto-mapping result so we can debug which columns matched and which didn't
- Show the mapping result in a toast so the user knows which columns were auto-detected

### 2. `supabase/functions/process-school-excel/index.ts`
- Add **console.log** of the first record's keys and values before insert — this will show in edge function logs exactly what data is being sent, so we can verify if `update_new` and `admission_no` are present
- Add a summary log of how many records had non-null `update_new`, `payment_amount`, and `admission_no`

### 3. Files to Edit
| File | Change |
|---|---|
| `SchoolExcelImport.tsx` | Add aliases for `admission_no`, add debug logging of auto-map results |
| `process-school-excel/index.ts` | Add debug logging of first record and field population stats |

