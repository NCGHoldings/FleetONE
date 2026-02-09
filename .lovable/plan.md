

# Complete Data Flow Analysis & Fix Plan - AR Invoice Document Preview

## Problem Summary

Based on my investigation, I've identified **6 critical issues** in the document preview flow that cause:
1. Missing header/logo image
2. Showing `{{vendor_name}}` instead of customer data
3. Empty `{{}}` placeholders appearing in final document
4. Template not showing correct header in Document Templates preview

---

## Complete Data Flow Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              AR INVOICE DOCUMENT PREVIEW - FULL DATA FLOW                           │
├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                     │
│  1. DATA SOURCE: ar_invoices table                                                                  │
│     ┌──────────────────────────────────────────────────────────────────────────────────────────┐   │
│     │ invoice_number: INV-20260209-TMIA                                                        │   │
│     │ company_id: f40b0a9d (NCG Holding - PARENT)                                              │   │
│     │ business_unit_code: "YUT" (Sub-company tag)                                              │   │
│     │ customer_id: 037f9270... (linked customer)                                               │   │
│     └──────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                              │                                                      │
│                                              ▼                                                      │
│  2. DATA FETCH: useARInvoices hook (line 299-339 of useAccountingData.ts)                           │
│     ┌──────────────────────────────────────────────────────────────────────────────────────────┐   │
│     │ SELECT *, customers (customer_code, customer_name)                                       │   │
│     │                                                                                          │   │
│     │ ❌ ISSUE #1: Missing customer details in SELECT:                                         │   │
│     │    - billing_address ← MISSING                                                           │   │
│     │    - phone ← MISSING                                                                     │   │
│     │    - email ← MISSING                                                                     │   │
│     └──────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                              │                                                      │
│                                              ▼                                                      │
│  3. VIEW: AccountsReceivableView.tsx (line 386-392)                                                 │
│     ┌──────────────────────────────────────────────────────────────────────────────────────────┐   │
│     │ <FinanceDocumentPreviewModal                                                             │   │
│     │   documentData={printDocumentData}   ✅ Passed                                           │   │
│     │   companyId={company_id}             ✅ Passed (NCG Holding)                             │   │
│     │   businessUnitCode={"YUT"}           ✅ Passed                                           │   │
│     │ />                                                                                       │   │
│     └──────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                              │                                                      │
│                                              ▼                                                      │
│  4. MODAL: FinanceDocumentPreviewModal.tsx (line 41-50)                                             │
│     ┌──────────────────────────────────────────────────────────────────────────────────────────┐   │
│     │ resolvedCompanyId = companies.find(c => c.short_code === "YUT")?.id                      │   │
│     │                   = efc37802 (Yutong Sales) ✅ CORRECT                                   │   │
│     │                                                                                          │   │
│     │ Template Filter: company_id === resolvedCompanyId ✅ CORRECT                             │   │
│     │ → Selects: yut_ar_invoice template                                                       │   │
│     └──────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                              │                                                      │
│                                              ▼                                                      │
│  5. TEMPLATE: yut_ar_invoice (database record)                                                      │
│     ┌──────────────────────────────────────────────────────────────────────────────────────────┐   │
│     │ header_mode: "header_image" ✅                                                           │   │
│     │ header_image_url: "https://...1770618835373.png" ✅                                      │   │
│     │                                                                                          │   │
│     │ ❌ ISSUE #2: Template HTML uses WRONG placeholders:                                      │   │
│     │    Template contains: {{vendor_name}}, {{vendor_address}}, {{vendor_code}}               │   │
│     │    Should contain: {{customer_name}}, {{customer_address}}, {{customer_code}}            │   │
│     │                                                                                          │   │
│     │ ❌ ISSUE #3: Template missing {{document_header}} placeholder                            │   │
│     │    Only has: {{company_logo}} in header                                                  │   │
│     │    header_mode = "header_image" requires {{document_header}} for full banner             │   │
│     └──────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                              │                                                      │
│                                              ▼                                                      │
│  6. PLACEHOLDER MAPPING: document-template-utils.ts (line 200-220)                                  │
│     ┌──────────────────────────────────────────────────────────────────────────────────────────┐   │
│     │ For ar_invoice type, maps:                                                               │   │
│     │   {{customer_name}} = documentData?.customers?.customer_name ✅                          │   │
│     │   {{customer_address}} = documentData?.customers?.address ← WRONG FIELD!                 │   │
│     │                                                                                          │   │
│     │ ❌ ISSUE #4: Wrong field name in mapping:                                                │   │
│     │    customers table uses: billing_address                                                 │   │
│     │    Mapping looks for: address (doesn't exist)                                            │   │
│     │                                                                                          │   │
│     │ ❌ ISSUE #5: AR invoice template in DB uses VENDOR placeholders (AP invoice template!)   │   │
│     │    Not a mapping bug - the TEMPLATE itself has wrong placeholders                        │   │
│     └──────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                              │                                                      │
│                                              ▼                                                      │
│  7. PLACEHOLDER REPLACEMENT: replacePlaceholders() (line 305-318)                                   │
│     ┌──────────────────────────────────────────────────────────────────────────────────────────┐   │
│     │ Replace {{key}} with value                                                               │   │
│     │                                                                                          │   │
│     │ ❌ ISSUE #6: Empty placeholders remain as {{}} in output                                 │   │
│     │    If value is "" (empty string), placeholder still replaced                             │   │
│     │    But template might show raw {{placeholder}} if not in mapping                         │   │
│     └──────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                              │                                                      │
│                                              ▼                                                      │
│  8. RENDERED OUTPUT:                                                                                │
│     ┌──────────────────────────────────────────────────────────────────────────────────────────┐   │
│     │ ❌ Header: {{company_logo}} shows empty (header_mode=header_image but no {{document_header}})│
│     │ ❌ Vendor: {{vendor_name}} shows raw (not replaced - wrong placeholder)                  │   │
│     │ ❌ Customer address: Empty (wrong field lookup)                                          │   │
│     └──────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Issues Identified with Solutions

| # | Issue | Location | Root Cause | Fix |
|---|-------|----------|------------|-----|
| 1 | Customer details missing in query | `useAccountingData.ts` line 311-316 | Only selects `customer_code, customer_name` | Add `billing_address, phone, email` to SELECT |
| 2 | Template uses vendor placeholders | `document_templates` DB (yut_ar_invoice) | Wrong template HTML stored in database | Template needs to use customer placeholders |
| 3 | Missing `{{document_header}}` in template | `document_templates` DB | Template uses `{{company_logo}}` only | Add `{{document_header}}` placeholder for full banner support |
| 4 | Wrong field name in mapping | `document-template-utils.ts` line 205 | Uses `.address` but field is `.billing_address` | Change to `documentData?.customers?.billing_address` |
| 5 | Unreplaced placeholders show raw `{{}}` | `replacePlaceholders()` function | No cleanup of unmapped placeholders | Add post-processing to remove unreplaced `{{...}}` |
| 6 | Template preview doesn't show header | `DocumentTemplateManager.tsx` | Preview renders header correctly but template HTML wrong | Fix template HTML in database |

---

## Solution Implementation

### Fix 1: Add Customer Details to AR Invoice Query

**File: `src/hooks/useAccountingData.ts`** (lines 311-316)

Change customer SELECT from:
```typescript
customers (customer_code, customer_name)
```
To:
```typescript
customers (customer_code, customer_name, billing_address, phone, email)
```

### Fix 2: Fix Customer Address Field Mapping

**File: `src/lib/document-template-utils.ts`** (line 205)

Change:
```typescript
placeholders['{{customer_address}}'] = documentData?.customers?.address || '';
```
To:
```typescript
placeholders['{{customer_address}}'] = documentData?.customers?.billing_address || '';
```

Also apply same fix for AR Receipts and Credit Notes (lines 226, 241).

### Fix 3: Add Cleanup for Unreplaced Placeholders

**File: `src/lib/document-template-utils.ts`** (around line 315)

After replacing all known placeholders, add cleanup:
```typescript
// Remove any remaining unreplaced placeholders to keep document professional
result = result.replace(/\{\{[^}]+\}\}/g, '');
```

### Fix 4: Update YUT AR Invoice Template in Database

The current template in database has wrong placeholders (vendor instead of customer). This needs a database update or template regeneration.

**Solution Options:**
A. Run SQL to update template HTML directly
B. Use "Initialize All Templates" to regenerate with correct AR template
C. Manually edit template via Settings -> Document Templates

**Template HTML should include:**
1. `{{document_header}}` before the header section for full banner support
2. Replace all `{{vendor_*}}` with `{{customer_*}}` placeholders

### Fix 5: Template Seeder - Ensure AR Template Uses Customer Placeholders

**File: `src/lib/document-template-seeder.ts`** (line 242-304)

The `generateARInvoiceTemplate()` function correctly uses customer placeholders. But the DB template was manually edited to use vendor placeholders incorrectly.

---

## Files to Modify

| # | File | Changes |
|---|------|---------|
| 1 | `src/hooks/useAccountingData.ts` | Add `billing_address, phone, email` to customers SELECT in AR Invoices, Receipts queries |
| 2 | `src/lib/document-template-utils.ts` | Fix field name to `billing_address`, add placeholder cleanup |
| 3 | Database: `document_templates` | Regenerate/fix YUT AR Invoice template to use customer placeholders and include `{{document_header}}` |

---

## Database Template Fix

The Yutong AR Invoice template in the database needs to be corrected. Either:

1. **Regenerate via UI**: Go to Settings -> Document Templates -> Edit the YUT AR Invoice template and fix the HTML
2. **SQL Update**: Replace the template HTML with correct AR invoice format

The correct AR Invoice template structure should have:
```html
{{document_header}}
<div class="document-header">
  <div class="header-row">
    <div class="logo-area">{{company_logo}}</div>
    <div class="company-details">
      <h1>{{company_name}}</h1>
      ...
    </div>
  </div>
</div>
<!-- Bill To section should use: -->
<p><strong>{{customer_name}}</strong></p>
<p>{{customer_address}}</p>
```

---

## Expected Outcome After Fix

| Issue | Before | After |
|-------|--------|-------|
| Header Image | Empty/Missing | Full banner displayed for header_image mode |
| Customer Name | Shows `{{vendor_name}}` | Shows actual customer name (e.g., "abisheka") |
| Customer Address | Empty | Shows billing address (e.g., "10, Raymond Road") |
| Customer Phone/Email | Not shown | Populated from customer record |
| Empty Placeholders | Show `{{}}` | Clean empty space |

---

## Data Interconnection Summary

The correct data flow with interconnections:

```text
Customer (customers table)
├── customer_name: "abisheka"
├── billing_address: "10, Raymond Road"  ← Use this for {{customer_address}}
├── phone: "0786773263"
└── email: "abiwork12345@gmail.com"
      │
      ▼
AR Invoice (ar_invoices table)
├── invoice_number: "INV-20260209-TMIA"
├── customer_id → links to Customer
├── company_id → NCG Holding (parent)
└── business_unit_code: "YUT" → resolves to Yutong Sales
      │
      ▼
Document Template (document_templates table)
├── company_id: Yutong Sales
├── header_mode: "header_image"
├── header_image_url: Full banner URL
└── html_content: Uses {{customer_*}} placeholders
      │
      ▼
Final Rendered Document
├── Header: Full Yutong banner image
├── Company: Yutong Sales details
└── Customer: Complete customer info from linked record
```

