

# Fix: Missing Amount Input When No Invoices Available

## Problem

When recording an AR Receipt for a customer who has no outstanding invoices (like Ms. Kanthi Perera in the screenshot), the form shows "No outstanding invoices for this customer" but provides **no way to enter an amount**. The Total Receipt Amount stays at LKR 0.00 and the form cannot be submitted.

Currently, a direct amount input only appears in two cases:
1. Advance mode is ON
2. A Vendor is selected (not a customer)

For a **Customer with zero outstanding invoices**, neither condition is met, so the amount field is hidden.

## Solution

Add a direct amount input for customers when there are no outstanding invoices to allocate against. This covers the common case where a customer pays but their invoice hasn't been created yet, or the payment is a general receipt.

## File to Change

**`src/components/accounting/ARReceiptForm.tsx`** — after the "No outstanding invoices" message (around line 717-721), add a direct amount input field similar to the vendor amount input. Also update `canSubmit` logic (line 352-356) so customer receipts with a manually entered amount and no allocations can still be submitted.

Specific changes:
- After `"No outstanding invoices for this customer"` text, render a direct amount input so users can type the receipt amount
- Update `canSubmit`: for customer non-advance with 0 allocations, allow submit if `form.watch("amount") > 0`
- Update Total Receipt Amount display to show the manual amount when no allocations exist

