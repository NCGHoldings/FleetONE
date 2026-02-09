

# Fix AR Invoice Template Header - Analysis & Solution

## Problem Identified

The AR Invoice for NCG Holding (INV-20260209-TMIA) shows empty header fields because:

| Setting | NCG Holding | Yutong Sales |
|---------|-------------|--------------|
| header_image_url | NULL (empty) | ✅ Configured |
| header_mode | logo_and_html | header_image |
| Company Address | NULL | - |
| Company Phone | NULL | - |
| Company Email | NULL | - |
| Company Logo | NULL | - |

**The template system is working correctly** - the issue is that NCG Holding has no header image or company details configured.

---

## Solution Options

### Option 1: Configure NCG Holding Company Details (Recommended)

Update NCG Holding company record with actual business information:
- Address
- Phone
- Email  
- Logo URL

Then the `logo_and_html` mode will display properly.

### Option 2: Upload Header Banner for NCG Holding Template

In Settings → Document Templates:
1. Find NCG Holding's AR Invoice template
2. Click Edit
3. Upload a header banner image
4. Change header_mode to `header_image`

---

## Code Changes Required

### Fix 1: Add Company Details Fallback

When company details are empty, show a more informative placeholder instead of empty fields.

**File: `src/lib/document-template-utils.ts`**

Update the placeholder mapping to handle null values gracefully:

```typescript
// Instead of showing empty Tel/Email
placeholders['{{company_phone}}'] = companyData?.phone || '';
placeholders['{{company_email}}'] = companyData?.email || '';

// Change to:
placeholders['{{company_phone}}'] = companyData?.phone || '(Configure in Company Settings)';
placeholders['{{company_email}}'] = companyData?.email || '(Configure in Company Settings)';
```

### Fix 2: Template Should Support Document Header Placeholder

The current template HTML uses `{{company_logo}}` but when `header_mode` is `header_image`, it should also check for `{{document_header}}`.

**File: `src/lib/document-template-seeder.ts`**

Update AR Invoice template header section to conditionally show full header:

```html
<div class="document-header">
  {{document_header}}  <!-- Add this for full-width banner support -->
  <div class="header-row">
    <div class="logo-area">{{company_logo}}</div>
    <div class="company-details">
      <h1>{{company_name}}</h1>
      ...
    </div>
  </div>
</div>
```

### Fix 3: Pass Company Data from Invoice Record

Currently the modal gets company data separately, but the invoice may have company details embedded.

**File: `src/components/accounting/shared/FinanceDocumentPreviewModal.tsx`**

Ensure company lookup uses the invoice's `company_id`:

```typescript
const company = companies?.find((c) => c.id === (companyId || documentData?.company_id || selectedTemplate?.company_id));
```

---

## Database Update (Optional Quick Fix)

Run SQL to set a default header for NCG Holding if you have a header image:

```sql
-- After uploading NCG header image to storage
UPDATE document_templates 
SET header_image_url = 'YOUR_NCG_HEADER_URL',
    header_mode = 'header_image'
WHERE company_id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020'
AND template_type_id = (SELECT id FROM document_template_types WHERE type_code = 'ar_invoice');
```

---

## Files to Modify

| # | File | Changes |
|---|------|---------|
| 1 | `src/lib/document-template-utils.ts` | Add fallback text for empty company fields |
| 2 | `src/lib/document-template-seeder.ts` | Add `{{document_header}}` placeholder for full banner support |
| 3 | `src/components/accounting/shared/FinanceDocumentPreviewModal.tsx` | Improve company data lookup chain |

---

## Expected Outcome

After implementation:

1. **If header_mode = header_image**: Full-width banner displays if `header_image_url` is set
2. **If header_mode = logo_and_html**: Logo + company details display, with fallback prompts if empty
3. **Cross-company consistency**: Each company's template will show its own configured header
4. **User guidance**: Empty fields will prompt users to configure company settings

---

## Immediate Manual Fix (No Code Required)

To fix NCG Holding invoices immediately:

1. Go to **Settings → Document Templates**
2. Find **NCG Holding - AR Invoice / Sales Invoice**
3. Click **Edit**
4. Either:
   - Upload a header banner image and set mode to "Full Banner"
   - OR go to **Company Management** and fill in NCG Holding's address, phone, email, and logo

