

# Add "View Related Documents" to Journal Entry Detail Dialog

## What the User Wants
When viewing a Journal Entry's lines, add a "View" action that finds and shows all related source documents (AR Invoice, AP Invoice, AR Receipt, AP Payment, etc.) linked to that JE, with preview capability using the existing `FinanceDocumentPreviewModal`.

## How It Works

The `journal_entries` table has a `journal_entry_id` foreign key from 7+ source tables (ar_invoices, ap_invoices, ar_receipts, ap_payments, special_hire_payments, yutong_customer_payments, sinotruck_customer_payments, etc.). By querying these tables for a matching `journal_entry_id`, we can find all related source documents and display them.

## Changes

### File: `src/components/accounting/JournalEntryDetailDialog.tsx`

1. **Add "Related Documents" section** below the Entry Lines table:
   - Query all source tables (`ar_invoices`, `ap_invoices`, `ar_receipts`, `ap_payments`, `bank_transactions`, `special_hire_payments`) by `journal_entry_id = entry.id`
   - Display results as a list of clickable cards/rows showing: document type, document number, amount, date
   - Each row has a "View" button (Eye icon)

2. **Add document preview capability**:
   - Import `FinanceDocumentPreviewModal`
   - On clicking "View", open the preview modal with `documentType` mapped from the source table (e.g., `ar_invoices` → `"ar_invoice"`)
   - Pass the full document data to the modal

3. **Data fetching logic** (inside the dialog, using a new `useQuery`):
   ```
   - Query ar_invoices where journal_entry_id = entryId → label "AR Invoice"
   - Query ap_invoices where journal_entry_id = entryId → label "AP Invoice"  
   - Query ar_receipts where journal_entry_id = entryId → label "AR Receipt"
   - Query ap_payments where journal_entry_id = entryId → label "AP Payment"
   - Query special_hire_payments where journal_entry_id = entryId → label "Special Hire Payment"
   - Query bank_transactions where journal_entry_id = entryId → label "Bank Transaction"
   ```
   All queries run in parallel via `Promise.all`, results merged into a unified list.

4. **UI**: Below the lines table, add a "Related Documents" section with a small table:
   | Type | Document # | Amount | Date | Action |
   |------|-----------|--------|------|--------|
   | AR Invoice | INV-001 | 50,000 | 2026-01-15 | 👁 View |

   Clicking "View" opens `FinanceDocumentPreviewModal` with the appropriate `documentType` and `documentData`.

### No other files need changes
- `FinanceDocumentPreviewModal` already supports all document types
- No database changes needed — all queries use existing `journal_entry_id` columns

## Result
- Every JE detail dialog shows which source documents created it
- Users can click "View" to preview the AR/AP invoice, receipt, or payment document directly
- Works for all modules: manual AR/AP, Special Hire, Yutong, Sinotruck, School Bus

