

# Swap Environments: Empty → LIVE, Data-Filled → TEST

## Current State (Problem)
- **NCG Holding** (`f40b0a9d...`) — has 167 JEs, 59 AR invoices, 34 customers = DATA
- **NCG Test Environment** (`a0000000...`) — has 0 JEs, 0 invoices, 0 customers = EMPTY
- You want the empty one as LIVE and the data one as TEST

## What Needs to Happen

We swap the **names and types** in the database, and update the **hardcoded IDs** in code so the system treats the empty database as the main production environment.

```text
BEFORE                                    AFTER
──────                                    ─────
f40b0a9d = NCG Holding (LIVE, has data)   f40b0a9d = NCG Test Environment (TEST, has data)
a0000000 = NCG Test (TEST, empty)         a0000000 = NCG Holding (Pvt) Ltd (LIVE, empty)
```

## Implementation

### 1. Database migration — Swap names and types

**Rename NCG Holding → Test:**
- `NCG Holding (Pvt) Ltd` → `NCG Test Environment`
- `business_unit_type` → `test`
- Sub-companies: `Yutong Sales` → `Test Yutong`, etc., all set to `business_unit_type = 'test'`

**Rename NCG Test → Live:**
- `NCG Test Environment` → `NCG Holding (Pvt) Ltd`
- `business_unit_type` → `holding`
- Sub-companies: `Test Yutong` → `Yutong Sales`, etc., with correct `business_unit_type` (yutong, school_bus, etc.)

### 2. Update hardcoded IDs in code (4 files)

Change `NCG_HOLDING_ID` from `f40b0a9d...` to `a0000000...0001` and `NCG_TEST_ID` from `a0000000...0001` to `f40b0a9d...` in:
- `src/contexts/CompanyContext.tsx`
- `src/hooks/useVehicleSalesFinance.ts`
- `src/hooks/useLeasingFinance.ts`
- `src/components/settings/LeasingFinanceSettings.tsx`

### 3. Update TestModeBanner.tsx test IDs

Swap the hardcoded test company IDs to point to the old NCG Holding sub-company IDs (which are now test).

### 4. Update CompanySwitcher.tsx if needed

Ensure badges still work correctly with the swapped types.

## Result
- **LIVE** = `a0000000...` = empty, clean COA, ready for real use
- **TEST** = `f40b0a9d...` = has all your old data for testing/reference
- All GL consolidation, finance logic, and hardcoded references point to the new live ID
- Visual badges (LIVE/TEST) work correctly based on `business_unit_type`

## Risk
Moderate — we are changing the core holding ID that all finance logic depends on. But since it's defined as a constant in 4 files and imported everywhere else, updating those 4 constants cleanly propagates the change.

