

# Fix Finance Document Template Preview - Root Cause Analysis & Solution

## Problem Summary

The AR Invoice Preview is showing an "old version" without the branded header image because:

1. **Templates are not filtered by company** - The modal filters templates only by document type, but shows ALL company templates
2. **NCG Holding has no header image** - The invoice `INV-20260209-01ME` belongs to NCG Holding, which has `header_image_url: null`
3. **Company details are empty** - NCG Holding has null values for phone, email, address, logo_url
4. **No company_id is passed to modal** - The `FinanceDocumentPreviewModal` is called without `companyId` prop

---

## Root Cause Analysis

### Issue 1: Template Filtering Not Company-Specific

**Current Code (line 56-58):**
```typescript
const availableTemplates = allTemplates?.filter(
  (t) => t.template_type_id === templateType?.id && t.is_active
);
```

This shows ALL templates for ALL companies (7 companies × AR Invoice = 7 templates visible).

### Issue 2: Company ID Not Passed

**Current Code (AccountsReceivableView.tsx line 386-391):**
```typescript
<FinanceDocumentPreviewModal
  open={printDocumentOpen}
  onOpenChange={setPrintDocumentOpen}
  documentType={printDocumentType}
  documentData={printDocumentData}
  // companyId is NOT passed!
/>
```

### Issue 3: NCG Holding Template Not Configured

Database shows:
| Company | header_image_url | header_mode |
|---------|------------------|-------------|
| NCG Holding | `null` | logo_and_html |
| Yutong Sales | `https://...` (valid) | header_image |

### Issue 4: NCG Holding Company Details Missing

| Field | Value |
|-------|-------|
| address | null |
| phone | null |
| email | null |
| logo_url | null |

---

## Solution

### Fix 1: Pass Company ID to Preview Modal

Update all places where `FinanceDocumentPreviewModal` is called to pass the `companyId`.

**Files to Modify:**
- `src/components/accounting/AccountsReceivableView.tsx`
- `src/components/accounting/AccountsPayableView.tsx`
- `src/components/accounting/ARReceiptsView.tsx`
- `src/components/accounting/APPaymentsView.tsx`
- `src/components/accounting/ARCreditNotesView.tsx`
- `src/components/accounting/APDebitNotesView.tsx`

**Change:**
```typescript
<FinanceDocumentPreviewModal
  open={printDocumentOpen}
  onOpenChange={setPrintDocumentOpen}
  documentType={printDocumentType}
  documentData={printDocumentData}
  companyId={printDocumentData?.company_id}  // ADD THIS
/>
```

### Fix 2: Filter Templates by Company ID

Update `FinanceDocumentPreviewModal.tsx` to prioritize company-specific templates.

**Change in template filtering (line 56-58):**
```typescript
// Filter templates for this document type AND prioritize company-specific
const availableTemplates = allTemplates?.filter(
  (t) => {
    if (t.template_type_id !== templateType?.id || !t.is_active) return false;
    // If companyId provided, filter by company; otherwise show all
    if (companyId && t.company_id) return t.company_id === companyId;
    return true;
  }
);
```

### Fix 3: Auto-Select Company Template as Default

Update the auto-select logic to prefer the company's template:

```typescript
useEffect(() => {
  if (availableTemplates?.length && !selectedTemplateId) {
    // Prefer company-specific template, then any default, then first available
    const companyTemplate = companyId 
      ? availableTemplates.find((t) => t.company_id === companyId)
      : null;
    const defaultTemplate = availableTemplates.find((t) => t.is_default);
    const selectedTemplate = companyTemplate || defaultTemplate || availableTemplates[0];
    if (selectedTemplate) {
      setSelectedTemplateId(selectedTemplate.id);
    }
  }
}, [availableTemplates, selectedTemplateId, companyId]);
```

### Fix 4: Seed NCG Holding Header Image (Optional Database Update)

Run SQL migration to set header images for all companies:

```sql
-- Update NCG Holding template with header image
UPDATE document_templates 
SET header_image_url = '/lovable-uploads/ncg-header-banner.png',
    header_mode = 'header_image'
WHERE company_id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020'
AND template_type_id = (SELECT id FROM document_template_types WHERE type_code = 'ar_invoice');
```

---

## Files to Modify

| # | File | Changes |
|---|------|---------|
| 1 | `src/components/accounting/shared/FinanceDocumentPreviewModal.tsx` | Filter templates by company, improve auto-select |
| 2 | `src/components/accounting/AccountsReceivableView.tsx` | Pass companyId prop |
| 3 | `src/components/accounting/AccountsPayableView.tsx` | Pass companyId prop |
| 4 | `src/components/accounting/ARReceiptsView.tsx` | Pass companyId prop |
| 5 | `src/components/accounting/APPaymentsView.tsx` | Pass companyId prop |
| 6 | `src/components/accounting/ARCreditNotesView.tsx` | Pass companyId prop |
| 7 | `src/components/accounting/APDebitNotesView.tsx` | Pass companyId prop |

---

## Technical Details

### Updated Template Filtering Logic

```typescript
// Filter templates by document type AND company
const availableTemplates = useMemo(() => {
  if (!allTemplates || !templateType?.id) return [];
  
  return allTemplates.filter((t) => {
    // Must match template type and be active
    if (t.template_type_id !== templateType.id || !t.is_active) return false;
    
    // If companyId provided, filter to only that company's templates
    if (companyId) {
      return t.company_id === companyId;
    }
    
    // Otherwise show all
    return true;
  });
}, [allTemplates, templateType?.id, companyId]);
```

### Reset Template Selection on Company Change

```typescript
// Reset template selection when company or document type changes
useEffect(() => {
  setSelectedTemplateId("");
}, [companyId, documentType]);
```

---

## Expected Outcome

After implementation:

1. **Company-Specific Templates** - Only the relevant company's template appears in the selector
2. **Correct Headers** - Each company's configured header image displays properly
3. **Auto-Selection** - The correct company template is auto-selected
4. **Cross-Module Consistency** - All AR/AP views pass company context correctly

The preview will show:
- NCG Holding: Default template (until header image is configured in Settings)
- Yutong Sales: Professional header banner with blue branding
- Other companies: Their respective configured templates

