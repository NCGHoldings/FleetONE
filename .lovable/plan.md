

# Fix: Yutong Payment Form — Bank Account Dropdown Empty

## Root Cause

The "Record Customer Payment" form in `YutongPaymentTracking.tsx` queries `bank_accounts` filtered by `company_id = NCG_HOLDING_ID` (`a0000000-0000-0000-0000-000000000001`). But **zero bank accounts exist** under this LIVE company ID. All bank accounts were created under the TEST environment (`f40b0a9d...`) or other sub-companies.

This is not a network issue — it's a data issue. The LIVE NCG Holding company simply has no bank accounts registered.

## Fix

### 1. SQL Migration — Create LIVE bank accounts for NCG Holding

Insert the essential bank accounts under the LIVE NCG Holding company ID (`a0000000-0000-0000-0000-000000000001`), mirroring what exists in the test environment. At minimum:

- Commercial Bank C/A
- Sampath Bank C/A  
- Any other accounts the Yutong division uses

These should reference the corresponding COA entries (13001xxx accounts) already in the LIVE chart of accounts.

### 2. Code Fix — Fallback logic in `YutongPaymentTracking.tsx`

Update `loadBankAccounts()` to also check sub-company bank accounts if none found under `NCG_HOLDING_ID`. The Yutong sub-company ID is `a0000000-0000-0000-0000-000000000003`, so the query should use `.in('company_id', [NCG_HOLDING_ID, yutongCompanyId])` to find accounts from either the parent or the Yutong section.

### 3. Same fix for Sinotruck + Light Vehicle payment forms

Check and apply the same pattern to:
- `src/components/sinotruck/SinotrukPaymentTracking.tsx`
- `src/components/lightvehicle/LightVehiclePaymentTracking.tsx`

## Files to modify
- SQL migration — Insert LIVE bank accounts
- `src/components/yutong/YutongPaymentTracking.tsx` — Broaden bank account query
- `src/components/sinotruck/SinotrukPaymentTracking.tsx` — Same fix
- `src/components/lightvehicle/LightVehiclePaymentTracking.tsx` — Same fix

## Result
- Bank Account dropdown shows available accounts immediately
- Works for both LIVE and TEST environments
- All three vehicle sales modules get the fix

