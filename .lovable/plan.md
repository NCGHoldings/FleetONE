
Fix the special hire invoice system at the source so long multi-bus invoices paginate correctly in both preview and PDF, while keeping route details and hire type accurate everywhere.

1. Refactor the shared generator
- Update `src/lib/invoice-generator.ts` to build a normalized list of invoice rows first.
- Generate multiple `data-pdf-page` sections dynamically instead of forcing all bus rows into page 1.
- Put header/customer info on page 1, continue bus rows onto page 2/3/etc automatically, and keep totals/payment info on the last item page.
- Keep the optional signature page separate after the item pages.

2. Make multi-bus rows compact and readable
- For trips where all buses share the same route, show the full route once and avoid repeating the same long route block for every row.
- Use a compact continuation style for extra bus rows (same route / shared trip details, individual vehicle + driver/conductor + amount per row).
- This reduces vertical space and helps more buses fit cleanly across pages.

3. Fix preview to match the real PDF
- Update the invoice preview entry points to display the new paginated HTML clearly:
  - `src/components/special-hire/GenerateBalanceInvoiceModal.tsx`
  - `src/components/special-hire/InvoiceViewer.tsx`
  - `src/components/special-hire/BalanceInvoicePreview.tsx` if needed for consistency
- Show separate page blocks with spacing/shadow in preview so management can actually see page 1, page 2, etc.

4. Cross-check all invoice paths
- Verify every special hire invoice path uses the same shared generator and passes the same fields:
  - draft invoice
  - final/balance invoice
  - payment reminder invoice
  - regenerated invoice
  - finance-approved/stored invoice
- Re-check `hireType` and `intermediateStops` mapping in the construction paths so no path falls back to `External` unless the source data is truly missing.

5. Technical details
- Main file: `src/lib/invoice-generator.ts`
- Likely supporting files:
  - `src/components/special-hire/GenerateBalanceInvoiceModal.tsx`
  - `src/components/special-hire/InvoiceViewer.tsx`
  - `src/components/special-hire/BalanceInvoicePreview.tsx`
  - audit only: `src/components/special-hire/ConfirmedTripsTable.tsx`, `src/hooks/useDocumentRegeneration.ts`, `src/hooks/useDocumentManagement.ts`, `src/hooks/useFinanceApproval.ts`
- Preferred implementation: dynamic page chunking in HTML generation, not just PDF slicing, so both on-screen preview and downloaded PDF behave the same.

6. QA after implementation
- Test a quotation with many buses and a long route with multiple intermediate stops.
- Confirm:
  - preview shows page 2/page 3
  - downloaded PDF also continues to page 2/page 3
  - no rows are cut off
  - route/intermediate stops appear correctly
  - hire type shows Internal / Outside / Lyceum correctly
  - payment reminder invoice matches the final invoice behavior
