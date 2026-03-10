

# Prevent Duplicate AR Invoices for School Bus

## Problem

When "Generate AR Invoices" is clicked multiple times for the same month, duplicate invoices are created for every student — duplicate `ar_invoices`, duplicate `school_ar_invoices`, duplicate `journal_entries`, and duplicate GL postings. There is zero duplicate detection currently.

## Solution

Add a **duplicate check at the start of invoice generation** that detects if invoices already exist for the same branch + month, and either block generation or offer to replace.

### Changes

#### 1. `src/hooks/useSchoolBusFinance.ts` — Add duplicate guard in `useGenerateBulkARInvoices`

Before creating the batch, query `school_ar_invoice_batches` for existing batches with the same `branch_id` and `invoice_month`. If found:
- Throw an error with a clear message: "Invoices already generated for this month. Delete the existing batch first."

```typescript
// At the start of mutationFn, before batch creation:
const monthStr = format(invoiceMonth, "yyyy-MM-dd");
const { data: existingBatch } = await supabase
  .from("school_ar_invoice_batches")
  .select("id, batch_number, status")
  .eq("branch_id", branchId)
  .eq("invoice_month", monthStr)
  .maybeSingle();

if (existingBatch) {
  throw new Error(`Invoices already generated for ${format(invoiceMonth, "MMMM yyyy")} (Batch: ${existingBatch.batch_number}). Please delete the existing batch before regenerating.`);
}
```

#### 2. `src/components/school/BulkARInvoiceDialog.tsx` — Show existing batch warning

Before the student selection step, check if a batch already exists for the selected month. If yes, show a warning with option to delete the old batch and regenerate.

- Add a query for existing batches when the dialog opens / month changes
- Show warning banner: "Invoices already exist for March 2026 (Batch SBS-BATCH-...). You can delete the existing batch to regenerate."
- Add a "Delete Existing & Regenerate" button that:
  1. Deletes related `school_ar_invoices` for that batch
  2. Deletes related `ar_invoices` (the Finance ERP ones) by matching `invoice_number` pattern
  3. Voids related `journal_entries` 
  4. Deletes the `school_ar_invoice_batches` record
  5. Then proceeds with normal generation

#### 3. Files to Edit

| File | Change |
|---|---|
| `src/hooks/useSchoolBusFinance.ts` | Add duplicate batch check before generation; add `useDeleteARBatch` hook for cleanup |
| `src/components/school/BulkARInvoiceDialog.tsx` | Query for existing batch, show warning, add delete+regenerate flow |

