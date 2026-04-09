

# Fix: Reports Tab Showing "Coming Soon" Instead of Dashboard

## Root Cause

The code changes are correctly in place — `SpecialHireReportsTab` is imported and rendered in the `reports` tab. The "coming soon" text no longer exists in `SpecialHire.tsx`. The screenshot shows a stale/cached version OR a build error is preventing the new code from compiling.

There is one confirmed bug: **`PaymentCollectionReport.tsx` uses `<rect>` instead of `<Cell>` inside `<Bar>`**, which is invalid Recharts usage and could cause a runtime crash that cascades.

## Fix

### 1. Fix `PaymentCollectionReport.tsx` — replace `<rect>` with `<Cell>`

The `<Bar>` children should use Recharts `Cell` component, not raw SVG `<rect>`:

```tsx
// Before (broken):
import { BarChart, Bar, ... } from "recharts";
<Bar dataKey="value">
  {paymentAging.map((_, i) => {
    const colors = [...];
    return <rect key={i} fill={colors[i]} />;
  })}
</Bar>

// After (fixed):
import { BarChart, Bar, Cell, ... } from "recharts";
<Bar dataKey="value">
  {paymentAging.map((_, i) => (
    <Cell key={i} fill={colors[i]} />
  ))}
</Bar>
```

### 2. Force a clean build

The code is already correct for loading the reports tab. If the build cache is stale, a rebuild should resolve the "coming soon" display.

## Files to Change

- **`src/components/special-hire/reports/PaymentCollectionReport.tsx`** — import `Cell` from recharts, replace `<rect>` with `<Cell>`

## Result

- Reports tab renders the full 7-section automated dashboard instead of "coming soon"
- Payment aging chart displays colored bars correctly

