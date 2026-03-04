

# Add Tax Invoice Template to AR Invoice Preview Dropdown

## Problem
The AR Invoice preview modal (`FinanceDocumentPreviewModal.tsx`) only shows templates matching the exact `documentType` (e.g., `ar_invoice`). The new `tax_invoice` template does not appear in the dropdown because it has a different `type_code`.

## Solution
Modify the template filtering in `FinanceDocumentPreviewModal.tsx` to also include `tax_invoice` templates when viewing an `ar_invoice` document. This way the user can switch between the standard AR Invoice layout and the Sri Lankan Tax Invoice layout from the same dropdown.

### Changes

**File: `src/components/accounting/shared/FinanceDocumentPreviewModal.tsx`**

1. **Fetch both template types** — When `documentType` is `ar_invoice`, also fetch the `tax_invoice` template type ID so we can include those templates in the dropdown.

2. **Expand the `availableTemplates` filter** (around line 118-126) — Instead of filtering only by the single `templateType.id`, also include templates whose `template_type_id` matches the `tax_invoice` type when viewing AR invoices.

3. **Update the `documentTitle` map** (line 350) — Add `tax_invoice: "Tax Invoice"` entry.

This is a small, surgical change — only the template dropdown filter logic is modified. No other templates or modules are affected.

