

# Fix: "invalid input syntax for type uuid: customer:..." when selecting a Customer in AP Direct Payment

## Root cause

`SearchableVendorSelector` returns customer IDs prefixed with `customer:<uuid>` (line 102) so the consumer can distinguish vendor vs customer rows. But two consumers don't unwrap the prefix:

1. **`APPaymentForm.tsx`** stores the raw `customer:UUID` string in form state and passes it as `vendor_id` to the mutation.
2. **`useCreateAPPayment` (`useAccountingMutations.ts` lines 1100–1132)** uses that string in `vendors.select(...).eq("id", payment.vendor_id)` *and* inserts it into `ap_payments.vendor_id` (a `uuid` column) → Postgres rejects with `22P02 invalid input syntax for type uuid`.

The DB already has the correct columns to support this case: `payee_type` (text, NOT NULL), `payee_customer_id` (uuid, nullable), `vendor_id` (uuid, nullable). The `payee_consistency_check` constraint we added in the last migration accepts `payee_type='customer' AND payee_customer_id IS NOT NULL AND vendor_id IS NULL`. So the schema is ready — only the code needs to split the prefixed string and route it correctly.

## What I'll change

### 1. `src/components/accounting/APPaymentForm.tsx`
- Add a small helper at the top of the component: `parsePayee(value) → { type: 'vendor'|'customer', id: uuid }`. If value starts with `customer:`, type=customer, id=substring(9); else type=vendor, id=value.
- In `handleVendorChange`: keep storing the prefixed string in local UI state (so the dropdown stays highlighted) but compute the real id/type once and stash it in two new state vars `payeeType`, `payeeId`.
- In `onSubmit`: pass the real id + type to the mutation as new fields `payee_type` and `payee_id` (instead of always sending `vendor_id`). Skip the vendor-bank-account fetch when payee is a customer.
- Skip "pending invoices for vendor" panel and bank-account autofill when payee is a customer (those queries assume vendors).

### 2. `src/hooks/useAccountingMutations.ts` — `useCreateAPPayment`
- Extend the input type with `payee_type?: 'vendor'|'customer'` and `payee_id?: string`. Keep `vendor_id` for backward compatibility — if `payee_type` is missing, derive it (vendor).
- Before the `vendors` lookup: if `payee_type==='customer'`, fetch from `customers` table for the name instead; otherwise fetch from `vendors`.
- In the `ap_payments.insert(...)` call, set:
  - `payee_type: payeeType`
  - `vendor_id: payeeType==='vendor' ? payeeId : null`
  - `payee_customer_id: payeeType==='customer' ? payeeId : null`
- Same split applied to the GL posting block downstream (description text uses the resolved name; AR-vs-AP control account remains AP because the user is paying out — payee being a customer just means a customer refund / vendor payment to a customer entity).

### 3. Defensive guard in the selector itself (one-line fix)
- `SearchableVendorSelector` continues to emit `customer:<uuid>`. No change to its public contract — other call sites already handle/ignore customers because they pass `includeCustomers=false` by default.

## Files touched

| File | Change |
|---|---|
| `src/components/accounting/APPaymentForm.tsx` | Parse `customer:<uuid>` prefix; track `payee_type` + `payee_id`; pass them to mutation; skip vendor-only side effects when payee is a customer. |
| `src/hooks/useAccountingMutations.ts` | Extend `useCreateAPPayment` input with `payee_type`/`payee_id`; route lookup + insert to `vendors` or `customers` accordingly; populate `payee_type` + correct id column. |

No DB migration needed — schema and the constraint already accept `payee_type='customer'`.

## What you'll see after the fix

1. In **Direct Payment (Without Invoice)**, picking a **Customer** from the Vendor / Payee dropdown no longer throws *"invalid input syntax for type uuid"*.
2. The payment saves with `payee_type='customer'`, `payee_customer_id=<uuid>`, `vendor_id=NULL` — passing the consistency check.
3. The toast confirms success and the new payment appears under **AP → Payments** with the customer name in the payee column.
4. Vendor selections continue to work exactly as before (backward compatible).
5. Bank-account autofill / pending-invoice panel now correctly stay hidden when the selected payee is a customer.

