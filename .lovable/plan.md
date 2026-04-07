

# Fix: Landed Cost Voucher — DB Error + Allocation Logic

## 3 Issues Found

### Issue 1: Database Error (400 Bad Request)
The GRN query on line 111 orders by `received_date`, but the column is actually `receipt_date`. This causes the "column goods_receipt_notes.received_date does not exist" error visible in your console.

**Fix**: Change `.order("received_date")` → `.order("receipt_date")`

### Issue 2: "By Quantity" Allocation — Wrong Logic
Currently both "By Quantity" and "By Weight" fall into the same `else` branch that simply divides charges equally among items:
```js
if (voucher.allocation_method === "by_value") {
  allocatedCost = (item.original_cost / totalOriginalCost) * totalCharges;
} else {
  allocatedCost = totalCharges / items.length;  // ← same for both!
}
```

**Correct "By Quantity"** should allocate proportionally based on each item's quantity:
```
allocatedCost = (item.quantity / totalQuantity) * totalCharges
```

This applies in BOTH places — the hook (`useInventoryEnhanced.ts`) and the preview function (`getAllocation` in the modal).

### Issue 3: "By Weight" Allocation — No Weight Data
The `VoucherItem` interface has no `weight` field. For proper weight-based allocation, we need to:
- Add an optional `weight` field to items (user enters per-item weight in kg)
- Show weight input column when "By Weight" is selected
- Allocate: `(item.weight / totalWeight) * totalCharges`

## Files
- **Modify**: `src/components/accounting/inventory/CreateLandedCostVoucherModal.tsx`
  - Fix `received_date` → `receipt_date`
  - Fix `getAllocation()` to handle all 3 methods properly
  - Add `weight` field to `VoucherItem` interface
  - Show weight input column when allocation method is "By Weight"
  - Pass quantity + weight data to the mutation
- **Modify**: `src/hooks/useInventoryEnhanced.ts`
  - Add `quantity` and `weight` to the mutation's item type
  - Implement correct allocation for all 3 methods:
    - **By Value**: `(originalCost / totalOriginalCost) * totalCharges`
    - **By Quantity**: `(quantity / totalQuantity) * totalCharges`
    - **By Weight**: `(weight / totalWeight) * totalCharges`

## Result
All 3 allocation methods will work correctly, GRN loading will stop erroring, and "By Weight" will have a proper weight input column.

