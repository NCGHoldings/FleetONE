
# Document Template Header System Enhancement

## Problem Analysis

Based on the screenshots and current implementation:

1. **Current Issue**: Header image uploads but doesn't preview correctly
2. **Limitation**: Only one header mode (logo as small image in template)
3. **Need**: Full flexibility for different header styles:
   - Full-width header banner image (like Yutong quotation with document title + logos embedded)
   - Logo only (small logo in designated area)
   - HTML code only (no image, just company details from template)
   - Logo + HTML combined (current default)

## Solution Architecture

### New Header Mode Options

| Mode | Description | Use Case |
|------|-------------|----------|
| `header_image` | Full-width banner replaces entire header | Pre-designed headers with document title, logos embedded (Yutong quotation style) |
| `logo_only` | Only company logo, no text | Minimal header |
| `html_only` | Template HTML header, no images | Simple text-based header |
| `logo_and_html` | Logo + company details from HTML | Professional header with both |

### Visual Reference

**Mode: Header Image (Full Banner)**
```
+------------------------------------------------------------------+
| [QUOTATION]      [NCG HOLDINGS LOGO]    [YUTONG LOGO]            |
| =================== Full-width header image ==================== |
+------------------------------------------------------------------+
```

**Mode: Logo + HTML**
```
+------------------------------------------------------------------+
| [LOGO]    |    NCG SPARES (PRIVATE) LIMITED                      |
|           |    157Y, Keballaovita, Weniwelkola                    |
|           |    +94 771332795                                      |
+------------------------------------------------------------------+
```

**Mode: Logo Only**
```
+------------------------------------------------------------------+
|                         [COMPANY LOGO]                           |
+------------------------------------------------------------------+
```

**Mode: HTML Only**
```
+------------------------------------------------------------------+
|    NCG EXPRESS COMPANY LIMITED                                   |
|    123 Main Street, Colombo 03                                   |
|    Tel: +94 11 234 5678 | Email: info@company.com                |
+------------------------------------------------------------------+
```

---

## Database Changes

### Add New Column
```sql
ALTER TABLE document_templates 
ADD COLUMN IF NOT EXISTS header_mode VARCHAR(20) DEFAULT 'logo_and_html';
```

**Valid Values**: `header_image`, `logo_only`, `html_only`, `logo_and_html`

---

## Implementation Details

### Part 1: Database Migration

Add `header_mode` column to `document_templates` table with default value `logo_and_html`.

### Part 2: Update DocumentTemplateEditor.tsx

Add header mode selection UI with visual previews:

```typescript
// New form field
header_mode: 'logo_and_html' | 'header_image' | 'logo_only' | 'html_only'

// UI: Radio buttons with visual icons
<div className="space-y-3">
  <Label>Header Display Mode</Label>
  <RadioGroup value={formData.header_mode} onValueChange={...}>
    <div className="grid grid-cols-2 gap-4">
      <RadioItem value="header_image" label="Full Header Image" 
        description="Replace entire header with uploaded banner image" />
      <RadioItem value="logo_and_html" label="Logo + Company Info" 
        description="Logo on left, company details on right" />
      <RadioItem value="logo_only" label="Logo Only" 
        description="Center-aligned logo without text" />
      <RadioItem value="html_only" label="Text Only" 
        description="Company info from template, no images" />
    </div>
  </RadioGroup>
</div>
```

### Part 3: Update document-template-utils.ts

Modify placeholder mapping to respect header mode:

```typescript
export const mapDocumentToPlaceholders = (
  documentType: string,
  documentData: any,
  companyData?: any,
  lineItems?: any[],
  allocations?: any[],
  headerImageUrl?: string,
  headerMode?: string  // NEW PARAMETER
): Record<string, string> => {
  
  // Generate header placeholder based on mode
  switch (headerMode) {
    case 'header_image':
      // Full-width banner image replaces entire header section
      placeholders['{{document_header}}'] = headerImageUrl 
        ? `<div class="full-header-image"><img src="${headerImageUrl}" style="width: 100%; max-height: 150px; object-fit: contain;" /></div>`
        : '';
      placeholders['{{company_logo}}'] = ''; // No separate logo
      break;
      
    case 'logo_only':
      placeholders['{{company_logo}}'] = headerImageUrl 
        ? `<img src="${headerImageUrl}" style="max-height: 80px; display: block; margin: 0 auto;" />`
        : '';
      placeholders['{{document_header}}'] = ''; // No full header
      break;
      
    case 'html_only':
      placeholders['{{company_logo}}'] = ''; // No logo
      placeholders['{{document_header}}'] = ''; // No image header
      break;
      
    case 'logo_and_html':
    default:
      placeholders['{{company_logo}}'] = headerImageUrl 
        ? `<img src="${headerImageUrl}" style="max-height: 80px; max-width: 200px; object-fit: contain;" />`
        : '';
      break;
  }
  
  return placeholders;
};
```

