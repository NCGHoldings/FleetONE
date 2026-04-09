

# Monthly Billing Percentage — Charge 80% (or Custom %) of Fixed Amount

## How It Works Today

When you generate bulk AR invoices, each student is charged their full `current_amount_due` (which equals `fixed_monthly_amount` + any outstanding balance). There is **no way** to charge a partial percentage of the fixed amount for a given month.

## Your Scenario

- Student fixed amount: LKR 100
- This month you only want to charge 80% = LKR 80
- Plus any outstanding balance carried forward
- The percentage should default to 80% but be adjustable each month before generating invoices

## Solution

### 1. Add `billing_percentage` to settings table

Add a new column `billing_percentage` (default 80) to `school_bus_finance_settings`. This is the default percentage applied each month but can be overridden at invoice generation time.

```sql
ALTER TABLE school_bus_finance_settings 
ADD COLUMN billing_percentage numeric DEFAULT 80;
```

### 2. Add percentage input to the Invoice Generation UI

In the bulk invoice generation dialog/form, add a slider or number input:
- Label: **"Monthly Charge %"**
- Default: 80% (from settings)
- Range: 1–100
- Shows preview: "Fixed LKR 100 × 80% = LKR 80 + Outstanding"

### 3. Update invoice amount calculation

**File**: `src/hooks/useSchoolBusFinance.ts` — `generateBulkInvoices` function

Current calculation (line 464):
```typescript
const rawAmount = student.current_amount_due || student.fixed_monthly_amount || 0;
```

New calculation:
```typescript
const fixedAmount = student.fixed_monthly_amount || 0;
const chargeAmount = fixedAmount * (billingPercentage / 100);
const outstanding = Math.abs(Math.min(student.payment_balance, 0));
const rawAmount = chargeAmount + outstanding;
```

This separates:
- **This month's charge**: fixed amount × percentage (e.g., 100 × 80% = 80)
- **Carried forward outstanding**: any unpaid balance from previous months
- **Total invoice amount**: charge + outstanding - any credit

### 4. Update settings UI

Add the billing percentage field to the School Bus Finance Settings panel so admins can change the default (currently in the finance settings component).

### 5. Update `current_amount_due` on students after invoice generation

After invoices are generated, update each student's `current_amount_due` to reflect the actual invoiced amount (charge + outstanding), so the Outstanding tab and KPI cards match the invoices.

## Files to Change

- **New SQL migration** — add `billing_percentage` column to `school_bus_finance_settings`
- **`src/hooks/useSchoolBusFinance.ts`** — update `generateBulkInvoices` to apply percentage to fixed amount, add outstanding separately
- **Invoice generation UI component** — add percentage input with default from settings
- **Finance settings UI** — add default billing percentage field

## Result

- Default 80% charge applied to fixed monthly amount
- Outstanding balance always added on top (never reduced by percentage)
- Adjustable per month before generating invoices
- Preview shows breakdown: "Fixed × 80% + Outstanding = Invoice Amount"
- Settings stores the default so you don't have to enter it every month

