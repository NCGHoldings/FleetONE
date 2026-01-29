
# Fix Light Vehicle Module - Complete Process Development

## Overview

Multiple issues are preventing the Light Vehicle module from functioning properly. This plan addresses all identified problems to enable the complete quotation-to-order-to-payment workflow.

---

## Problems Identified

### 1. Database Schema Mismatches

The `lightvehicle_customer_payments` table has columns that don't match what the code is trying to use:

| Code Expects | Database Has |
|-------------|--------------|
| `payment_amount` | `amount` |
| `payment_reference` | `reference_number` |
| `bank_name` | Not present |
| `cheque_no` | Not present |
| `status` | `verified` (boolean only) |
| `verification_status` | Not present |

### 2. Missing RLS Policies

Several tables are missing `authenticated` user policies, blocking CRUD operations:

| Table | Status |
|-------|--------|
| `lightvehicle_addons` | service_role only |
| `lightvehicle_customers` | service_role only |
| `lightvehicle_customization_options` | service_role only |
| `lightvehicle_model_images` | service_role only |
| `lightvehicle_referral_commission_payments` | service_role only |
| `lightvehicle_responsible_persons` | service_role only |
| `lightvehicle_shipment_group_orders` | service_role only |
| `lightvehicle_shipment_groups` | service_role only |
| `lightvehicle_vehicle_data_sheets` | service_role only |
| `lightvehicle_vehicle_records` | service_role only |
| `lightvehicle_customer_payments` | Policy targets `public` role incorrectly |

### 3. Payment Tracking Component Issues

The `LightVehiclePaymentTracking.tsx` component tries to:
- Insert columns that don't exist in the database
- Read `payment_amount` when the column is actually `amount`
- Read `verification_status` instead of using `verified` boolean
- Access `status` column which doesn't exist

### 4. Order Details Modal Data Query

The `EnhancedLightVehicleOrderDetailsModal.tsx` queries `lightvehicle_customer_payments` reading non-existent column names.

---

## Solution

### Migration 1: Add Missing Columns to Customer Payments Table

```sql
ALTER TABLE public.lightvehicle_customer_payments
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS cheque_no TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';

-- Update existing records to have proper status based on verified flag
UPDATE public.lightvehicle_customer_payments 
SET status = CASE WHEN verified = true THEN 'verified' ELSE 'pending' END,
    verification_status = CASE WHEN verified = true THEN 'verified' ELSE 'pending' END
WHERE status IS NULL;
```

### Migration 2: Fix RLS Policies

Add `authenticated` user policies for all 10 tables currently missing them plus fix the customer_payments policy.

### Code Fix: Update LightVehiclePaymentTracking.tsx

Fix the column name mappings to use actual database columns:
- Change `payment_amount` to `amount` in insert and read operations
- Change `payment_reference` to `reference_number`
- Add proper status field handling

### Code Fix: Update EnhancedLightVehicleOrderDetailsModal.tsx

Fix payment data reading to use correct column names.

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/XXXX_fix_lightvehicle_customer_payments_schema.sql` | Create | Add missing columns |
| `supabase/migrations/XXXX_fix_remaining_lightvehicle_rls.sql` | Create | Add RLS policies for 10 tables |
| `src/components/lightvehicle/LightVehiclePaymentTracking.tsx` | Modify | Fix column name mappings |
| `src/components/lightvehicle/EnhancedLightVehicleOrderDetailsModal.tsx` | Modify | Fix payment data reading |

---

## Technical Details

### Database Migration 1: Customer Payments Schema

```sql
-- Add missing columns to lightvehicle_customer_payments
ALTER TABLE public.lightvehicle_customer_payments
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS cheque_no TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';

-- Backfill status for existing records
UPDATE public.lightvehicle_customer_payments 
SET status = CASE WHEN verified = true THEN 'verified' ELSE 'pending' END,
    verification_status = CASE WHEN verified = true THEN 'verified' ELSE 'pending' END
WHERE status IS NULL OR verification_status IS NULL;
```

### Database Migration 2: RLS Policies

```sql
-- Fix customer_payments policy (currently targets public, should be authenticated)
DROP POLICY IF EXISTS "Authenticated users can manage lightvehicle_customer_payments" 
  ON public.lightvehicle_customer_payments;
  
CREATE POLICY "Authenticated users can manage lightvehicle_customer_payments" 
  ON public.lightvehicle_customer_payments 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Add policies for other tables...
CREATE POLICY "Authenticated users can manage lightvehicle_addons" 
  ON public.lightvehicle_addons 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage lightvehicle_customers" 
  ON public.lightvehicle_customers 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- (Similar for remaining 8 tables)
```

### Code Fix: LightVehiclePaymentTracking.tsx

Key changes at line ~114-128:
```typescript
// BEFORE (incorrect):
const { error } = await supabase
  .from('lightvehicle_customer_payments')
  .insert({
    payment_amount: amount,        // Wrong column name
    payment_reference: ref,        // Wrong column name
    // ...
  });

// AFTER (correct):
const { error } = await supabase
  .from('lightvehicle_customer_payments')
  .insert({
    amount: amount,                // Correct column name
    reference_number: ref,         // Correct column name
    bank_name: paymentForm.bank_name,
    cheque_no: paymentForm.cheque_no,
    status: 'pending',
    verification_status: 'pending',
    // ...
  });
```

Also fix reading payment data (lines ~330-335):
```typescript
// BEFORE:
.reduce((sum, p) => sum + p.payment_amount, 0);

// AFTER:
.reduce((sum, p) => sum + (p.amount || 0), 0);
```

### Code Fix: EnhancedLightVehicleOrderDetailsModal.tsx

Fix payment display (lines ~400-403):
```typescript
// BEFORE:
<p className="font-medium">{formatCurrency(payment.amount)}</p>

// AFTER (already correct, but ensure verification_status is handled):
<Badge variant={payment.status === 'verified' ? 'default' : 'secondary'}>
  {payment.status || 'pending'}
</Badge>
```

---

## Expected Outcome

After these fixes:

1. **Order Creation**: Works end-to-end from confirmed quotation
2. **View Button**: Shows complete order details with customer and vehicle info from linked quotation
3. **Edit Button**: Allows updating order status, progress, and delivery dates
4. **Payment Recording**: Successfully saves to database with all fields
5. **Payment Verification**: Updates status correctly and triggers GL posting
6. **Payment History**: Displays correct amounts and statuses
7. **Document Generation**: Invoices and receipts work properly

---

## Testing Checklist

After deployment:

1. **Quotation Flow**
   - Create new quotation
   - Update status to "Confirmed"
   
2. **Order Creation**
   - Click "Create Order" 
   - Select confirmed quotation
   - Choose payment mode (Cash/Lease)
   - Verify order appears in list

3. **View Order**
   - Click "View" button
   - Verify all tabs display data (Overview, Financial, Documents, Progress)
   - Verify customer details show from quotation

4. **Edit Order**
   - Click "Edit" button
   - Change status and progress
   - Save and verify changes persist

5. **Payment Recording**
   - Open order details
   - Go to Financial tab
   - Click "Record Payment"
   - Fill form and save
   - Verify payment appears in list

6. **Payment Verification**
   - Click verify on pending payment
   - Verify GL entry is created
   - Verify payment status updates
