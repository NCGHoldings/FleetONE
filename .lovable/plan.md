
# Accounting Cross-Check + Fix Plan

## What I found

There are two real accounting-side issues to fix:

### 1. Edit / posted / reversal flow has gaps
I reviewed `src/hooks/useEditAccountingMutations.ts` and compared it with the original create/delete flows.

Main risks found:
- **AP payment edit** re-posts GL only for normal payments, but **direct payments are skipped** during edit (`!existing.is_direct_payment`), so edited direct-payment vouchers can lose correct JE reposting.
- **AR receipt edit** and **AP payment edit** adjust **bank balance only**, but do **not re-sync linked bank transactions / fee records / allocations** the same way the create flow does.
- The original create flow handles:
  - allocations
  - WHT / write-off logic
  - bank fee JE lines
  - bank transaction records
  - direct payment lines
- The edit flow currently handles only part of that, so posted documents can become inconsistent after editing.

### 2. Payment voucher PDF/print uses the wrong export method
`FinanceDocumentPreviewModal.tsx` currently captures the whole iframe body as **one canvas** and scales it into one A4 PDF page.
That causes:
- long payment vouchers to shrink badly or clip
- multi-item allocations/direct-payment lines not to paginate properly
- same risk for other accounting documents opened through this shared modal

There is already a better multi-page utility in `src/lib/pdf-multi-page.ts`, but the finance modal is not using it.

### 3. Some accounting document types are not fully mapped
`document-template-seeder.ts` supports many accounting templates (`advance_receipt`, `advance_payment`, `journal_voucher`, `cheque_voucher`, `wht_certificate`, `grn`), but `mapDocumentToPlaceholders()` has explicit mappings mainly for:
- AR invoice
- AR receipt
- AR credit note
- AP invoice
- AP payment voucher
- AP debit note

So some document types may preview with weak/partial placeholder replacement.

## Implementation plan

### A. Harden edit/reversal/re-post flow
Refactor edit mutations so they follow the same accounting behavior as create/delete flows.

Files:
- `src/hooks/useEditAccountingMutations.ts`
- possibly shared helper extracted from `src/hooks/useAccountingMutations.ts`

Changes:
1. **AP Payment edit**
   - support **direct payment re-posting** during edit
   - rebuild JE from edited `ap_payment_lines`
   - re-sync bank transaction(s)
   - re-sync bank fee impact if fee exists
   - preserve/refresh `journal_entry_id`
2. **AR Receipt edit**
   - re-sync bank transaction(s)
   - re-sync bank fee records and JE totals when fee exists
   - confirm write-off/WHT-related repost remains balanced
3. **Allocation consistency**
   - if edit changes amount/bank/reference/date, refresh dependent records safely
   - avoid partial reversal where JE changes but bank transaction still reflects old value
4. **Audit history**
   - keep `edit_history` entries meaningful with old/new values plus reversed/new JE IDs

### B. Make finance documents paginate properly
Upgrade the shared accounting preview/download flow to support real A4 pagination.

Files:
- `src/components/accounting/shared/FinanceDocumentPreviewModal.tsx`
- `src/lib/document-template-utils.ts`
- `src/lib/pdf-multi-page.ts` (if small enhancement needed)

Changes:
1. Replace single-canvas PDF generation with **section-based / multi-page PDF generation**
2. Wrap finance document HTML in a printable container that supports:
   - page sections when template defines them
   - safe automatic page splitting when content is long
3. For payment vouchers:
   - keep one page only when content is short enough
   - automatically continue to page 2+ when items/allocations are too long
   - do not over-shrink text just to force one page
4. Apply the same fix to all documents using `FinanceDocumentPreviewModal`, not only payment vouchers

## C. Improve document layout for long item tables
Files:
- `src/lib/document-template-seeder.ts`
- possibly selected DB templates later if needed

Changes:
1. Update default **AP Payment Voucher** template for long tables:
   - tighter but readable spacing
   - repeatable table structure
   - safer footer/signature spacing
2. Ensure long allocations/direct payment line tables:
   - do not overlap signatures
   - move signature block to next page when needed
3. Review similar accounting docs:
   - AR receipt
   - AP invoice
   - AR invoice
   - debit/credit notes
   - cheque/journal vouchers

## D. Fill missing placeholder support for other accounting documents
File:
- `src/lib/document-template-utils.ts`

Add explicit mappings for document types already supported by the template system:
- `advance_receipt`
- `advance_payment`
- `journal_voucher`
- `cheque_voucher`
- `wht_certificate`
- `grn`

This will make preview/PDF output more reliable and reduce blank fields.

## Cross-check scope I will use during implementation

### Edit/reversal verification
For each edited document type:
- edit posted document
- confirm old JE becomes `reversed`
- confirm reversal JE is created correctly
- confirm new JE is posted correctly
- confirm bank balance matches new document
- confirm bank transaction/fee records match new values
- confirm Related Journal Entries / history view remain correct

### Document verification
For each accounting document:
- preview
- print
- download PDF
- test with short content
- test with long multi-line content
- confirm no clipping, overlap, or unreadable shrinking

## Expected result

After this fix:
- editing posted receipts/payments will keep **JE, reversal, bank balance, bank transaction, fee logic, and history** in sync
- direct AP payments will no longer be an edit-time gap
- long payment vouchers and other accounting documents will **paginate cleanly**
- accounting document previews/PDFs will be more reliable across all supported document types

## Technical note
The main root causes are:
- **edit logic is not yet parity-matched with create/delete logic**
- **finance PDF export still uses a one-canvas single-page approach instead of the existing multi-page utility**
- **some template types exist without full placeholder mapping**

