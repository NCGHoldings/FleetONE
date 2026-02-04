
# Fix: New Expense Button White Screen

## Problem Identified
The ExpenseRequestForm crashes immediately when opening because it contains `SelectItem` components with empty string values (`value=""`). Radix UI Select explicitly prohibits this.

**Error:** `A <Select.Item /> must have a value prop that is not an empty string`

## Root Cause
Two Select components have SelectItem with `value=""`:

1. **Line 205** - Bus selection:
```tsx
<SelectItem value="">-- No Bus --</SelectItem>
```

2. **Line 363** - Vendor selection:
```tsx
<SelectItem value="">-- Unknown Vendor --</SelectItem>
```

## Solution
Apply the established pattern from the codebase: use placeholder values like `"_none"` instead of empty strings, then convert back to `undefined` in the value change handlers.

### Changes Required

**File:** `src/components/accounting/ExpenseRequestForm.tsx`

### Fix 1: Bus Selection (Lines 198-215)

**Before:**
```tsx
<Select onValueChange={field.onChange} value={field.value || ""}>
  ...
  <SelectContent>
    <SelectItem value="">-- No Bus --</SelectItem>
    {buses?.map((bus) => (
      <SelectItem key={bus.id} value={bus.id}>
```

**After:**
```tsx
<Select 
  onValueChange={(val) => field.onChange(val === "_none" ? undefined : val)} 
  value={field.value || "_none"}
>
  ...
  <SelectContent>
    <SelectItem value="_none">-- No Bus --</SelectItem>
    {buses?.map((bus) => (
      <SelectItem key={bus.id} value={bus.id}>
```

### Fix 2: Vendor Selection (Lines 356-369)

**Before:**
```tsx
<Select onValueChange={field.onChange} value={field.value || ""}>
  ...
  <SelectContent>
    <SelectItem value="">-- Unknown Vendor --</SelectItem>
    {vendors?.map((vendor) => (
      <SelectItem key={vendor.id} value={vendor.id}>
```

**After:**
```tsx
<Select 
  onValueChange={(val) => field.onChange(val === "_none" ? undefined : val)} 
  value={field.value || "_none"}
>
  ...
  <SelectContent>
    <SelectItem value="_none">-- Unknown Vendor --</SelectItem>
    {vendors?.map((vendor) => (
      <SelectItem key={vendor.id} value={vendor.id}>
```

## Summary of Changes

| Location | Change |
|----------|--------|
| Line 198 | Update Select value and onValueChange for bus_id |
| Line 205 | Change `value=""` to `value="_none"` |
| Line 356 | Update Select value and onValueChange for vendor_id |
| Line 363 | Change `value=""` to `value="_none"` |

## Expected Outcome
After this fix:
1. Clicking "New Expense" will properly open the expense form dialog
2. Users can select "No Bus" or "Unknown Vendor" options without errors
3. The form will correctly submit `undefined` values for these optional fields
