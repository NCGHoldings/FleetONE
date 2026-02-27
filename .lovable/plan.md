
# Upgrade All Document Templates to Professional Layout

## Overview

Replace all 12 document template HTML layouts in `src/lib/document-template-seeder.ts` with the new modern, CEO-presentation-grade design the user provided. The new design uses CSS custom properties, rounded cards, pill chips, structured signature pads with "SIGN HERE" labels, QR verification placeholders, and a clean grid-based layout.

Each template keeps its existing `{{placeholder}}` names so the rendering system (`FinanceDocumentPreviewModal`, `replacePlaceholders`, etc.) continues to work without changes.

---

## What Changes

### Single file modified: `src/lib/document-template-seeder.ts`

The entire file gets rewritten with:

**1. New `commonStyles` CSS** based on the user's provided design:
- CSS custom properties (`--ink`, `--muted`, `--line`, `--accent`, `--radius`, etc.)
- Modern card-based layout with `.doc`, `.header`, `.body`, `.footer` structure
- Brand section with logo container + company details
- Meta section with document title + chips (document type badges)
- Status indicator with colored dots
- `.card` sections with `.kv` key-value rows (140px label width)
- `.payment-summary` with accent-bordered total box
- Professional signature pads (4-column grid, bordered areas with "SIGN HERE")
- Bottom bar with terms column + QR verification placeholder
- Print-optimized `@media print` rules
- Mobile-responsive `@media (max-width: 840px)` rules

**2. All 12 templates rebuilt** with new layout, each preserving its original placeholders:

| Template | Key Fields Preserved | Accent Color |
|---|---|---|
| **AR Invoice** | `invoice_number`, `invoice_date`, `due_date`, `customer_name`, `line_items`, `total_amount` | Blue (default) |
| **AR Receipt** | `receipt_number`, `receipt_date`, `customer_name`, `amount`, `payment_method`, `allocations` | Blue |
| **AR Credit Note** | `credit_note_number`, `credit_date`, `customer_name`, `amount`, `reason` | Red (`--accent: #dc2626`) |
| **AP Invoice** | `invoice_number`, `invoice_date`, `vendor_name`, `line_items`, `total_amount`, `wht_amount` | Orange (`--accent: #ea580c`) |
| **AP Payment Voucher** | `payment_number`, `payment_date`, `vendor_name`, `amount`, `payment_method`, `allocations` | Purple (`--accent: #7c3aed`) |
| **AP Debit Note** | `debit_note_number`, `debit_date`, `vendor_name`, `amount`, `reason` | Red |
| **Advance Receipt** | `receipt_number`, `receipt_date`, `customer_name`, `amount`, `payment_method` | Green (`--accent: #047857`) |
| **Advance Payment** | `payment_number`, `payment_date`, `vendor_name`, `amount`, `payment_method` | Amber (`--accent: #a16207`) |
| **Journal Voucher** | `voucher_number`, `voucher_date`, `description`, `journal_lines`, `total_debit`, `total_credit` | Blue |
| **Cheque Voucher** | `voucher_number`, `voucher_date`, `payee_name`, `cheque_number`, `bank_name`, `amount` | Green (`--accent: #166534`) |
| **WHT Certificate** | `certificate_number`, `certificate_date`, `vendor_name`, `wht_rate`, `wht_amount` | Red (`--accent: #991b1b`) |
| **GRN** | `grn_number`, `grn_date`, `supplier_name`, `items`, `received_by` | Cyan (`--accent: #0891b2`) |

**3. Each template structure follows this pattern:**

```text
+------------------------------------------+
| HEADER                                   |
| [Logo] Company Name        Doc Title     |
|         Address             Doc Number   |
|         Contact             [Chips/Tags] |
|                             [Status Dot] |
+------------------------------------------+
| BODY                                     |
| +-- Card --+  +-- Card --+              |
| | Details  |  | Payee/   |              |
| | Key:Val  |  | Customer |              |
| +----------+  +----------+              |
|                                          |
| [Payment Summary / Amount Box]           |
|                                          |
| [Line Items Table]                       |
|                                          |
| [Notes / Narration]                      |
+------------------------------------------+
| FOOTER                                   |
| [Sig Pad] [Sig Pad] [Sig Pad] [Sig Pad] |
|                                          |
| Terms & Notes          [QR Verify Box]   |
|                        Printed: date     |
+------------------------------------------+
```

**4. Signature section upgraded** from 3-column basic lines to 4-column signature pads with:
- Bordered signature areas (80px height)
- "SIGN HERE" watermark text
- Signer name + role labels below each pad
- Roles vary per document type (Prepared By, Verified By, Authorized By, Payee/Customer)

**5. Footer upgraded** with:
- Terms & conditions column (left)
- QR verification placeholder + system ID (right)
- Print timestamp

---

## What Does NOT Change

- `src/components/accounting/shared/FinanceDocumentPreviewModal.tsx` -- no changes needed, it reads `html_content` from templates
- `src/lib/document-template-utils.ts` -- placeholder replacement logic unchanged
- `src/components/accounting/settings/DocumentTemplateEditor.tsx` -- unchanged
- `src/components/accounting/settings/DocumentTemplateManager.tsx` -- unchanged
- All `{{placeholder}}` names remain identical
- The `defaultTemplates` and `templateDisplayNames` export maps remain the same

---

## Important Notes

- **Existing templates in the database are NOT auto-updated.** The seeder only applies when "Initialize All Templates" is clicked. Users will need to re-initialize (or delete old + re-create) to see the new layouts.
- The new CSS is self-contained within each template's `<style>` block -- no external dependencies.
- Each template overrides `--accent` and `--accent-2` CSS variables for its module-specific color scheme.
- The layout is fully print-optimized and responsive down to 840px.
