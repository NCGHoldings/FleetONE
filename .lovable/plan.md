
# Fix Light Vehicle Invoice Generation Error

## Problem Identified

The invoice generation fails with the error:
```
Failed to generate invoice: Could not find the 'invoice_date' column of 'lightvehicle_invoice_records' in the schema cache
```

**Root Cause**: The code in `useLightVehicleOrderInvoiceManagement.ts` line 139 tries to insert into a column called `invoice_date`, but this column doesn't exist in the database table.

Looking at the actual database schema for `lightvehicle_invoice_records`:
- ❌ `invoice_date` - Does NOT exist
- ✅ `generated_at` - Exists (for when invoice was generated)
- ✅ `created_at` - Exists (auto-generated timestamp)

## Solution

### Option 1: Use Existing Column (Recommended)

Change the code to use `generated_at` instead of `invoice_date`:

```typescript
// Line 139 - BEFORE:
invoice_date: new Date().toISOString().split('T')[0],

// AFTER:
generated_at: new Date().toISOString(),
```

### Option 2: Add Missing Column via Migration

Add the `invoice_date` column to the database table.

---

## Recommended Approach: Option 1

Use the existing `generated_at` column and update the TypeScript interface and component to match.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useLightVehicleOrderInvoiceManagement.ts` | Replace `invoice_date` with `generated_at` |
| `src/components/lightvehicle/LightVehicleOrderInvoiceGenerator.tsx` | Update date display to use `created_at` or `generated_at` |

---

## Technical Details

### Fix 1: useLightVehicleOrderInvoiceManagement.ts

**Line 139**: Replace `invoice_date` with `generated_at`:

```typescript
// Create invoice record - BEFORE
const { data: invoiceRecord, error: recordError } = await supabase
  .from('lightvehicle_invoice_records')
  .insert({
    invoice_number: invoiceNo,
    order_id: invoiceData.orderId,
    quotation_id: invoiceData.quotationId,
    invoice_date: new Date().toISOString().split('T')[0],  // ❌ Column doesn't exist
    amount: invoiceAmount,
    ...
  });

// AFTER
const { data: invoiceRecord, error: recordError } = await supabase
  .from('lightvehicle_invoice_records')
  .insert({
    invoice_number: invoiceNo,
    order_id: invoiceData.orderId,
    quotation_id: invoiceData.quotationId,
    generated_at: new Date().toISOString(),  // ✅ Use existing column
    amount: invoiceAmount,
    ...
  });
```

Also update the interface at **line 11**:

```typescript
// BEFORE
export interface LightVehicleInvoiceRecord {
  ...
  invoice_date?: string;
  ...
}

// AFTER
export interface LightVehicleInvoiceRecord {
  ...
  generated_at?: string;
  ...
}
```

### Fix 2: LightVehicleOrderInvoiceGenerator.tsx

**Line 226**: Update the date display:

```typescript
// BEFORE
{invoice.invoice_date && format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}

// AFTER  
{(invoice.generated_at || invoice.created_at) && format(new Date(invoice.generated_at || invoice.created_at), 'MMM dd, yyyy')}
```

---

## Expected Outcome

After these fixes:
1. Invoice generation will work without errors
2. Invoices will be saved to the database correctly
3. Invoice dates will display properly in the list

---

## Testing Checklist

1. Open an order's Documents tab
2. Click "Generate Invoice"
3. Select "Direct Invoice" or "Proforma"
4. Verify invoice generates successfully
5. Verify invoice appears in the list with correct date
6. Verify "View" and "Download" buttons work
