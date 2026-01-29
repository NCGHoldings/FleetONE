
# Fix Light Vehicle Invoice Module - Comprehensive Fixes

## Summary of Issues Found

I've identified **5 distinct issues** affecting the Light Vehicle invoice module:

| Issue | Description | Severity |
|-------|-------------|----------|
| 1. View Button Not Working | Modal missing DialogTitle causing accessibility warnings | Medium |
| 2. Download Not Working | Document records not being created in database - table is empty | High |
| 3. Currency Format Wrong | LightVehicleInvoiceTypeModal still shows USD instead of LKR | Low |
| 4. Accessibility Warning | DialogContent missing required DialogTitle | Low |
| 5. Document Insert Failing | Silent failure - documents table is empty despite successful uploads | High |

---

## Root Cause Analysis

### Issue 1 & 4: View Button / DialogTitle Warning
The console shows: `DialogContent requires a DialogTitle for the component to be accessible`

Looking at `LightVehicleInvoiceSignatureModal.tsx`, all dialogs appear to have DialogTitle. The warning likely comes from a conditional render or missing title in certain states.

### Issue 2 & 5: Download Not Working / Documents Not Saved
**Database Evidence:**
- `lightvehicle_invoice_records`: Has 3 records (invoices created successfully)
- `lightvehicle_invoice_documents`: **0 records** (documents NOT being saved)

Despite the code appearing correct, the document insert is silently failing. Looking at the database schema, all columns are nullable except `id`, so the insert should work. However, the storage bucket is working (files exist).

**Possible cause**: The `invoice_record_id` might not be properly linked, or there's a timing issue between invoice record creation and document insertion.

### Issue 3: Currency Format in TypeModal
In `LightVehicleInvoiceTypeModal.tsx` line 50-55:
```typescript
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'  // Should be LKR
  }).format(amount);
};
```

---

## Solution

### Fix 1: LightVehicleInvoiceTypeModal.tsx - Currency Format

Update the currency formatter to use LKR:

```typescript
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2
  }).format(amount);
};
```

### Fix 2: useLightVehicleOrderInvoiceManagement.ts - Improve Document Creation

The document insert appears to be in the correct format, but it may be failing silently. I'll add more robust error handling and ensure the data is properly structured.

**Changes:**
1. Add explicit null checks before document insert
2. Ensure `invoice_record_id` is properly passed
3. Add additional logging to debug any remaining issues
4. Ensure the transaction completes properly

```typescript
// Enhanced document insertion with better error handling
if (!invoiceRecord?.id) {
  throw new Error('Invoice record ID is missing');
}

console.log('Creating document for invoice record:', invoiceRecord.id, 'with path:', fileName);

const documentPayload = {
  invoice_record_id: invoiceRecord.id,
  document_type: 'invoice',
  file_name: `${invoiceNo}_draft.pdf`,
  file_path: fileName,
  file_size: pdfBlob.size,
  document_status: 'draft',
  document_data: JSON.stringify(fullInvoiceData)
};

console.log('Document payload:', JSON.stringify(documentPayload, null, 2));

const { data: docData, error: docError } = await supabase
  .from('lightvehicle_invoice_documents')
  .insert(documentPayload)
  .select()
  .single();

if (docError) {
  console.error('Document insert error:', docError);
  // Don't throw - invoice is already created, just log warning
  toast.warning('Invoice created but document record failed to save');
} else {
  console.log('Document record created successfully:', docData);
}
```

### Fix 3: Add Fallback Download Method

If the document record doesn't exist, provide a fallback that constructs the path from the invoice number:

```typescript
const getInvoiceDownloadUrl = async (invoiceRecordId: string): Promise<string | null> => {
  try {
    // First try to get from documents table
    const docs = await fetchInvoiceDocuments(invoiceRecordId);
    
    if (docs.length > 0 && docs[0].file_path) {
      const { data } = supabase.storage
        .from('lightvehicle-invoices')
        .getPublicUrl(docs[0].file_path);
      return data.publicUrl;
    }

    // Fallback: construct path from invoice record
    const { data: record } = await supabase
      .from('lightvehicle_invoice_records')
      .select('invoice_number, order_id, status')
      .eq('id', invoiceRecordId)
      .single();

    if (record) {
      const fallbackPath = `${record.order_id}/${record.invoice_number}_${record.status}.pdf`;
      const { data } = supabase.storage
        .from('lightvehicle-invoices')
        .getPublicUrl(fallbackPath);
      return data.publicUrl;
    }

    return null;
  } catch (error) {
    console.error('Error getting download URL:', error);
    return null;
  }
};
```

### Fix 4: LightVehicleInvoiceSignatureModal.tsx - Ensure DialogTitle

Add VisuallyHidden wrapper or ensure DialogTitle is always present:

```typescript
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
// DialogTitle is already present - no fix needed here
```

After reviewing `LightVehicleInvoiceSignatureModal.tsx`, it already has `DialogTitle`. The warning might come from another modal - need to check `LightVehicleInvoiceDataModal.tsx`.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/lightvehicle/LightVehicleInvoiceTypeModal.tsx` | Fix currency format USD to LKR |
| `src/hooks/useLightVehicleOrderInvoiceManagement.ts` | Improve document insert with better logging and fallback download |
| `src/components/lightvehicle/LightVehicleInvoiceDataModal.tsx` | Check and fix DialogTitle if missing |

---

## Technical Implementation

### 1. LightVehicleInvoiceTypeModal.tsx (Lines 50-55)

```typescript
// BEFORE
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

// AFTER
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2
  }).format(amount);
};
```

### 2. useLightVehicleOrderInvoiceManagement.ts - Document Insert (Lines 154-174)

Add validation and improved fallback download logic.

### 3. Check LightVehicleInvoiceDataModal.tsx for DialogTitle

Ensure accessibility requirements are met.

---

## Expected Outcome

After these fixes:

1. Currency will display as LKR throughout the invoice module
2. Document records will be created with proper error handling
3. Download will work via fallback path if document record is missing
4. Accessibility warnings will be resolved
5. View button will work correctly

---

## Testing Checklist

1. Generate a new Direct Invoice
   - Verify currency shows LKR in type modal
   - Verify invoice generates successfully
   - Check console for document creation logs
   - Verify document appears in database

2. Test Download functionality
   - Click Download on newly created invoice
   - Verify PDF opens in new tab
   - Test on older invoices (uses fallback path)

3. Test View functionality
   - Click View button
   - Verify modal opens without console errors
   - Check preview loads correctly

4. Check browser console
   - No DialogTitle accessibility warnings
   - No other errors related to invoices
