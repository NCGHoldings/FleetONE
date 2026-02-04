
# Fix: Expense Page Not Working

## Problem Identified
The expense page shows a blank white screen due to a React rendering error in `CompanyExpensesView.tsx`.

## Root Cause
On lines 169-194, the code uses a React fragment (`<>...</>`) inside a `.map()` without a key prop:

```tsx
{Object.entries(groupedCategories).map(([group, categories]) => (
  <>   // <-- Missing key prop - React error!
    <TableRow key={group}>...</TableRow>
    {categories.map((cat) => (...))}
  </>
))}
```

React requires all elements in a list to have unique keys. While the inner `TableRow` elements have keys, the outer fragment doesn't, which causes:
1. React console warnings
2. Potential rendering failures
3. White/blank screen in some cases

## Solution
Replace the shorthand fragment `<>...</>` with `<React.Fragment key={group}>...</React.Fragment>` or use the Fragment import.

### Code Fix

**File:** `src/components/accounting/CompanyExpensesView.tsx`

**Lines 169-194 - Before:**
```tsx
{Object.entries(groupedCategories).map(([group, categories]) => (
  <>
    <TableRow key={group} className="bg-muted/50">
      <TableCell colSpan={BUSINESS_UNITS.length + 2} className="font-semibold">
        {group}
      </TableCell>
    </TableRow>
    {categories.map((cat) => (
      <TableRow key={cat.key}>
        ...
      </TableRow>
    ))}
  </>
))}
```

**Lines 169-194 - After:**
```tsx
{Object.entries(groupedCategories).map(([group, categories]) => (
  <Fragment key={group}>
    <TableRow className="bg-muted/50">
      <TableCell colSpan={BUSINESS_UNITS.length + 2} className="font-semibold">
        {group}
      </TableCell>
    </TableRow>
    {categories.map((cat) => (
      <TableRow key={cat.key}>
        ...
      </TableRow>
    ))}
  </Fragment>
))}
```

Also add the import at the top:
```tsx
import { useState, Fragment } from "react";
```

## Files to Modify

| File | Change |
|------|--------|
| `src/components/accounting/CompanyExpensesView.tsx` | Add Fragment import and use it with key prop |

## Expected Outcome
After this fix:
1. The Expenses page will render correctly
2. All sub-tabs (Expense Requests, Company Expenses, Petty Cash, IOUs) will display properly
3. No React key warnings in console
