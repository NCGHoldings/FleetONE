

# Fix Yutong Full Flow: GL Posting, Payment Form, and Data Repair

## Root Causes Found

### 1. `source_module` column missing from `journal_entries`
The database has NO `source_module` column (confirmed via schema query). The code inserts `source_module: 'yutong_sales'` on every GL posting, causing 400 errors. This is why ALL payment verifications fail and no journal entries exist for YUT business unit.

### 2. Payment form missing Bank Account selector and Photo Upload
The Record Payment modal in `YutongPaymentTracking.tsx` has no bank account dropdown (the `bank_accounts` table exists and the column `payment_slip_url` exists on `yutong_customer_payments` but is never used). The Sinotruck and Light Vehicle forms have `bank_name` fields but no proper bank account selector either.

### 3. `resolveCustomerARAccounts` references wrong column
The fallback query uses `customer_advance_liability_account_id` which does not exist in `gl_settings`. This causes the resolution to silently fail.

### 4. Order trigger counts wrong status
The `update_yutong_order_financials()` trigger only sums payments with `status = 'received'`, but the app sets status to `'pending'` then `'verified'`. So `total_paid` and `balance_due` never update on the order.

### 5. Customer category not copied to orders
Data shows all orders have `customer_category_id = NULL` even when quotations have categories set. The code fix was applied but existing orders weren't backfilled.

## Changes

### 1. Migration: Add `source_module` to `journal_entries` + fix trigger
- `ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS source_module TEXT`
- Update `update_yutong_order_financials()` trigger to also count `status = 'verified'`

### 2. Fix `resolveCustomerARAccounts` fallback column name
**File:** `src/hooks/useCustomerCategories.ts`
- Query `gl_settings` for correct column names (check what actually exists)

### 3. Enhance Record Payment modal with Bank Account + Photo Upload
**File:** `src/components/yutong/YutongPaymentTracking.tsx`
- Add bank account dropdown (fetch from `bank_accounts` table where `company_id = NCG_HOLDING_ID`)
- Add optional payment proof file upload to `payment-proofs` storage bucket
- Save `bank_name` and `payment_slip_url` on the payment record
- Apply same enhancements to Sinotruck and Light Vehicle payment forms

### 4. Data repair script
- Backfill `customer_category_id` on `yutong_orders` from linked quotations
- Backfill `customer_category_id` on finance `customers` records from their linked orders/quotations

### 5. Update Supabase types
- Add `source_module` to `journal_entries` type definitions

## Files Touched
- New Supabase migration (add `source_module`, fix trigger)
- `src/hooks/useCustomerCategories.ts` -- fix gl_settings column name
- `src/components/yutong/YutongPaymentTracking.tsx` -- add bank account + photo upload
- `src/components/sinotruck/SinotruckPaymentTracking.tsx` -- add bank account selector
- `src/components/lightvehicle/LightVehiclePaymentTracking.tsx` -- add bank account selector
- `src/integrations/supabase/types.ts` -- add source_module

