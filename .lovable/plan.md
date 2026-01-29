
# Fix Light Vehicle Invoice Generation - Column Name Mismatch

## Problem Identified

The invoice generation fails with error:
```
Failed to generate invoice: Could not find the 'invoice_data' column of 'lightvehicle_invoice_documents' in the schema cache
```

**Root Cause**: The code uses `invoice_data` but the actual database column is `document_data` (with text type instead of jsonb).

### Actual Database Schema

| Table | Column Name | Data Type |
|-------|-------------|-----------|
| `lightvehicle_invoice_documents` | `document_data` | text |
| `yutong_invoice_documents` | `invoice_data` | jsonb |

---

## Solution

Update `useLightVehicleOrderInvoiceManagement.ts` to use the correct column name `document_data` and convert JSON to string.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useLightVehicleOrderInvoiceManagement.ts` | Change `invoice_data` to `document_data` with JSON.stringify |

---

## Technical Changes

### useLightVehicleOrderInvoiceManagement.ts

**1. Update Interface (Line 32)**

```typescript
// BEFORE
invoice_data?: any;

// AFTER
document_data?: string;
```

**2. Update Insert Operation (Line 163)**

```typescript
// BEFORE
invoice_data: fullInvoiceData

// AFTER
document_data: JSON.stringify(fullInvoiceData)
```

**3. Update Update Operation (Line 227)**

```typescript
// BEFORE
invoice_data: fullInvoiceData

// AFTER
document_data: JSON.stringify(fullInvoiceData)
```

---

## Expected Outcome

After this fix:
1. Invoice generation will work without database errors
2. Invoice records will be saved correctly
3. Invoice data will be stored as JSON string in `document_data` column

---

## Testing Checklist

1. Open an order's Documents tab
2. Click "Generate Invoice"
3. Select Direct or Proforma invoice type
4. Verify invoice generates successfully (no error toast)
5. Verify invoice appears in the list
6. Verify View and Download work correctly
