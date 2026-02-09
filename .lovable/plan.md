

# Fix Operations-to-Finance Interconnection Flow

## Problem Summary

The Operations modules (Special Hire, Yutong, Sinotruck, Light Vehicle) are not properly creating AR Invoices, GL Journal Entries, and AR Receipts in the Finance module when payments are approved/verified. The AR module shows "0 invoices" even after payments are approved.

## Root Causes Identified

### 1. Vehicle Sales: Missing `entry_number` in Journal Entry Insert (Critical)
The `postVehiclePaymentToGL()` and `postVehicleInvoiceToGL()` functions in `useVehicleSalesFinance.ts` do NOT provide `entry_number` when inserting into `journal_entries`. This column is `NOT NULL` with no default and no auto-generation trigger, causing every GL posting attempt to silently fail.

**Affected modules:** Yutong, Sinotruck, Light Vehicle

### 2. Vehicle Sales: Invalid `name` Column in Customer Insert
The `createVehicleCustomer()` function tries to insert a `name` field (line 204), but the `customers` table only has `customer_name`. This causes customer creation to fail silently.

**Affected modules:** Yutong, Sinotruck, Light Vehicle

### 3. SPH: Silent Failure in AR/GL Integration
The Special Hire finance approval catches all errors and continues (lines 298-302 in `useFinanceApproval.ts`), meaning the payment gets marked as "approved" even when AR/GL integration completely fails. The `try/catch` swallows the actual error, making debugging impossible.

### 4. No Backfill/Retry for Failed Integration
Approved payments with `ar_invoice_id = null` and `journal_entry_id = null` have no way to be re-processed, leaving orphaned approved records with no financial trail.

## Solution

### File 1: `src/hooks/useVehicleSalesFinance.ts`

**Fix A - Add `entry_number` generation to all GL posting functions:**

- `postVehiclePaymentToGL()` (around line 341): Add auto-generated `entry_number` field
- `postVehicleInvoiceToGL()` (around line 476): Add auto-generated `entry_number` field  
- `applyAdvanceToReceivable()` (around line 563): Add auto-generated `entry_number` field

Pattern to use (matching SPH format):
```typescript
const entryNumber = `${businessUnitCode}-${entryPrefix}-${orderNo}-${Date.now().toString(36).toUpperCase()}`;
```

**Fix B - Remove invalid `name` field from customer insert (line 204):**
```typescript
// Remove this line:
name: customerName, // Some queries use 'name' field
```

### File 2: `src/hooks/useFinanceApproval.ts`

**Fix C - Add detailed error logging so failures are visible:**
- Add `console.error` with full error details before the catch swallows them
- Add a toast with the specific error message so users know what failed
- Ensure the payment status reflects whether AR integration succeeded (add an `ar_integration_status` field or show a warning badge)

### File 3: `src/hooks/useSpecialHireFinance.ts`

**Fix D - Validate the `createOrGetSPHCustomer` function:**
- The SPH customer creation looks correct (uses `customer_name`, not `name`), but verify the RPC function `generate_sph_ar_invoice_number` works properly
- Add more granular error logging to isolate exactly which step fails

### File 4: `src/components/yutong/YutongPaymentTracking.tsx`

**Fix E - Add AR Invoice creation on payment verification:**
Currently Yutong only posts GL on verification (DR Bank / CR Advance). While the architecture says "AR Invoice is created when system invoice is approved", the user wants advance receipts to show in Finance AR immediately. Add:
- Create AR Receipt (advance type) when payment is verified
- Create AR Invoice stub with advance amount recorded

### File 5: `src/components/sinotruck/SinotruckPaymentTracking.tsx`

**Fix F - Same fixes as Yutong** (mirror the payment verification flow)

### File 6: `src/components/lightvehicle/LightVehiclePaymentTracking.tsx`

**Fix G - Same fixes as Yutong** (mirror the payment verification flow)

### File 7: Add Retry/Backfill Utility

**Fix H - Add "Retry AR Integration" for all modules:**
- SPH already has `retryARIntegration` in `useFinanceApproval.ts` - verify it works
- Add similar retry capability for vehicle sales modules
- This processes approved payments where `journal_entry_id` is null

## Data Migration

Run SQL to identify and optionally reprocess orphaned records:
```sql
-- Check orphaned SPH payments (approved but no GL/AR links)
SELECT id, amount, payment_type, status 
FROM special_hire_payments 
WHERE status = 'approved' AND journal_entry_id IS NULL;

-- Check orphaned vehicle payments  
SELECT id, payment_amount, status
FROM yutong_customer_payments
WHERE status = 'verified' AND journal_entry_id IS NULL;
```

## Testing Plan

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | SPH: Approve advance payment | AR Invoice + GL Entry created, visible in Finance AR under Special Hire |
| 2 | SPH: Approve balance payment | AR Invoice updated, AR Receipt created, GL posted |
| 3 | Yutong: Verify payment | GL Entry created (DR Bank / CR Advance), AR Receipt visible |
| 4 | Yutong: Approve system invoice | AR Invoice created with revenue GL |
| 5 | Sinotruck: Verify payment | Same as Yutong |
| 6 | Light Vehicle: Verify payment | Same as Yutong |
| 7 | Switch to SPH in Finance ERP | AR Invoices for SPH customers visible |
| 8 | Retry failed integrations | Orphaned records get GL/AR links |

## Impact Summary

These fixes will ensure that every operational payment action creates the corresponding financial records (Customer, AR Invoice, GL Journal Entry, AR Receipt) and that they appear correctly in the Finance module when filtered by business unit (SPH, YUT, SNT, LTV).

