

# Fix: `bank_account_id` Column Missing from Payment Tables

## Problem
The error `"Could not find the 'bank_account_id' column of 'yutong_customer_payments' in the schema cache"` occurs because the recent code changes insert `bank_account_id` into payment records, but this column was never added to the database.

Same issue affects `sinotruck_customer_payments` and `lightvehicle_customer_payments`.

## Fix

### 1. Database Migration
Add `bank_account_id UUID` column to all three payment tables with a foreign key to `bank_accounts`:
- `yutong_customer_payments`
- `sinotruck_customer_payments`  
- `lightvehicle_customer_payments`

Also add `payment_slip_url TEXT` to `sinotruck_customer_payments` (it already has `receipt_url` but the code references `payment_slip_url`).

### 2. Code Fix for Sinotruck
The `sinotruck_customer_payments` table uses `amount` instead of `payment_amount` and `reference_number` instead of `payment_reference`. Verify the Sinotruck and Light Vehicle payment tracking components insert using the correct column names.

## Files
- New Supabase migration (add columns)
- Possibly minor column-name fixes in `SinotruckPaymentTracking.tsx` if mismatched

