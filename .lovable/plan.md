

# Fix Build Errors Blocking Quotation Count Fix

## Problem
The paginated fetch code for quotations is correct but **cannot deploy** because the build is failing due to pre-existing TypeScript errors across many Supabase Edge Functions. The errors fall into three categories:

1. **`'error' is of type 'unknown'`** — Accessing `.message` or `.stack` on untyped `catch` variables (14+ files)
2. **`'bus' is possibly 'undefined'`** — The `bus` variable in `fetch-fios-tracking` can be undefined after `.find()` but is used without a null check (20+ occurrences)
3. **Missing properties on `FIOSPosition`** — `gsm` and `hdop` not declared in the interface
4. **Index signature error** — `analysisType` (string) used to index a typed object in `analyze-trips`

## Fix

### 1. Fix `error` type in all affected edge functions (14 files)
Cast `error` to `Error` in all catch blocks:
```typescript
} catch (error) {
  // Change: error.message → (error as Error).message
  // Change: error.stack → (error as Error).stack
}
```

**Files**: `aggregate-fleet-analytics`, `analyze-trips`, `auto-sync-attendance`, `calculate-commissions`, `check-fuel-alerts`, `create-temporary-account`, `discover-bus-api`, `execute-workflow-rules`, `fetch-driver-events`, `fetch-fios-mileage`, `fetch-fios-tracking`, `grant-accounting-access`, and any others in the build error list.

### 2. Fix `fetch-fios-tracking/index.ts` — `bus` possibly undefined
Add a guard after the auto-create block (around line 406):
```typescript
if (!bus) {
  unmatchedVehicles.push(vehicle.nm);
  continue;
}
```
This ensures all subsequent `bus.` references are safe.

### 3. Fix `FIOSPosition` interface — add missing properties
```typescript
interface FIOSPosition {
  // ...existing fields...
  gsm?: number;
  hdop?: number;
}
```

### 4. Fix `analyze-trips/index.ts` — index signature
```typescript
return `${basePrompt}\n\n${typeSpecific[analysisType as keyof typeof typeSpecific] || typeSpecific.comprehensive}`;
```

### Result
Once these build errors are resolved, the already-implemented paginated fetch will deploy and show the correct quotation count (2092+) instead of 2000.

