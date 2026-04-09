

# Fix Bank Statement Processing Crash

## Root Cause

Line 218 in `BankStatementUploadZone.tsx`:
```typescript
const dbNumeric = s.admission_no.replace(/[^0-9]/g, '');
```

When a student has `admission_no = null`, calling `.replace()` on null throws `TypeError: Cannot read properties of null (reading 'replace')`. This crashes the entire processing loop.

The same risk exists on line 224: `s.admission_no.toUpperCase()` and lines 231-232.

## Fix

Add null guards in the student matching filter (lines 217-238). Skip students with null/empty `admission_no`:

```typescript
const matchedStudents = students?.filter((s: any) => {
  if (!s.admission_no) return false;  // ← ADD THIS
  const dbNumeric = s.admission_no.replace(/[^0-9]/g, '');
  // ... rest unchanged
}) || [];
```

One line change fixes the crash.

## File to Change

- **`src/components/school/BankStatementUploadZone.tsx`** — add null check for `admission_no` before `.replace()` call (line ~217)

## Result

- 170 transactions process successfully instead of crashing
- Students with null admission numbers are safely skipped during matching
- All existing matching logic (exact, numeric, partial) continues working

