
# Yutong Document Template Integration & Cross-Check Plan

## Problem Summary

Based on my analysis, there are two separate document systems that need interconnection:

1. **Vehicle Sales Invoices** (Yutong, Sinotruck, Light Vehicle) - use standalone HTML generators
2. **Finance Module Documents** (AR/AP Invoices, Receipts, etc.) - use the Document Template system

The user expects:
- Yutong documents to use professional headers like the PDF reference
- All documents across modules to share the template system
- Header images to display properly in previews

---

## Current Architecture Issues

### Issue 1: Two Disconnected Document Systems

| System | Location | Header Source |
|--------|----------|---------------|
| Yutong Order Invoices | `yutong-order-invoice-generator.ts` | Hardcoded `/lovable-uploads/yutong-invoice-header.png` |
| Finance AR/AP Invoices | `FinanceDocumentPreviewModal.tsx` | `document_templates.header_image_url` |

### Issue 2: Template Headers Not Configured

Most Yutong templates in the database have `header_image_url: null` except for AR Invoice which was recently updated.

### Issue 3: Missing Template-to-Document Linking

Yutong order documents don't reference the Finance template system at all.

---

## Solution Overview

### Phase 1: Fix Finance Template Headers (Quick Win)

**Goal:** Ensure all Yutong Finance templates have proper header images

**Changes:**
1. Create utility to bulk-update Yutong templates with professional header image
2. Add header image URL to all 12 document types for Yutong company

### Phase 2: Add Template Selection to Yutong Order Invoices

**Goal:** Allow Yutong order invoices to optionally use Finance templates

**New Files:**
- `src/components/yutong/YutongInvoiceTemplateSelector.tsx` - Template dropdown for Yutong invoices

**Modified Files:**
- `src/components/yutong/YutongOrderInvoiceViewModal.tsx` - Add template selector option
- `src/lib/yutong-order-invoice-generator.ts` - Support template-based header rendering

### Phase 3: Create Unified Document Preview Component

**Goal:** Single preview component that works for both vehicle sales and finance documents

**New Files:**
- `src/components/shared/UnifiedDocumentPreview.tsx` - Unified preview with template support

**Features:**
- Template selector dropdown
- Dynamic header modes (Full Banner, Logo+Text, etc.)
- PDF download with proper header rendering
- Print support

### Phase 4: Cross-Module Template Sync

**Goal:** Ensure templates work consistently across all modules

**Changes:**
1. Add `yutong_order_invoice` template type to `document_template_types`
2. Add `sinotruck_order_invoice` template type
3. Add `light_vehicle_invoice` template type
4. Create professional HTML templates for each

---

## Technical Implementation Details

### Database Changes

```sql
-- Add vehicle sales invoice template types
INSERT INTO document_template_types (type_code, type_name, module, description, available_placeholders)
VALUES 
  ('yutong_order_invoice', 'Yutong Order Invoice', 'yutong', 'Invoice for Yutong bus orders', 
   ARRAY['{{invoice_no}}', '{{customer_name}}', '{{bus_model}}', '{{total}}', '{{signatures}}']),
  ('sinotruck_order_invoice', 'Sinotruck Order Invoice', 'sinotruck', 'Invoice for Sinotruck orders',
   ARRAY['{{invoice_no}}', '{{customer_name}}', '{{vehicle_model}}', '{{total}}']),
  ('light_vehicle_invoice', 'Light Vehicle Invoice', 'light_vehicle', 'Invoice for light vehicle orders',
   ARRAY['{{invoice_no}}', '{{customer_name}}', '{{vehicle_model}}', '{{total}}']);
```

### Component Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    Document Preview System                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐     ┌─────────────────────────────┐   │
│  │ Template Selector│     │ Preview Iframe              │   │
│  │ ┌─────────────┐ │     │ ┌─────────────────────────┐ │   │
│  │ │ AR Invoice  │ │     │ │ ┌───────────────────┐   │ │   │
│  │ │ AR Receipt  │ │ ──► │ │ │  HEADER IMAGE     │   │ │   │
│  │ │ Yutong Inv  │ │     │ │ └───────────────────┘   │ │   │
│  │ │ Sinotruck   │ │     │ │ Invoice Content...     │ │   │
│  │ └─────────────┘ │     │ │ Signatures...          │ │   │
│  └─────────────────┘     │ └─────────────────────────┘ │   │
│                          └─────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Actions: [Download PDF] [Print] [Email]              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/components/yutong/YutongOrderInvoiceViewModal.tsx` | Modify | Add template selector option |
| `src/components/yutong/YutongOrderInvoicePreview.tsx` | Modify | Support template-based rendering |
| `src/lib/yutong-order-invoice-generator.ts` | Modify | Accept header from template |
| `src/components/shared/UnifiedDocumentPreview.tsx` | Create | Unified preview component |
| `src/hooks/useVehicleSalesTemplates.ts` | Create | Hook for vehicle sales templates |
| `src/lib/vehicle-sales-template-utils.ts` | Create | Placeholder mapping for vehicle sales |

---

## Expected Results

After implementation:

1. **Yutong Order Invoices** will show the professional branded header (matching the PDF reference)
2. **Template Selection** will be available in the invoice preview modal
3. **All Finance Documents** will use consistent templates with proper headers
4. **Cross-Module Consistency** - same template system works for:
   - Finance AR/AP documents
   - Yutong order invoices
   - Sinotruck order invoices
   - Light Vehicle invoices

---

## Implementation Order

1. **Step 1:** Add vehicle sales template types to database
2. **Step 2:** Create default templates for vehicle sales with proper headers
3. **Step 3:** Modify `YutongOrderInvoicePreview` to accept template parameter
4. **Step 4:** Add template selector to `YutongOrderInvoiceViewModal`
5. **Step 5:** Update `yutong-order-invoice-generator.ts` to use template headers
6. **Step 6:** Apply same pattern to Sinotruck and Light Vehicle modules
7. **Step 7:** Create unified document preview component for future use

---

## Quick Fix Option (Immediate)

If a full integration is too complex for now, I can implement a quick fix:

1. Update `yutong-order-invoice-generator.ts` to dynamically fetch header from template
2. Ensure Yutong templates have proper `header_image_url` set
3. This maintains the current architecture while fixing the header issue

Would you like me to proceed with the full integration or the quick fix approach?
