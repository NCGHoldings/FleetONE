

# Fix duplicate AP invoice + Add "Direct Payment" mode for fuel imports

## Issue 1: Duplicate AP Invoice error (the red box you saw)

**Root cause** in `src/hooks/useSchoolBusBulkExpenses.ts` line 260:

The invoice number is built as `${invoiceNumber}-${busId.substring(0,4)}`. When two buses in the same import share the **same first 4 chars of their UUID** (rare but possible), or when you re-run the same Master Invoice No. twice, the unique constraint `ap_invoices_vendor_id_invoice_number_key` rejects the second row.

**Fix:** make the per-row invoice number truly unique by using:
- `${masterInvoiceNo}-${busNo}-${expenseDate}` (uses the human-readable bus number + date, not a UUID slice)
- Plus a sequence index `(i+1)` as a final guard against same-bus same-day duplicates

Also: AP invoices that **were partially created before the failure** (the ones you can see succeeded in the screenshot) leave the import in a half-posted state. Fix #2 below addresses that.

## Issue 2: Half-posted imports leave orphaned AP invoices

Currently the loop creates a JE → AP invoice → JE lines per bus. If row 11 fails, rows 1–10 are already in the DB and you cannot retry without manually deleting them. 

**Fix:** wrap the entire batch in a server-side transaction via a new edge function `bulk-import-fuel-expenses` so it's all-or-nothing. Cleaner than client-side rollback.

## Issue 3: NEW — "Direct Payment" payment mode (the main feature you asked for)

Add a 4th option in the **Payment Mode** dropdown on `/school-bus/import-expenses`:

| Existing | NEW |
|---|---|
| Trade Payable (AP / Credit) | **Direct Payment (No AP)** ← new |
| Petty Cash | |
| IOU Account | |

When **Direct Payment** is selected:
- A new field appears: **"Pay From Account"** (Select)
  - Defaulted to **`FUEL FLOAT - DIALOG TOUCH_SBS`** (account code 13005002, the asset account you mentioned)
  - Dropdown also lists `FUEL FLOAT - DIALOG TOUCH`, `FUEL FLOAT - DIALOG TOUCH_SHS`, all bank accounts, and any other asset float accounts so the user can switch
- **No AP invoice** is created (skips the duplicate-key bug entirely for this mode)
- **No vendor / invoice number / due date** fields shown
- Per-bus posting:
  - **DR** Fuel Expense (existing fuel expense GL)
  - **CR** FUEL FLOAT - DIALOG TOUCH_SBS (or whatever the user picked)
- The asset balance on the float account is reduced automatically via the existing `updateAccountBalancesFromJournalEntry` helper (already handles asset-normal credit reductions correctly)

This matches the real-world flow: Dialog Touch fuel float is pre-loaded with money, fuel pumps deduct from it directly, no supplier invoice exists.

## Files to change

| File | Change |
|---|---|
| `src/hooks/useSchoolBusBulkExpenses.ts` | (1) Fix invoice-number uniqueness (use `bus_no` + date + index, not UUID slice). (2) Add `paymentMethod: 'direct'` branch with `directPaymentAccountId` in payload. (3) Skip `ap_invoices` insert when mode is `direct`. (4) Use the chosen asset account as the credit account. |
| `src/pages/SchoolBusExpenseImport.tsx` | (1) Add `'direct'` to the `paymentMethod` union. (2) Add `directPaymentAccountId` state. (3) Add new `<SelectItem value="direct">Direct Payment (Fuel Float / Bank)</SelectItem>`. (4) Render a new dynamic block when `paymentMethod === 'direct'` with a "Pay From Account" select pre-populated from `chart_of_accounts` filtered to `account_type='asset'` and name containing `FLOAT` or `BANK`, defaulted to the SBS float. (5) Pass the new field to the mutation. |
| (optional) `supabase/functions/bulk-import-fuel-expenses/index.ts` | New edge function wrapping the batch in a single transaction so partial failures roll back cleanly. *Skipping in v1 to keep scope tight — can be added next.* |

## What you'll see after the fix

1. The duplicate-AP-invoice error stops happening for normal AP imports (fix #1).
2. New **"Direct Payment (Fuel Float / Bank)"** option in the Payment Mode dropdown.
3. Selecting it shows a single "Pay From Account" picker, defaulted to `FUEL FLOAT - DIALOG TOUCH_SBS`.
4. Confirm & Post → for every bus row: **DR Fuel Expense / CR Fuel Float SBS** — no AP invoice, no vendor, no due date.
5. The Fuel Float SBS asset balance (currently Rs 5,000,000) drops by the total fuel cost imported.
6. Daily bus expenses, mileage, and journal entries still get created exactly as they do today.

## Out of scope (mention if you want them next)
- Cleaning up the orphaned AP invoices already created in your failed run (need a cleanup script — say the word and I'll write it).
- Same Direct Payment option for the non-bulk single-expense entry form.
- Edge-function transactional wrapping for atomic rollback.

