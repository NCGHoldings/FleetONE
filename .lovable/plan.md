
Goal: make AR/AP invoice creation always create Journal Entries (manual + automated), keep COA updates correct, remove silent failures, and document full flows.

1) What I found (root cause)
- Recent AR/AP invoices are created with `journal_entry_id = NULL` (confirmed in DB).
- `gl_settings` currently has no rows, so global fallback accounts are empty.
- Customer categories have AR accounts but missing revenue accounts; vendor categories missing AP/expense accounts.
- Current creation hooks swallow GL errors (`console.warn`) and still show success toast.
- Some automated flows still create invoices without posting at creation (vehicle sales drafts, special hire AR depending on caller, leasing AP).
- GL Guardian has a config bug: AP scan uses `expense_account_id` key instead of `default_expense_account_id`.

2) Implementation plan (code)
A. Stop silent invoice-without-GL behavior
- Update `useCreateARInvoice` / `useCreateAPInvoice` in `src/hooks/useAccountingMutations.ts`:
  - Pre-validate resolved accounts before final success.
  - If posting fails, raise blocking error (no silent pass).
  - Keep linking `journal_entry_id` on success.
- Apply same behavior to `src/hooks/useCompanyMutations.ts` for consistency.

B. Strengthen account resolution + fallback
- Update `resolveCustomerARAccounts` and `resolveVendorAPAccounts`:
  - Preserve 3-tier priority.
  - Add robust global fallback handling when category is partial.
  - Return structured “missing accounts” reason so UI can show actionable message.
- Add user-facing guidance toast: exactly which mapping is missing and where to configure (Core GL, Customer Category, Vendor Category).

C. Make automated invoice flows post at creation
- `src/hooks/useVehicleSalesFinance.ts` (`createVehicleARInvoice`):
  - Create JE at AR invoice creation and link `journal_entry_id`.
  - Add approval-time guard (skip revenue post if already linked) in yutong/sinotruck/lightvehicle approval paths.
- `src/hooks/useSpecialHireFinance.ts` (`createSPHARInvoice`):
  - Ensure AR invoice creation posts JE when not already provided.
- `src/hooks/useLeasingFinance.ts`:
  - Add AP invoice creation JE + link.
  - Adjust payment JE logic to avoid double-expensing (payment should settle payable, not re-book expense/liability).

D. GL utility and audit consistency
- `src/lib/gl-posting-utils.ts`:
  - Add optional `source_module` support for invoice/receipt/payment posts.
- `src/hooks/useGLIntegrityScanner.ts`:
  - Fix AP config key to `default_expense_account_id`.
  - Keep guardian aligned with new posting points.

3) Diagram deliverables
- Update `src/components/accounting/InvoiceGLFlowDiagram.tsx` to section-by-section flows:
  - Manual AR/AP
  - Vehicle sales automation
  - Special Hire
  - School Bus
  - Leasing
  - NCG Express
  - Guard branches (create-time posted vs approval-time fallback)
- Generate full Mermaid at `/mnt/documents/gl-posting-full-flow.mmd` including NCG Holding parent + sub-business-units + NCG Express isolation.

4) Cross-check and acceptance
- Verify newly created AR/AP invoices always get `journal_entry_id` immediately (manual + automated paths).
- Verify no duplicate JEs on approval/payment guards.
- Verify COA balances move at invoice creation and at settlement with correct accounts.
- Verify for NCG Holding and each sub-company (via business_unit_code) and NCG Express standalone.
- If issue remains on your side: surface exact missing mapping in UI instead of generic success, so configuration gaps are immediately fixable.
