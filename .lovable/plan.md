

# Fix: AP Payments shows "Unknown" for Direct (Float) and Customer payees

## Root cause

`APPaymentsView.getVendorName(vendor_id)` only looks up the `vendors` table. For three types of records, `vendor_id` is NULL by design, so the function falls through to `"Unknown"`:

| `payee_type` | `vendor_id` | `payee_customer_id` | `bus_no` | What we should show |
|---|---|---|---|---|
| `vendor` | uuid | NULL | NULL | Vendor name (works today) |
| `customer` | NULL | uuid | NULL | Customer name (broken — shows "Unknown") |
| `direct` (fuel float) | NULL | NULL | e.g. `BF-023` | "Bus BF-023 (Fuel)" (broken — shows "Unknown") |

Verified in DB: 28 `DP-FUEL-*` rows and 1 `PAY-2026-20264` (customer) all show "Unknown" in the table because the resolver never checks `payee_customer_id` or `bus_no`.

Secondary issue: `useAPPayments` joins `vendors` and `bank_accounts` but never joins `customers`, so even if we fix the resolver we'd need the customer record available.

## What I'll change

### 1. `src/hooks/useAccountingData.ts` — `useAPPayments` query
Add a customer join to the select string so each payment row carries the customer's name when applicable:
```
customers!ap_payments_payee_customer_id_fkey (
  id, customer_code, customer_name
)
```
(If the FK constraint name differs, fall back to `customers ( id, customer_code, customer_name )` — Supabase will infer it from `payee_customer_id`.)

### 2. `src/components/accounting/APPaymentsView.tsx` — payee resolver
Replace `getVendorName(vendor_id)` with a new `getPayeeLabel(payment)` that returns:
- **vendor** → `payment.vendors?.vendor_name` (or vendor lookup as fallback)
- **customer** → `payment.customers?.customer_name` with a small grey "(Customer)" suffix or badge
- **direct** → `Bus ${payment.bus_no} (Fuel Float)` when `bus_no` exists, otherwise `"Direct (Float)"`
- fallback → `"Unknown"` (only when no payee data at all)

Apply this resolver in:
- The "Vendor" column cell (line 316)
- The cheque print payee (line 123)
- The search filter (line 92) so users can search by customer name and bus_no

### 3. Update the column header label
Rename the column header `"Vendor"` → `"Payee"` to reflect that the column now correctly shows vendors, customers, and direct payees.

### 4. Empty filter `vendor_id` in select
The "All Vendors" dropdown filter (line 237) only lists vendors — leave it as is, but make sure searching by customer name / bus_no still works through the `searchTerm` filter (already covered above).

## Files touched

| File | Change |
|---|---|
| `src/hooks/useAccountingData.ts` | Add `customers` join to `useAPPayments` select |
| `src/components/accounting/APPaymentsView.tsx` | New `getPayeeLabel` resolver covering vendor + customer + direct/bus; column rename; search update |

## What you'll see after the fix

1. The 28 **DP-FUEL-2026...** rows now show **"Bus BF-023 (Fuel Float)"**, **"Bus BF-009 (Fuel Float)"**, etc. instead of "Unknown".
2. **PAY-2026-20264** (the customer payment) shows the actual customer name with a `(Customer)` tag.
3. Vendor payments continue to show vendor names exactly as before.
4. The column header reads **"Payee"**, and search now matches vendor names, customer names, and bus numbers.
5. Cheque preview / print shows the correct payee for all three types.

