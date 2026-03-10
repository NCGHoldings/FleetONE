

# Fix: Intermittent AR Invoice Generation Failures

## Root Cause

The `entry_number` for journal entries uses only the **first 4 characters** of the student UUID:

```
SBS-JE-20260310-A1B2
SBS-ADV-20260310-A1B2
```

Since `entry_number` has a **UNIQUE constraint** on the `journal_entries` table, when two students share the same first 4 UUID characters, the second insert fails with a unique constraint violation. This is why it works "sometimes" — it depends on whether students in the batch happen to collide on those 4 chars.

With 103 students and only 4 hex chars (65,536 possibilities), collisions are statistically likely (~7% chance with 100 students — birthday problem).

## Fix

### 1. `src/hooks/useSchoolBusFinance.ts` — Make entry_number truly unique

Replace the 4-char student UUID prefix with the **global index** (which is already unique per batch) combined with a short random suffix:

**Current (broken):**
```typescript
const studentShortId = student.id.substring(0, 4).toUpperCase();
const entryNumber = `SBS-JE-${format(new Date(), "yyyyMMdd")}-${studentShortId}`;
```

**Fixed:**
```typescript
const uniqueSuffix = `${String(globalIndex).padStart(5, "0")}-${student.id.substring(0, 4).toUpperCase()}`;
const entryNumber = `SBS-JE-${format(invoiceMonth, "yyyyMM")}-${uniqueSuffix}`;
```

This ensures uniqueness by combining the sequential index with the student ID fragment. The month format also ties the entry to the invoice month rather than the run date.

Apply the same fix to the advance entry number (`SBS-ADV-...`).

### 2. Files to Edit

| File | Change |
|---|---|
| `src/hooks/useSchoolBusFinance.ts` | Fix `entryNumber` and `advanceEntryNumber` generation to use globalIndex + studentShortId instead of studentShortId alone |

This is a single targeted fix — no UI changes needed. The intermittent failures will stop immediately.

