

# Fix: COA and Item Categories Must Use Parent Company (Consolidated Architecture)

## Problem

When you select a test sub-company (e.g., "Test School Bus"), `getEffectiveCompanyId()` returns the sub-company ID directly instead of the parent "NCG Test Environment" ID. This means:

- **COA dropdown** only finds 7 stray accounts under Test School Bus instead of the full 224 accounts under NCG Test Environment
- **Item categories** for test sub-companies point to COA accounts under the TEST parent, but queries filter by the sub-company ID — causing mismatches
- Same issue would occur for any test sub-company (Test Yutong, Test Sinotruck, etc.)

The LIVE side works correctly because `isSubCompanyOfNCGHolding()` consolidates live sub-companies to NCG Holding. But test sub-companies are NOT consolidated because the function only checks `parent_company_id === NCG_HOLDING_ID`.

## Fix

### 1. Update `getEffectiveCompanyId()` in CompanyContext.tsx

Add a check: if the selected company's parent is `NCG_TEST_ID`, consolidate to `NCG_TEST_ID` — same pattern as NCG Holding consolidation.

```text
getEffectiveCompanyId():
  if parent === NCG_HOLDING_ID → return NCG_HOLDING_ID
  if parent === NCG_TEST_ID   → return NCG_TEST_ID    ← NEW
  else → return selectedCompanyId
```

Also add a helper `isSubCompanyOfNCGTest()` and update `getBusinessUnitCode()` to work for test sub-companies too.

### 2. Move item categories from test sub-company IDs to NCG Test Environment parent

Currently 8 categories exist per test sub-company (6 sub-companies × 8 = 48 rows). These should all use `company_id = f40b0a9d...` (NCG Test Environment) instead, since the COA is consolidated there. This is a database update via migration.

### 3. Clean up stray COA entries under test sub-companies

The 7 accounts under Test School Bus, Test Yutong, etc. are duplicates. They should be removed since all COA lives under the parent. This is also a migration cleanup.

## Files to modify

1. **`src/contexts/CompanyContext.tsx`** — Add `isSubCompanyOfNCGTest()`, update `getEffectiveCompanyId()` and `getBusinessUnitCode()` to handle test hierarchy
2. **New migration** — Move item_categories to parent test company ID, delete stray COA entries under test sub-companies

## Result

- Selecting "Test School Bus" → COA shows all 224 accounts from NCG Test Environment
- Item categories resolve correctly to the shared test COA
- Revenue Account dropdown shows specific accounts (41101001 SALES - YUTONG, 41103001 TRANSPORT INCOME - SCHOOL BUSES, etc.) instead of just "4100 - Sales Revenue"
- Same consolidated architecture for both LIVE and TEST hierarchies

