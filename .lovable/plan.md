
Issue confirmed

I cross-checked the exact Yutong case for L H W K C Yasantha.

Verified state now:
- Order: `YTO-2026-0020`
- Operational side on `yutong_orders`: `total_paid = 6,001,000`, `balance_due = 32,249,000`
- Linked AR invoice: `49406124-472a-47c6-93da-91304b1b559b`
- Accounting side on `ar_invoices`: `paid_amount = 1,000,000`, `balance = 37,250,000`
- 3 verified payments exist: `1,000,000 + 5,000,000 + 1,000`
- All 3 payments have journal entries, but all are still posted as `YUT ADVANCE`
- There are no `ar_receipts` and no `ar_receipt_allocations` for this invoice/order

Conclusion:
You are correct. The operation side is updating, but the finance/AR side is not staying in sync.

Root causes found
1. `YutongPaymentTracking.tsx` still allows a silent fallback to stale order state when deciding payment type.
2. Post-invoice payments are not being reliably converted into:
   - balance receipts
   - AR receipt records
   - AR allocations
   - AR invoice paid/balance updates
3. The approved tax invoice is also incomplete on the finance side:
   - `ar_invoices.journal_entry_id` is still `null`
   - the full invoice revenue JE was not persisted back to the AR invoice
   - so later receipts are not landing on a fully linked finance document

Implementation plan

1. Fix payment verification authority in `src/components/yutong/YutongPaymentTracking.tsx`
- Re-fetch the order and use that fresh result as the only source for `ar_invoice_id`
- Remove silent fallback to stale `orderDetails.ar_invoice_id`
- If fresh finance state cannot be loaded, block verification instead of posting a wrong advance entry
- Use fresh `finance_customer_id` too
- If `ar_invoice_id` exists:
  - force payment type = `balance`
  - create AR receipt
  - create AR allocation
  - save `ar_receipt_id` back to `yutong_customer_payments`
- Only use `advance` if there is truly no AR invoice

2. Harden shared AR receipt logic in `src/hooks/useVehicleSalesFinance.ts`
- Make `createVehicleARReceipt()` fail loudly if:
  - receipt insert fails
  - allocation insert fails
  - AR invoice update fails
- Do not silently continue on partial finance failure
- Set receipt metadata correctly for invoice-linked receipts (`is_advance = false`)
- Ensure invoice `paid_amount`, `balance`, and `status` are updated only after successful allocation

3. Fix invoice approval finance link in `src/hooks/useYutongOrderInvoiceManagement.ts`
- On non-proforma approval:
  - create/update AR invoice
  - post the full invoice revenue-recognition JE for the full invoice amount
  - persist returned `journal_entry_id` onto `ar_invoices`
- Do not let approval look “successful” if the finance posting failed
- Keep advance application separate from invoice recognition:
  - invoice JE = full invoice amount
  - advance application JE = only already received advances

4. Repair the existing broken Yasantha records
- Reconcile order `YTO-2026-0020`
- Create the missing AR receipts/allocations for the later verified payments made after invoice approval
- Update AR invoice totals from:
  - `paid_amount = 1,000,000`
  - `balance = 37,250,000`
  to:
  - `paid_amount = 6,001,000`
  - `balance = 32,249,000`
- Review the later “advance” journal entries and correct them if needed so accounting matches reality

5. Add a safety check so this cannot repeat
- Flag verified Yutong payments where:
  - order has `ar_invoice_id`
  - but payment has no `ar_receipt_id`
- Flag approved Yutong AR invoices where `journal_entry_id` is still null

Files to modify
- `src/components/yutong/YutongPaymentTracking.tsx`
- `src/hooks/useVehicleSalesFinance.ts`
- `src/hooks/useYutongOrderInvoiceManagement.ts`

Expected result
- Yasantha’s accounting invoice will match the operational payment total
- First payment before invoice stays as advance
- Later payments after invoice approval reduce AR correctly
- Approved tax/customer invoices always carry the full invoice JE
- Operation and Finance stay synchronized

Technical details
```text
Correct accounting flow

Before invoice approval:
  DR Bank
  CR Customer Advance

At invoice approval:
  DR Trade Receivable      full invoice amount
  CR Sales Revenue / VAT

Apply earlier advances:
  DR Customer Advance
  CR Trade Receivable

Later payments:
  DR Bank
  CR Trade Receivable
  + AR Receipt
  + AR Allocation
  + AR Invoice paid_amount/balance update
```
