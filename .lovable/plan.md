
# Fix What Is Actually Still Missing

## What I verified
- **AR equity accounts are already enabled in code.** `ARInvoiceForm.tsx` already uses `accountTypes={["revenue", "income", "equity"]}`.
- **Equity accounts also exist in the database.** I confirmed equity rows like `STATED CAPITAL`, `RETAINED EARNINGS`, and `REVALUATION RESERVE`.
- Your **AR screenshot already shows those equity accounts**, so this part is working in the current build.
- **AP payment approval logic also already exists**, but in `APPaymentsView.tsx` it is only an **icon-only button** in the **Payments** tab.
- Your second screenshot is on **AP > Invoices**, not **AP > Payments**, so you would not see the payment approval action there.
- There is also a **real separate bug** on the AP screens: the red toast `document_templates.document_type_code does not exist`. That is caused by an outdated document-template hook and is likely confusing the flow.

## Updated plan

### 1) Keep AR equity support, but do one final consistency sweep
I will **not re-add the same AR change** because it is already present and working.
Instead, I will:
- cross-check for any other AR account selectors still using the old filter
- keep the current AR invoice line selector behavior unchanged if no duplicate old path exists

### 2) Make AP payment approval clearly visible
In `APPaymentsView.tsx` I will change the current subtle icon-only approve control into a **visible labeled button** like the AP invoice screen:
- show `Approve` text + `CheckCircle`
- keep it only for `approval_status === "pending"`
- keep disabled/loading behavior during mutation

This fixes the real UX problem: the action technically exists, but it is too easy to miss.

### 3) Fix the red document-template schema error
The AP screen error is real and should be fixed now.

I will update the document-template flow so it matches the current database schema:
- `document_templates` no longer has `document_type_code`
- it uses `template_type_id`
- the actual type code now comes from `document_template_types.type_code`
- the table uses `html_content`, while the hook still expects old `html_template` behavior

So I will:
- refactor `useDocumentTemplates.ts` to query the current schema correctly
- stop ordering/filtering by the missing `document_type_code` column
- map the current DB fields into the shape expected by the preview/editor code
- ensure AP pages no longer throw that red toast

### 4) Avoid loading preview code when it is not needed
`AccountsPayableView` mounts the preview modal even when it is closed. That means the broken template hook runs on page load.
I will change that so the preview modal only mounts when needed, which makes the AP screens cleaner and avoids unnecessary errors.

## Files to update
- `src/components/accounting/APPaymentsView.tsx`
- `src/hooks/useDocumentTemplates.ts`
- `src/components/accounting/AccountsPayableView.tsx`
- plus any small related template consumer file if the hook shape needs alignment

## Expected result
After this fix:
- **AR Invoice** continues to show equity accounts correctly
- **AP Payments** shows a clear visible **Approve** action in the row itself
- **AP Invoices / AP screens** stop showing the `document_templates.document_type_code does not exist` error
- the accounting flow becomes clearer and feels “actually there” instead of technically present but hard to notice

## Technical note
This is no longer mainly an AR-account-type issue. The real remaining problems are:
1. **AP payment approve button is implemented but not prominent enough**
2. **document template code is still using an old schema**

So the next implementation should target those two items, not repeat the already-correct AR equity change.
