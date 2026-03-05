

# Fix: AP Payment Voucher Missing Invoice Description

## Problem
The Payment Voucher preview shows a blank "Description" column because the queries only fetch `invoice_number` from related invoices — never the `notes` or line-item descriptions.

## Changes

### 1. `src/components/accounting/shared/FinanceDocumentPreviewModal.tsx`
- **Line 183**: Change AP allocation query to:
  `.select("*, ap_invoices(invoice_number, notes, ap_invoice_lines(description))")`
- **Line 174**: Change AR allocation query to:
  `.select("*, ar_invoices(invoice_number, notes)")`

### 2. `src/lib/document-template-utils.ts`
- **Line 125**: Build description from line-item descriptions first, fall back to invoice notes:
  ```typescript
  const desc = alloc.ap_invoices?.ap_invoice_lines?.map(l => l.description).filter(Boolean).join(', ')
    || alloc.ap_invoices?.notes
    || alloc.ar_invoices?.notes
    || '';
  ```

Two files, three line changes. The Payment Voucher and AR Receipt previews will then display invoice descriptions automatically.

