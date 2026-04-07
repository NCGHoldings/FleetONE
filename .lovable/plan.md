
Fix: Special Hire document flow shows two different viewers and inconsistent signature/draft states

What is happening now
- The workflow eye icon opens `DocumentViewer` using a stored `document_storage` record.
- Some other places still open `InvoiceViewer`, which generates a fresh preview from `invoiceData` instead of the stored document.
- Because of that, users can see:
  - one view with no embedded signatures
  - another view with DRAFT/APPROVED text
  - different content for what should be the same document
- There is also inconsistent signature linking:
  - some code saves/fetches approvals by real document id
  - other code uses `quotationId` as `document_id`
- This is the main reason the system behaves like there are “2 documents”.

Root causes found
1. Two parallel viewers exist
- `src/components/special-hire/ConfirmedTripsTable.tsx` uses both:
  - `DocumentViewer`
  - `InvoiceViewer`
- `viewInvoice()` can still fall back to generated `InvoiceViewer` output if it does not use the stored document path.

2. Signatures are attached inconsistently
- In `src/hooks/useDocumentManagement.ts`, prepared-by auto-signature is inserted with:
  - `document_id: quotationId`
- In `src/hooks/useFinanceApproval.ts`, checked-by auto-signature is also inserted with:
  - `document_id: paymentData.quotation.id`
- But viewers mostly read signatures by actual document row id:
  - `document.id`
- So signatures can exist, but not appear in the opened document.

3. Multiple generation/regeneration paths
- `useDocumentManagement`
- `useDocumentRegeneration`
- `DocumentViewer` local regeneration
- `EnhancedDocumentViewer` local regeneration
- `useFinanceApproval` fallback draft creation + approval regeneration
- These do similar work with slightly different rules, which causes mismatch.

Implementation plan

1. Make one single document viewer path
- Keep `DocumentViewer` as the only viewer for Special Hire payment/invoice documents.
- Stop using `InvoiceViewer` in `ConfirmedTripsTable.tsx`.
- Update all “View” actions (workflow eye, actions column, payment timeline/trip details, documents modal) to open the correct stored `document_storage` record in `DocumentViewer`.
- If no document exists, show a clear “No generated document yet” state instead of rendering a different generated preview.

2. Make stored document the single source of truth
- Standardize on actual `document_storage.id` as the only valid `document_id` for approvals.
- Fix auto-signature insertions in:
  - `src/hooks/useDocumentManagement.ts`
  - `src/hooks/useFinanceApproval.ts`
- Remove the current quotation-id-as-document-id behavior.
- Ensure every signature fetch/regeneration reads approvals from the same real document id.

3. Unify document selection rules
- Create one consistent helper/selection rule for:
  - advance payment document
  - final/balance invoice
  - approved vs draft preference
- Use it everywhere:
  - workflow column
  - documents modal
  - trip details / payment timeline view buttons
  - finance approval modal
- Rule: prefer approved document for that payment/type; if none exists, use latest draft for that same payment/type.

4. Remove duplicate preview logic
- Refactor `viewInvoice()` in `ConfirmedTripsTable.tsx` so it resolves a stored document instead of generating ad-hoc `InvoiceData` preview output.
- Keep `InvoiceViewer.tsx` only if it is still needed elsewhere; otherwise remove its use from Special Hire flow entirely.
- This ensures users never see one preview from DB and another preview from generated HTML.

5. Consolidate regeneration behavior
- Choose one regeneration path as the main one:
  - preferably hook-based regeneration via `useDocumentRegeneration` / `useDocumentManagement`
- Remove duplicate local regeneration logic inside viewers where possible.
- Make regeneration update the existing document record, not create a parallel-looking version.
- Keep filename updates if needed, but keep the same document row as the canonical record.

6. Clean up DRAFT / APPROVED behavior
- Show DRAFT only when the actual stored document status is draft.
- After approval, all entry points should open the approved stored file, so users no longer see old draft wording from a different view.
- For balance/final customer invoice behavior, keep the “no signatures required” rule only if that is the intended business rule, but apply it consistently in the single viewer.

7. Fix finance approval modal consistency
- In `src/components/special-hire/FinanceApprovalModal.tsx`, make document listing, signature display, and view action all use the same selected stored document.
- Ensure existing signatures are loaded from the same actual document id, not the first arbitrary document or quotation-level pseudo-id.

8. Verify all places that expose document links/buttons
- Cross-check and align these components:
  - `src/components/special-hire/ConfirmedTripsTable.tsx`
  - `src/components/special-hire/FinanceApprovalModal.tsx`
  - `src/components/special-hire/PaymentTimeline.tsx`
  - `src/components/special-hire/TripDetailsModal.tsx`
  - `src/components/special-hire/DocumentViewer.tsx`
  - `src/hooks/useDocumentManagement.ts`
  - `src/hooks/useDocumentRegeneration.ts`
  - `src/hooks/useFinanceApproval.ts`

Expected result
- Only one document opens for each action
- Workflow eye icon and Actions > View Documents show the same canonical file
- No more mismatch between no-signature view and signed view
- No duplicate-feeling draft/approved versions from different renderers
- Signature data appears reliably because all approvals point to the actual document id
- Users see one clean Special Hire document flow

Technical notes
- Highest-risk issue is signature identity mismatch:
  - approvals currently mix `document.id` and `quotationId`
- Highest-impact UX fix is removing `InvoiceViewer` from this Special Hire path and routing everything to `DocumentViewer`
- This is mainly a consistency/consolidation fix across multiple files, not a database-schema change
