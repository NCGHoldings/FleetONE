

# Fix: Migrate All Accounting Document Numbers to Centralized Numbering System

## Problem

Many accounting forms bypass the centralized `generate_entity_number` system and instead use `Date.now()` or `Math.random()` to generate document numbers. This produces unprofessional, non-sequential identifiers like `GRN-847291`, `RFQ-1712345678`, or `RCV-20260407-X8K2`.

**Forms already using centralized numbering** (correct):
- AR Invoice, AP Invoice, AP Payment, Customer, Vendor, Item, Fixed Asset

**Forms using Date.now() / Math.random() (broken)**:

| Form | Current Pattern | Fix |
|------|----------------|-----|
| AR Receipt | `RCV-YYYYMMDD-RANDOM` | Use `receipt` entity type (already configured) |
| AR Credit Note | `CN-XXXXXX` | Add `credit_note` entity type |
| AP Debit Note | `DN-XXXXXX` | Add `debit_note` entity type |
| GRN | `GRN-XXXXXX` | Use `grn` entity type (already configured) |
| Purchase Order | `PO-XXXXXX` | Use `po` entity type (already configured) |
| RFQ | `RFQ-TIMESTAMP` | Add `rfq` entity type |
| Sales Order | `SO-TIMESTAMP` | Add `so` entity type |
| Quality Inspection | `QI-TIMESTAMP` | Add `qi` entity type |
| Stock Transfer | `ST-TIMESTAMP` | Add `stock_transfer` entity type |
| Budget | `BUD-YEAR-XXXX` | Add `budget` entity type |
| Payment Batch | `PB-DATE-XXXX` | Add `payment_batch` entity type |
| AP Invoice pay-now | `PAY-XXXXXXXX` | Use `payment` entity type |

## Plan

### Step 1: Add missing entity types to numbering_sequences table
SQL migration to insert new sequences for: `credit_note`, `debit_note`, `rfq`, `so`, `qi`, `stock_transfer`, `budget`, `payment_batch` — with sensible prefixes and year inclusion.

### Step 2: Update entityTypeLabels in useNumbering.ts
Add labels for the new entity types so they appear in the Numbering Settings UI.

### Step 3: Fix each form to use `useGenerateNumber`
For each of the 11 broken forms:
- Import `useGenerateNumber`
- Replace `Date.now()`/`Math.random()` default values with empty string
- Add `useEffect` to call `generateNumber(entityType)` on form open
- Add a loading spinner on the number field while generating

### Files
- **New migration**: Insert missing `numbering_sequences` rows
- **Modify**: `src/hooks/useNumbering.ts` — add new entity type labels
- **Modify**: `src/components/accounting/ARReceiptForm.tsx`
- **Modify**: `src/components/accounting/ARCreditNoteForm.tsx`
- **Modify**: `src/components/accounting/APDebitNoteForm.tsx`
- **Modify**: `src/components/accounting/GoodsReceiptForm.tsx`
- **Modify**: `src/components/accounting/PurchaseOrderForm.tsx`
- **Modify**: `src/components/accounting/RFQForm.tsx`
- **Modify**: `src/components/accounting/SalesOrderForm.tsx`
- **Modify**: `src/components/accounting/quality/QualityInspectionForm.tsx`
- **Modify**: `src/components/accounting/inventory/StockTransferForm.tsx`
- **Modify**: `src/components/accounting/BudgetForm.tsx`
- **Modify**: `src/components/accounting/PaymentBatchView.tsx`
- **Modify**: `src/components/accounting/APInvoiceForm.tsx` — fix pay-now fallback

## Result
All 20+ accounting document types will use the centralized, sequential numbering system — configurable per company via the Numbering Settings UI, with professional formats like `GRN-2026-00001`, `RFQ-2026-00001`, etc.

