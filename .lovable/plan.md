

# Add "Direct Payment" Mode to AP Payments

## What the User Wants

A "Direct Payment" (Direct Invoice) option in AP — pay a vendor **without creating an AP invoice first**. The user selects a vendor, then adds line items with GL account, description, quantity, price, tax, etc. — all payment details entered directly, no invoice selection needed.

## Current State

- `APPaymentForm` has two modes: **Normal** (allocate to invoices) and **Advance** (lump sum, no allocation)
- No `ap_payment_lines` table exists — payments are single-amount records
- Direct payments need line-item detail for proper GL posting (each line to a different expense account)

## Plan

### 1. Database Migration — Create `ap_payment_lines` table

```sql
CREATE TABLE public.ap_payment_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.ap_payments(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES public.chart_of_accounts(id),
  description TEXT,
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  tax_rate NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  line_total NUMERIC DEFAULT 0,
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ap_payment_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage ap_payment_lines" ON public.ap_payment_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

Also add `is_direct_payment BOOLEAN DEFAULT false` column to `ap_payments`.

### 2. Update `APPaymentForm.tsx` — Add "Direct Payment" mode

Add a **third mode** via the existing toggle pattern:
- **Normal** — allocate to invoices (existing)
- **Advance** — lump sum (existing)
- **Direct Payment** — new: shows line-item table with GL Account, Description, Qty, Unit Price, Tax, Total

When "Direct Payment" is toggled ON:
- Hide invoice allocation section
- Show a line-items table (same pattern as AP Invoice form) with columns: GL Account (SearchableAccountSelector) | Description | Qty | Unit Price | Tax Rate | Total
- Add/remove line buttons
- Auto-calculate line totals and grand total
- Submit creates the payment with `is_direct_payment: true` and inserts lines into `ap_payment_lines`

### 3. Update `useCreateAPPayment` in `useAccountingMutations.ts`

- Accept optional `direct_lines` array in the mutation input
- Accept `is_direct_payment` boolean
- After inserting the payment, if `is_direct_payment`, insert all lines into `ap_payment_lines`
- For GL posting: instead of debiting Trade Payable, debit each line's GL account directly (expense accounts) and credit the bank account — similar to how AP Invoice GL posting works with line-level accounts

### 4. Update `types.ts` (auto-updated by migration)

## Files to Change

| File | Change |
|---|---|
| Migration SQL | Create `ap_payment_lines` table, add `is_direct_payment` to `ap_payments` |
| `src/components/accounting/APPaymentForm.tsx` | Add Direct Payment toggle + line-items table with GL Account, Description, Qty, Price, Tax columns |
| `src/hooks/useAccountingMutations.ts` | Update `useCreateAPPayment` to handle direct payment lines + GL posting per line account |

