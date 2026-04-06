

# Add Fixed Amount Edit to Student Edit Modal

## Problem
The "Edit Student" form is missing the **Fixed Amount** (`fixed_monthly_amount`) field. This is the monthly fee amount used across the payment system (balance calculations, AR invoicing, outstanding reports). Currently it can only be set via Excel import — there's no way to edit it per student.

## Solution

### Modify: `src/pages/SchoolStudentDatabase.tsx`

1. **Add missing fields to `Student` interface** (line ~56):
   - `fixed_monthly_amount?: number`
   - `current_amount_due?: number`

2. **Add Fixed Amount field to the Edit Student form** (after Payment Amount field, ~line 772):
   - Add a numeric input for `fixed_monthly_amount` with label "Fixed Monthly Amount"
   - Add a numeric input for `current_amount_due` with label "Current Amount Due"

3. **Include in the update query** (line ~648-668):
   - Add `fixed_monthly_amount` and `current_amount_due` to the `.update()` call
   - When `fixed_monthly_amount` changes, also sync `update_new` (these should match)

4. **Show Fixed Amount in the student table columns** if not already visible — add to the column visibility options

## Result
- Fixed Amount can be edited per student from the Edit Student modal
- Changes immediately reflect in Payment Management, Outstanding views, and AR invoicing
- Both `fixed_monthly_amount` and `current_amount_due` stay in sync when edited

