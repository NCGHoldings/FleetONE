

# Fix: Payment Number Running & Direct Payment Toggle Not Working

## Root Cause (Single Bug)

Both issues stem from **one line** — the `generateNumber` function in the `useEffect` dependency array (line 156):

```typescript
useEffect(() => {
  if (open) {
    setIsDirectPayment(false);  // ← resets toggle every re-render
    generateNumber("payment").then((num) => {
      form.setValue("payment_number", num);  // ← increments sequence every re-render
    });
  }
}, [open, isAdvanceMode, form, generateNumber]); // ← generateNumber is a NEW function ref every render
```

`useGenerateNumber()` returns a **new async function on every render** (not memoized). This makes the `useEffect` fire on every render while the dialog is open, which:

1. **Calls `generate_entity_number` RPC repeatedly** → payment number keeps incrementing in the database
2. **Resets `setIsDirectPayment(false)` repeatedly** → user can never toggle Direct Payment on

## Fix

### 1. `src/hooks/useNumbering.ts` — Memoize `useGenerateNumber` return value

Wrap the returned function in `useCallback` so it has a stable reference:

```typescript
import { useCallback } from "react";

export function useGenerateNumber() {
  const { selectedCompanyId } = useCompany();

  return useCallback(async (entityType: string): Promise<string> => {
    // ... same logic
  }, [selectedCompanyId]);
}
```

### 2. `src/components/accounting/APPaymentForm.tsx` — Guard the useEffect

Add a ref flag to ensure the payment number is only generated **once** per dialog open, not on every render:

- Use a `useRef(false)` flag (`hasGeneratedNumber`) 
- Set it `true` after generating, reset to `false` when dialog closes
- Remove `generateNumber` from the dependency array (it will now be stable anyway)

### Files to Edit

| File | Change |
|---|---|
| `src/hooks/useNumbering.ts` | Wrap returned function in `useCallback` |
| `src/components/accounting/APPaymentForm.tsx` | Add ref guard to prevent repeated number generation |

