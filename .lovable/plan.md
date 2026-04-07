

# Fix: AP Payment Delete Fails Due to Cheque Register Foreign Key

## Problem
Deleting AP payments fails with a **409 Conflict** error:
> "Key is still referenced from table 'cheque_register'" — `cheque_register_payment_id_fkey` on `ap_payments`

The `useDeleteAPPayment` function deletes allocations, bank transactions, JE, and payment lines — but **never deletes the linked `cheque_register` row**. Since `cheque_register.payment_id` references `ap_payments.id`, the final delete fails.

## Fix

### File: `src/hooks/useAccountingMutations.ts`

Add a new step between step 2 (delete allocations) and step 3 (delete bank transactions):

```
// 2b. Delete linked cheque register entries
await supabase.from("cheque_register").delete().eq("payment_id", id);
```

Similarly, in `useDeleteARReceipt`, add:
```
// Delete linked cheque register entries (ar_receipt_id)
await supabase.from("cheque_register").delete().eq("ar_receipt_id", id);
```

This ensures the foreign key constraint is cleared before the parent payment/receipt row is deleted.

## Files
- **Modify**: `src/hooks/useAccountingMutations.ts` — add cheque_register cleanup to both `useDeleteAPPayment` and `useDeleteARReceipt`

