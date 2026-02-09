
# Fix Yutong AR Invoice Template Display - Complete Analysis & Solution

## Problem Root Cause Found

The system uses a **Consolidated GL Architecture** where:
- Sub-companies (Yutong, Sinotruck, SBO, etc.) post to the **parent company (NCG Holding)** for consolidated GL
- Each invoice stores: `company_id = NCG Holding` + `business_unit_code = YUT/SBO/SNT/etc.`

**The template system currently filters by `company_id` (NCG Holding), but should use `business_unit_code` to find the correct sub-company template.**

---

## Data Flow Diagram (Current vs Expected)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CURRENT BROKEN FLOW                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. User selects "Yutong Sales" company                                     │
│                    ↓                                                        │
│  2. Creates AR Invoice (useCreateARInvoice)                                 │
│                    ↓                                                        │
│  3. getEffectiveCompanyId() returns NCG_HOLDING_ID (parent)                 │
│                    ↓                                                        │
│  4. Invoice saved with:                                                     │
│     company_id: f40b0a9d (NCG Holding) ← PARENT                             │
│     business_unit_code: "YUT" ← SUB-COMPANY TAG                             │
│                    ↓                                                        │
│  5. User clicks "Print Preview"                                             │
│                    ↓                                                        │
│  6. FinanceDocumentPreviewModal receives:                                   │
│     companyId = printDocumentData.company_id = NCG_HOLDING_ID  ← WRONG!     │
│                    ↓                                                        │
│  7. Template filtered by company_id = NCG Holding                           │
│     Shows: "NCG Holding" template with empty header  ← WRONG!               │
│                                                                             │
│  8. Company details lookup uses company_id = NCG Holding                    │
│     Shows: Empty Tel/Email (NCG Holding has no details)  ← WRONG!           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      EXPECTED CORRECT FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  5. User clicks "Print Preview"                                             │
│                    ↓                                                        │
│  6. FinanceDocumentPreviewModal receives:                                   │
│     companyId = printDocumentData.company_id = NCG_HOLDING_ID               │
│     businessUnitCode = printDocumentData.business_unit_code = "YUT" ← KEY!  │
│                    ↓                                                        │
│  7. Resolve actual company from business_unit_code:                         │
│     "YUT" → efc37802 (Yutong Sales)  ← CORRECT!                             │
│                    ↓                                                        │
│  8. Template filtered by company_id = Yutong Sales                          │
│     Shows: Yutong template with "Full Banner" header  ← CORRECT!            │
│                                                                             │
│  9. Company details lookup uses company_id = Yutong Sales                   │
│     Shows: sudarakap@lyceumglobal.co, +94711244956  ← CORRECT!              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Reference

| Company | ID | Parent | Short Code | Has Logo | Has Template Header |
|---------|----|---------|----|----------|---------------------|
| NCG Holding | f40b0a9d... | NULL | NCGH | ❌ | ❌ NULL |
| **Yutong Sales** | efc37802... | NCG Holding | **YUT** | ✅ | ✅ Full Banner |
| Sinotruck Sales | fe7439e7... | NCG Holding | SNT | ❌ | ❌ NULL |
| Light Vehicle | ac957087... | NCG Holding | LTV | ❌ | ❌ NULL |
| School Bus | 0fba4a2f... | NCG Holding | SBO | ❌ | ❌ NULL |
| Special Hire | bfd054c7... | NCG Holding | SPH | ❌ | ❌ NULL |
| NCG Express | 7ece7595... | NULL | NCGE | ❌ | ❌ NULL |

**Invoice Data:**
| Invoice # | company_id | business_unit_code |
|-----------|------------|-------------------|
| INV-20260209-TMIA | NCG Holding | **YUT** |

---

## Solution Implementation

### Step 1: Add `businessUnitCode` Prop to Modal

Update `FinanceDocumentPreviewModal` to accept `businessUnitCode` and resolve the actual sub-company.

**File: `src/components/accounting/shared/FinanceDocumentPreviewModal.tsx`**

Add new prop and resolution logic:
```typescript
interface FinanceDocumentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: string;
  documentData: any;
  companyId?: string;
  businessUnitCode?: string; // NEW: For consolidated GL lookups
}
```

Add company resolution:
```typescript
// Resolve actual company: If businessUnitCode provided, find sub-company by short_code
const resolvedCompanyId = useMemo(() => {
  if (businessUnitCode) {
    // Find sub-company by short_code (YUT, SBO, SNT, etc.)
    const subCompany = companies?.find(c => c.short_code === businessUnitCode);
    if (subCompany) return subCompany.id;
  }
  return companyId || documentData?.company_id;
}, [businessUnitCode, companyId, documentData?.company_id, companies]);
```

