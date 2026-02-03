
# Fix: Vendor Dropdown Not Showing Vendors

## Problem
The vendor dropdown in AP Invoice form (and other forms) is empty because:

1. **Vendor creation doesn't follow Consolidated GL pattern** - The `useCreateVendor` mutation saves vendors with `company_id = selected company` instead of using the parent company ID with business_unit_code tagging
2. **Existing vendor has no business_unit_code** - The vendor "abisheka fernado" was created under School Bus Operations but has `business_unit_code: NULL`
3. **Vendor query filters by business_unit_code** - When viewing under a sub-company (like School Bus or Special Hire), vendors without matching business_unit_code are filtered out

## Current Database State
```
Vendor: "abisheka fernado"
- company_id: 0fba4a2f-598b-47e8-b863-283d00380b06 (School Bus Operations)
- business_unit_code: NULL  ← Missing!
```

## Root Cause Analysis

The **Consolidated GL Architecture** requires:
- All master data (customers, vendors) stored under **NCG Holding parent company_id**
- Tagged with **business_unit_code** (SBO, YUT, SPH, LTV, SNT)
- Hooks filter by both parent company_id AND business_unit_code

But `useCreateVendor` currently:
- Uses `selectedCompanyId` directly (the sub-company ID)
- Does NOT set `business_unit_code`

## Solution

### 1. Fix useCreateVendor Mutation

Update to follow Consolidated GL pattern:

```typescript
// BEFORE (broken)
const { data, error } = await supabase
  .from("vendors")
  .insert([{
    ...vendor,
    company_id: selectedCompanyId,  // Sub-company ID
  }])

// AFTER (fixed)
const effectiveCompanyId = getEffectiveCompanyId();
const businessUnitCode = isSubCompanyOfNCGHolding(selectedCompanyId) 
  ? getBusinessUnitCode() 
  : null;

const { data, error } = await supabase
  .from("vendors")
  .insert([{
    ...vendor,
    company_id: effectiveCompanyId,  // Parent company ID (NCG Holding)
    business_unit_code: businessUnitCode,  // SBO, YUT, SPH, etc.
  }])
```

### 2. Fix useUpdateVendor Mutation

Same pattern - ensure business_unit_code is preserved/updated correctly.

### 3. Fix useCreateCustomer Mutation

Apply same fix for customer creation (same architecture).

### 4. Update Existing Data

Run SQL to fix the existing vendor:

```sql
-- Fix existing vendor to use Consolidated GL pattern
UPDATE vendors 
SET 
  company_id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020',  -- NCG Holding
  business_unit_code = 'SBO'  -- School Bus Operations
WHERE id = 'b6f69188-058d-4c80-891a-a5348f124e53';
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useAccountingMutations.ts` | Update `useCreateVendor` and `useCreateCustomer` to use Consolidated GL pattern |
| Database | Update existing vendor to have correct company_id and business_unit_code |

## Technical Details

### Pattern Reference (from useCreateAPInvoice)
```typescript
const effectiveCompanyId = getEffectiveCompanyId();
const businessUnitCode = isSubCompanyOfNCGHolding(selectedCompanyId) 
  ? getBusinessUnitCode() 
  : null;

// Insert with parent company_id + business_unit_code
```

### After Fix

When creating a vendor under "School Bus Operations":
- `company_id` → NCG Holding ID
- `business_unit_code` → "SBO"

When viewing vendors under "School Bus Operations":
- Query filters by `company_id = NCG Holding` AND `business_unit_code = 'SBO'`
- Vendor appears in dropdown

## Business Unit Codes Reference

| Company | Short Code |
|---------|------------|
| School Bus Operations | SBO |
| Yutong Sales | YUT |
| Special Hire | SPH |
| Light Vehicle Sales | LTV |
| Sinotruck Sales | SNT |
