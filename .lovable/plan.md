
# Fix Light Vehicle Invoice Module - Multiple Issues

## Problems Identified

### Issue 1: Signatures Not Loading
**Error**: `column lightvehicle_invoice_signatures.created_at does not exist`

**Root Cause**: The `useLightVehicleInvoiceSignatures.ts` hook tries to order by `created_at`, but this column doesn't exist in the database table.

**Actual Database Columns**:
| Column | Type |
|--------|------|
| id | uuid |
| invoice_record_id | uuid |
| signature_role | text |
| signer_name | text |
| signature_data | text |
| signature_type | text |
| signed_at | timestamp |
| signed_by | uuid |

Notice: **No `created_at` column** exists!

---

### Issue 2: Download URL Not Available
**Error**: "Download URL not available" when clicking Download

**Root Cause**: The `getInvoiceDownloadUrl` function queries `lightvehicle_invoice_documents` to get the file path, but **no document records exist** despite files being successfully uploaded to storage.

**Evidence**:
- Storage has files: `bf37267f.../LTV-INV-2026-00003_draft.pdf`, etc.
- Documents table is empty: `SELECT * FROM lightvehicle_invoice_documents` returns `[]`
- Invoice records exist with valid IDs

**Likely Cause**: The document insert is silently failing or being skipped. The code throws the error but might be catching it without proper logging.

---

### Issue 3: Currency Format Still Shows USD
In `LightVehicleOrderInvoiceGenerator.tsx` line 154, the currency formatter still uses USD:
```typescript
currency: 'USD'  // Should be 'LKR'
```

---

## Solution

### Fix 1: Update Signatures Query
In `useLightVehicleInvoiceSignatures.ts`, change the order clause from `created_at` to `signed_at`:

```typescript
// Line 28 - BEFORE:
.order('created_at', { ascending: true });

// AFTER:
.order('signed_at', { ascending: true });
```

Also update the interface to remove `created_at`:
```typescript
// Line 14 - BEFORE:
created_at?: string;

// AFTER:
// Remove this line entirely
```

---

### Fix 2: Improve Document Insert Error Handling
In `useLightVehicleOrderInvoiceManagement.ts`, add proper error handling and ensure document records are created. The issue might be that errors during document insert aren't being caught properly.

Check and ensure the insert includes all required fields and add explicit logging:
```typescript
// Line 155-165 - Enhanced error handling
console.log('Inserting document record for:', invoiceRecord.id);
const { data: docData, error: docError } = await supabase
  .from('lightvehicle_invoice_documents')
  .insert({
    invoice_record_id: invoiceRecord.id,
    document_type: 'invoice',  // Add this field
    file_name: `${invoiceNo}_draft.pdf`,
    file_path: fileName,
    file_size: pdfBlob.size,
    document_status: 'draft',
    document_data: JSON.stringify(fullInvoiceData)
  })
  .select()
  .single();

if (docError) {
  console.error('Document insert error:', docError);
  throw docError;
}
console.log('Document record created:', docData);
```

---

### Fix 3: Update Currency Format
In `LightVehicleOrderInvoiceGenerator.tsx`, update the currency formatter:

```typescript
// Line 154 - BEFORE:
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

// AFTER:
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2
  }).format(amount);
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useLightVehicleInvoiceSignatures.ts` | Fix `created_at` → `signed_at` in order clause |
| `src/hooks/useLightVehicleOrderInvoiceManagement.ts` | Add `document_type` field and improve error handling |
| `src/components/lightvehicle/LightVehicleOrderInvoiceGenerator.tsx` | Fix currency format USD → LKR |

---

## Technical Details

### useLightVehicleInvoiceSignatures.ts Changes

**Line 14**: Remove `created_at` from interface:
```typescript
export interface LightVehicleInvoiceSignature {
  id: string;
  invoice_record_id: string;
  signature_role: string;
  signer_name: string;
  signature_data: string;
  signature_type: string;
  signed_at: string;
  signed_by?: string;
  // created_at removed - doesn't exist in table
}
```

**Line 28**: Fix order by clause:
```typescript
.order('signed_at', { ascending: true });
```

### useLightVehicleOrderInvoiceManagement.ts Changes

**Lines 155-166**: Add `document_type` and improve logging:
```typescript
const { data: docData, error: docError } = await supabase
  .from('lightvehicle_invoice_documents')
  .insert({
    invoice_record_id: invoiceRecord.id,
    document_type: 'invoice',  // ADD THIS
    file_name: `${invoiceNo}_draft.pdf`,
    file_path: fileName,
    file_size: pdfBlob.size,
    document_status: 'draft',
    document_data: JSON.stringify(fullInvoiceData)
  })
  .select()
  .single();
```

### LightVehicleOrderInvoiceGenerator.tsx Changes

**Lines 153-158**: Update currency formatter:
```typescript
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2
  }).format(amount);
};
```

---

## Expected Outcome

After these fixes:
1. Signatures tab will load without errors
2. Document records will be created in the database
3. Download button will work (files already exist in storage)
4. Currency displays as LKR instead of USD

---

## Testing Checklist

1. **Signatures**
   - Open an invoice's "Signatures" tab
   - Verify no console errors
   - Add a signature and verify it saves

2. **Invoice Generation**
   - Generate a new invoice
   - Check database has document record
   - Click Download - verify PDF downloads

3. **Currency Display**
   - Verify invoice list shows LKR amounts
   - Verify PDF shows LKR formatting
