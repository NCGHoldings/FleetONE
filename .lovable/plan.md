
# Fix: Signature Page Toggle — CHECK Constraint Violation

## Root Cause

The `special_hire_signature_settings` table has a CHECK constraint:
```
CHECK (signature_role IN ('prepared_by', 'checked_by', 'approved_by'))
```

The code tries to insert a row with `signature_role = 'signature_page'`, which violates this constraint → **400 Bad Request** every time the page loads and every time the toggle is clicked.

## Plan

### 1. Database migration — add `signature_page` to the CHECK constraint
Drop the existing constraint and recreate it with the additional value:
```sql
ALTER TABLE special_hire_signature_settings 
  DROP CONSTRAINT special_hire_signature_settings_signature_role_check;

ALTER TABLE special_hire_signature_settings 
  ADD CONSTRAINT special_hire_signature_settings_signature_role_check 
  CHECK (signature_role = ANY (ARRAY['prepared_by','checked_by','approved_by','signature_page']));
```

### 2. No code changes needed
The existing code in `SpecialHireSignatureSettings.tsx` already handles auto-creating the row and immediate toggle save — it just couldn't insert because the constraint blocked it.

## Files
- **New migration**: Update CHECK constraint on `special_hire_signature_settings.signature_role`

## Result
The toggle will persist correctly. When disabled, all Special Hire documents (invoices, receipts, payment reminders) will generate without the signature page.