### Step 2: Pass `businessUnitCode` from AR/AP Views

Update all views that call `FinanceDocumentPreviewModal` to pass the `businessUnitCode`.

**Files to Modify:**
1. `src/components/accounting/AccountsReceivableView.tsx`
2. `src/components/accounting/AccountsPayableView.tsx`
3. `src/components/accounting/ARReceiptsView.tsx`
4. `src/components/accounting/APPaymentsView.tsx`
5. `src/components/accounting/ARCreditNotesView.tsx`
6. `src/components/accounting/APDebitNotesView.tsx`

**Change:**
```typescript
<FinanceDocumentPreviewModal
  open={printDocumentOpen}
  onOpenChange={setPrintDocumentOpen}
  documentType={printDocumentType}
  documentData={printDocumentData}
  companyId={printDocumentData?.company_id}
  businessUnitCode={printDocumentData?.business_unit_code} // ADD THIS
/>
```

### Step 3: Update Template Filtering Logic

Use `resolvedCompanyId` instead of `companyId` for template filtering:

```typescript
// Filter templates for this document type AND resolved company
const availableTemplates = allTemplates?.filter((t) => {
  if (t.template_type_id !== templateType?.id || !t.is_active) return false;
  if (resolvedCompanyId) {
    return t.company_id === resolvedCompanyId;
  }
  return true;
});
```

### Step 4: Update Company Lookup for Placeholders

Ensure company details (phone, email, address) come from the resolved company:

```typescript
// Use resolved company for all lookups
const company = companies?.find((c) => c.id === resolvedCompanyId);
```

---

## Files to Modify Summary

| # | File | Changes |
|---|------|---------|
| 1 | `src/components/accounting/shared/FinanceDocumentPreviewModal.tsx` | Add `businessUnitCode` prop, resolve company, update filtering |
| 2 | `src/components/accounting/AccountsReceivableView.tsx` | Pass `businessUnitCode` prop |
| 3 | `src/components/accounting/AccountsPayableView.tsx` | Pass `businessUnitCode` prop |
| 4 | `src/components/accounting/ARReceiptsView.tsx` | Pass `businessUnitCode` prop |
| 5 | `src/components/accounting/APPaymentsView.tsx` | Pass `businessUnitCode` prop |
| 6 | `src/components/accounting/ARCreditNotesView.tsx` | Pass `businessUnitCode` prop |
| 7 | `src/components/accounting/APDebitNotesView.tsx` | Pass `businessUnitCode` prop |

---

## Expected Outcome After Fix

When viewing invoice `INV-20260209-TMIA`:

| Before Fix | After Fix |
|------------|-----------|
| Template: NCG Holding | Template: **Yutong Sales** |
| Header: Empty | Header: **Full Banner Image** |
| Company Name: NCG Holding | Company Name: **Yutong Sales** |
| Tel: (empty) | Tel: **+94711244956** |
| Email: (empty) | Email: **sudarakap@lyceumglobal.co** |
| Address: (empty) | Address: **10, Raymond Road** |

---

## Technical Architecture Flow (After Fix)

```text
Document Data:
  ├─ company_id: NCG Holding (f40b0a9d...)
  └─ business_unit_code: "YUT"
              │
              ▼
FinanceDocumentPreviewModal:
  ├─ businessUnitCode = "YUT"
  │         │
  │         ▼
  ├─ Resolve: companies.find(c => c.short_code === "YUT")
  │         │
  │         ▼
  ├─ resolvedCompanyId = Yutong Sales (efc37802...)
  │         │
  │         ├──────────────────────────────┐
  │         ▼                              ▼
  ├─ Filter Templates:                Company Lookup:
  │   company_id = Yutong Sales        company = Yutong Sales
  │         │                              │
  │         ▼                              ▼
  ├─ Template: Yutong AR Invoice       Name: Yutong Sales
  │   header_mode: header_image        Phone: +94711244956
  │   header_image_url: (Full Banner)  Email: sudarakap@...
  │         │                          Address: 10, Raymond Road
  │         └─────────────┬────────────┘
  │                       │
  │                       ▼
  └─────────► RENDERED INVOICE WITH CORRECT TEMPLATE + COMPANY DATA
```

---

## Cross-Module Impact

This fix ensures consistent template resolution across all consolidated GL scenarios:
- **AR Invoices** created under Yutong Sales → Show Yutong template
- **AR Receipts** created under SBO → Show SBO template
- **AP Invoices** created under Sinotruck → Show Sinotruck template
- **Journal Entries** tagged with business unit → Show correct template
