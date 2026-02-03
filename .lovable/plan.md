
# Fix: Special Hire Quotation Duplicate Number Generation

## Problem
When duplicating Special Hire quotations, the modal manually generates quotation numbers using a flawed approach:
1. Counts quotations created today
2. Generates numbers like `QUO-2026-0203-v1.5`
3. When creating multiple copies, the count query doesn't see uncommitted inserts from the same loop
4. Results in duplicate or stale quotation numbers

## Root Cause
The database already has a **working atomic sequence** for generating quotation numbers:
```sql
DEFAULT: 'QUO-' || EXTRACT(year FROM now()) || '-' || lpad(nextval('quotation_seq'), 4, '0')
-- Example: QUO-2026-1124, QUO-2026-1125, etc.
```

But the duplicate modal overrides this by explicitly setting `quotation_no`, bypassing the safe default.

## Solution
**Remove the manual `quotation_no` generation** and let the database default handle it automatically.

### Changes to `SpecialHireQuotationRepeatModal.tsx`

| Change | Description |
|--------|-------------|
| Remove `generateQuotationNo` function | Not needed - database handles this |
| Remove `quotation_no` from insert data | Let database default generate it |
| Fetch created quotation numbers for toast | Show the actual generated numbers to user |

### Code Changes

**Before (buggy):**
```typescript
const quotationNo = await generateQuotationNo(i);
const duplicateData = {
  quotation_no: quotationNo,  // Overrides database default
  // ... other fields
};
```

**After (fixed):**
```typescript
const duplicateData = {
  // quotation_no NOT included - database default will generate it
  // ... other fields
};

const { data } = await supabase
  .from('special_hire_quotations')
  .insert([duplicateData])
  .select('quotation_no')  // Get the generated number
  .single();
```

## Implementation

### File: `src/components/special-hire/SpecialHireQuotationRepeatModal.tsx`

1. **Delete lines 46-62**: Remove the `generateQuotationNo` function entirely

2. **Update handleRepeat function (around line 84)**:
   - Remove the call to `generateQuotationNo(i)`
   - Remove `quotation_no` from the `duplicateData` object (line 89)
   - Keep the `.select()` call to fetch the auto-generated quotation_no

3. **Update success toast**:
   - Show the actual quotation numbers that were created
   - Example: "Created QUO-2026-1124, QUO-2026-1125"

## Technical Details

### Database Sequence Behavior
- `quotation_seq` is atomic - each `nextval()` call returns a unique number
- Even with concurrent inserts, numbers will never collide
- Format: `QUO-{YEAR}-{4-DIGIT-SEQUENCE}`

### Version Number
- Keep `version_number: '1.0'` in the insert - this is for version tracking, not the quotation number
- The quotation number uniquely identifies the quotation
- Version number tracks revisions of the same quotation

## Files to Modify

| File | Action |
|------|--------|
| `src/components/special-hire/SpecialHireQuotationRepeatModal.tsx` | Remove manual number generation, let DB default work |

## Expected Result
After fix:
- Each duplicated quotation gets a unique, sequential number from the database
- Numbers follow format: `QUO-2026-1124`, `QUO-2026-1125`, etc.
- No race conditions or duplicate numbers
- Multiple copies created simultaneously all get unique numbers
