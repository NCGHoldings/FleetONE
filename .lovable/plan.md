
# Fix Light Vehicle Payment Tracking and Invoice Generation

## Problems Identified

### 1. Payment Tracking Not Loading - Database Column Name Mismatch

**Error**: `column lightvehicle_quotations_1.quotation_no does not exist`

**Root Cause**: In `LightVehiclePaymentTracking.tsx` line 73, the query uses:
```typescript
.select('*, lightvehicle_quotations(quotation_no, customer_name, customer_phone)')
```

But the actual database column is `quotation_number`, not `quotation_no`.

### 2. Invoice Generator Not Getting Correct Data

The `LightVehicleOrderInvoiceGenerator` receives order data that expects fields like:
- `order_no`, `quotation_no`, `vehicle_make`, `vehicle_model`

But the payment tracking component must first load successfully to populate the order details.

### 3. Invoice Template Needs Yutong-Style Professional Header/Footer

Current Light Vehicle invoice uses a basic template. It needs:
- Professional NCG header image (like Yutong uses)
- Blue color scheme matching corporate branding
- Payment tracking with bank details
- Multi-page support with signatures

---

## Solution

### Fix 1: Update LightVehiclePaymentTracking Query

Change the database query from `quotation_no` to `quotation_number`:

```typescript
// Line 73 - BEFORE:
.select('*, lightvehicle_quotations(quotation_no, customer_name, customer_phone)')

// AFTER:
.select('*, lightvehicle_quotations!quotation_id(quotation_number, customer_name, customer_phone)')
```

### Fix 2: Update Receipt Generation to Use Correct Field Names

In the `handleGenerateReceipt` function, update the reference to use `quotation_number`:

```typescript
// Line 124 - BEFORE:
quotationNo: orderDetails.lightvehicle_quotations?.quotation_no

// AFTER:
quotationNo: orderDetails.lightvehicle_quotations?.quotation_number
```

### Fix 3: Update Invoice Generator HTML Template

Enhance `lightvehicle-order-invoice-generator.ts` to match Yutong's professional format:
- Add NCG Holdings header section with company branding
- Professional blue color scheme
- 2-page layout with bank details and terms
- Payment history section
- Signature boxes matching Yutong format
- Sri Lankan Rupees (LKR) currency formatting

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/lightvehicle/LightVehiclePaymentTracking.tsx` | Fix query column name `quotation_no` -> `quotation_number` |
| `src/lib/lightvehicle-order-invoice-generator.ts` | Enhance to Yutong-style professional format |

---

## Technical Details

### LightVehiclePaymentTracking.tsx Fixes

**Line 73**: Fix the Supabase join query:
```typescript
const { data: order, error: orderError } = await supabase
  .from('lightvehicle_orders')
  .select('*, lightvehicle_quotations!quotation_id(quotation_number, customer_name, customer_phone)')
  .eq('id', orderId)
  .single();
```

**Line 124**: Fix receipt quotation number reference:
```typescript
quotationNo: orderDetails.lightvehicle_quotations?.quotation_number
```

### Invoice Generator Enhancements

Update the HTML generator to include:

1. **Professional Header**:
   - NCG Holdings company logo/name
   - Company address and contact details
   - Invoice/Proforma badge

2. **Billing Section**:
   - Customer details box
   - Finance company box (for proforma)

3. **Vehicle Details Grid**:
   - Make, Model, Year, Color
   - Engine/Chassis numbers
   - Technical specs

4. **Pricing Table**:
   - Product description
   - Unit price, Quantity, Total
   - Proforma percentage handling

5. **Bank Details Section** (Page 2):
   - NCG Holdings bank account info
   - Commercial Bank Nugegoda details

6. **Payment Tracking**:
   - Payment history table
   - Total paid, Balance due

7. **Signatures Section**:
   - Prepared By
   - Approved By  
   - Received By

8. **Footer**:
   - Professional company contact info
   - Terms and conditions

9. **Currency Format**:
   - Change from USD to LKR (Sri Lankan Rupees)

---

## Expected Outcome

After implementation:

1. **Payment Tracking Works**: Financial tab loads with correct order and payment data
2. **Record Payment Works**: Users can record new payments
3. **Verify Payment Works**: GL posting triggers correctly
4. **Generate Invoice Works**: Direct and Proforma invoices generate with professional layout
5. **Invoice View Works**: Preview shows Yutong-matching format
6. **Receipt Generation Works**: Cash receipts generate from verified payments

---

## Testing Checklist

1. **Payment Tracking**
   - Open any order's Financial tab
   - Verify payment summary cards show correct totals (not LKR 0)
   - Verify "Record Payment" button works
   - Verify payment history displays

2. **Invoice Generation**
   - Click "Generate Invoice"
   - Select Direct Invoice or Proforma
   - Verify invoice generates with professional format
   - Verify NCG header displays
   - Verify customer and vehicle details correct
   - Verify bank details show on page 2
   - Download and check PDF quality

3. **Receipt Generation**
   - Verify a payment
   - Click "Generate Receipt"
   - Verify receipt modal opens
   - Add signatures
   - Download receipt PDF
