
# Complete Finance ERP Data Architecture Fix - AR/AP Payment Flow

## Problem Summary

The customer dropdown shows empty because of an **architecture mismatch** between how data is stored vs. retrieved. The system uses a Consolidated GL Architecture for NCG Holding sub-companies (SBO, YUT, LTV, SPH, SNT), but this pattern is inconsistently applied.

### Current Behavior (Broken)
When "Light Vehicle Sales" is selected:
- Customer "mihin" was created with `company_id = LTV` and `business_unit_code = NULL`
- But `useCustomers()` query looks for `company_id = NCG Holding` AND `business_unit_code = LTV`
- Result: Empty dropdown

### Expected Behavior (Correct)
For NCG Holding sub-companies:
- Store data with `company_id = NCG Holding` (parent) + `business_unit_code = LTV` (tag)
- Query with same filters to retrieve data

---

## Files Requiring Changes

### 1. Master Data Views (Fix Storage Pattern)

| File | Issue | Fix |
|------|-------|-----|
| `CustomerMasterView.tsx` | Uses `selectedCompanyId` directly | Use `effectiveCompanyId` + `business_unit_code` |
| `VendorMasterView.tsx` | Same issue | Same fix |

### 2. Data Fetching Hooks (Fix Query Pattern)

| Hook | Issue | Fix |
|------|-------|-----|
| `useARReceipts` | Missing business_unit_code filter | Add `autoBusinessUnitCode` filter |
| `useAPPayments` | Missing business_unit_code filter | Add `autoBusinessUnitCode` filter |
| `useBankAccounts` | Uses `selectedCompanyId` directly | Use `effectiveCompanyId` |

### 3. Mutation Hooks (Fix Insert Pattern)

| Mutation | Issue | Fix |
|----------|-------|-----|
| `useCreateARReceipt` | Only sets `company_id` | Add `business_unit_code` |
| `useCreateAPPayment` | Only sets `company_id` | Add `business_unit_code` |
| `useCreateARInvoice` | Only sets `company_id` | Add `business_unit_code` |
| `useCreateAPInvoice` | Only sets `company_id` | Add `business_unit_code` |

---

## Implementation Details

### Phase 1: Fix CustomerMasterView.tsx

```typescript
// BEFORE (broken)
const { selectedCompanyId } = useCompany();
query.eq("company_id", selectedCompanyId);
insert({ company_id: selectedCompanyId });

// AFTER (correct)
const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode, isSubCompanyOfNCGHolding } = useCompany();
const effectiveCompanyId = getEffectiveCompanyId();
const businessUnitCode = getBusinessUnitCode();

// Query
query.eq("company_id", effectiveCompanyId);
if (businessUnitCode) {
  query.eq("business_unit_code", businessUnitCode);
}

// Insert
insert({
  company_id: effectiveCompanyId,
  business_unit_code: businessUnitCode,
});
```

### Phase 2: Fix VendorMasterView.tsx
Same pattern as CustomerMasterView.

### Phase 3: Fix useAccountingData.ts

```typescript
// useARReceipts - Add business unit filter
export const useARReceipts = () => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();
  
  return useQuery({
    queryKey: ["ar-receipts", effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      let query = supabase.from("ar_receipts").select(...);
      
      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }
      
      // Add business unit filter for sub-company views
      if (autoBusinessUnitCode) {
        query = query.eq("business_unit_code", autoBusinessUnitCode);
      }
      
      return (await query).data;
    },
  });
};

// Same fix for useAPPayments and useBankAccounts
```

### Phase 4: Fix useAccountingMutations.ts

```typescript
// useCreateARReceipt - Add business unit code
export const useCreateARReceipt = () => {
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  
  return useMutation({
    mutationFn: async (receipt) => {
      const effectiveCompanyId = getEffectiveCompanyId();
      const businessUnitCode = getBusinessUnitCode();
      
      await supabase.from("ar_receipts").insert([{
        ...receipt,
        company_id: effectiveCompanyId,        // Parent company
        business_unit_code: businessUnitCode,  // Sub-company tag
      }]);
    },
  });
};

// Same fix for useCreateAPPayment, useCreateARInvoice, useCreateAPInvoice
```

### Phase 5: Data Migration SQL (Run Once)

Fix existing records that were stored incorrectly:

```sql
-- Fix customers created under sub-company IDs
UPDATE customers 
SET 
  company_id = companies.parent_company_id,
  business_unit_code = companies.short_code
FROM companies
WHERE customers.company_id = companies.id 
  AND companies.parent_company_id IS NOT NULL
  AND customers.business_unit_code IS NULL;

-- Same pattern for vendors, ar_invoices, ap_invoices, ar_receipts, ap_payments
```

---

## Architecture Diagram

```text
CONSOLIDATED GL ARCHITECTURE:

+------------------------+     +------------------------+
|     NCG Holding        |     |     NCG Express        |
|   (Parent Company)     |     |  (Standalone Company)  |
+------------------------+     +------------------------+
| company_id: NCGH       |     | company_id: NCGE       |
| business_unit_code:    |     | business_unit_code:    |
|   NULL (parent)        |     |   NULL (standalone)    |
+------------------------+     +------------------------+
          |
   +------+------+------+------+------+
   |      |      |      |      |      |
  SBO    YUT    SPH    LTV    SNT
   |      |      |      |      |
   v      v      v      v      v
All sub-companies store data with:
  - company_id = NCG Holding ID
  - business_unit_code = SBO/YUT/SPH/LTV/SNT
```

---

## Query Invalidation Fix

Ensure all AR/AP mutations properly invalidate queries with the correct keys:

```typescript
// After mutation success
queryClient.invalidateQueries({ queryKey: ["ar-receipts"] });
queryClient.invalidateQueries({ queryKey: ["ar-invoices"] });
queryClient.invalidateQueries({ queryKey: ["customers"] });
queryClient.invalidateQueries({ queryKey: ["accounting-summary"] });
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/accounting/CustomerMasterView.tsx` | Use effectiveCompanyId + business_unit_code |
| `src/components/accounting/VendorMasterView.tsx` | Use effectiveCompanyId + business_unit_code |
| `src/hooks/useAccountingData.ts` | Fix useARReceipts, useAPPayments, useBankAccounts |
| `src/hooks/useAccountingMutations.ts` | Add business_unit_code to all AR/AP mutations |

---

## Expected Outcome

After implementation:

1. Customer dropdown will show customers filtered by the selected sub-company's business unit
2. Vendor dropdown will work the same way
3. AR Receipts will properly show receipts for the selected business unit
4. AP Payments will properly show payments for the selected business unit
5. All new records will be created with correct company_id (parent) and business_unit_code (tag)
6. Existing data can be migrated via SQL script