### Part 4: Update Preview Modal & Manager

- Pass `header_mode` to placeholder mapping
- Ensure preview correctly renders all modes
- Fix the preview iframe rendering for header images

### Part 5: Update Template Seeder

Add new placeholder `{{document_header}}` for full-width banner mode:

```html
<!-- For header_image mode, this replaces the entire header section -->
{{document_header}}

<!-- For other modes, use this structure -->
<div class="document-header">
  <div class="header-row">
    <div class="logo-area">{{company_logo}}</div>
    <div class="company-details">
      <h1>{{company_name}}</h1>
      ...
    </div>
  </div>
</div>
```

### Part 6: Update Hooks

Add `header_mode` to TypeScript interfaces in `useDocumentTemplates.ts`.

---

## Files to Change

### Database Migration (New)
```
supabase/migrations/[timestamp]_add_header_mode_to_templates.sql
```

### Updated Files (6)
| File | Changes |
|------|---------|
| `src/integrations/supabase/types.ts` | Add header_mode type |
| `src/hooks/useDocumentTemplates.ts` | Add header_mode to interfaces |
| `src/components/accounting/settings/DocumentTemplateEditor.tsx` | Add header mode selector UI |
| `src/lib/document-template-utils.ts` | Update placeholder mapping for header modes |
| `src/components/accounting/shared/FinanceDocumentPreviewModal.tsx` | Pass header_mode to rendering |
| `src/components/accounting/settings/DocumentTemplateManager.tsx` | Display header mode in preview |

---

## UI Design for Header Mode Selection

```
+------------------------------------------------------------------+
|  HEADER CONFIGURATION                                             |
+------------------------------------------------------------------+
|                                                                   |
|  Header Display Mode:                                             |
|  +------------------------+  +------------------------+           |
|  | ☐ Full Header Image   |  | ☑ Logo + Company Info  |           |
|  | [====IMAGE====]       |  | [LOGO] Company Name    |           |
|  | Full-width banner     |  | Address, Phone, Email  |           |
|  +------------------------+  +------------------------+           |
|  +------------------------+  +------------------------+           |
|  | ☐ Logo Only           |  | ☐ Text Only            |           |
|  |       [LOGO]          |  | Company Name           |           |
|  | Centered logo         |  | Address, Contact       |           |
|  +------------------------+  +------------------------+           |
|                                                                   |
|  Header Image / Logo:                                             |
|  +------------------+  +----------------+                         |
|  | [NCG HOLDINGS]   |  | [Upload Image] |                         |
|  | [preview image]  |  |                |                         |
|  +------------------+  +----------------+                         |
|                                                                   |
|  ⓘ For "Full Header Image" mode, upload a pre-designed banner     |
|     that includes document title, logos, and branding.            |
|                                                                   |
+------------------------------------------------------------------+
```

---

## Expected Behavior

### Full Header Image Mode
- Uploaded image displays as full-width banner
- Image should contain document title (e.g., "QUOTATION"), company logos
- Replaces entire header section including company details
- Perfect for pre-designed branded headers

### Logo + Company Info Mode (Current Default)
- Logo appears on left
- Company name, address, contact on right
- Most common business document format

### Logo Only Mode
- Centered logo
- No company text
- Clean, minimal header

### HTML Only Mode
- Company details from template HTML
- No image rendered
- Text-based header

---

## Implementation Sequence

| Step | Task | Files |
|------|------|-------|
| 1 | Add `header_mode` column to database | SQL Migration |
| 2 | Update Supabase types | `types.ts` |
| 3 | Update hooks with header_mode | `useDocumentTemplates.ts` |
| 4 | Update template editor with mode selector | `DocumentTemplateEditor.tsx` |
| 5 | Update placeholder mapping logic | `document-template-utils.ts` |
| 6 | Update preview modal rendering | `FinanceDocumentPreviewModal.tsx` |
| 7 | Update manager preview | `DocumentTemplateManager.tsx` |
| 8 | Test all document types with all modes | Manual testing |

---

## Technical Notes

### Image Loading for PDF
- Full header images need proper CORS handling
- Use `useCORS: true` in html2canvas
- Pre-load images as base64 for PDF generation reliability

### Template Compatibility
- Existing templates default to `logo_and_html` mode
- Templates can be updated to use new modes via editor
- `{{document_header}}` placeholder added for full banner mode

### Storage
- Same `document-headers` Supabase storage bucket
- No changes to upload mechanism
- Image can be logo or full banner based on mode selection
