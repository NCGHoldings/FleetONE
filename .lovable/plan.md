

# Fix Build Errors: Wrong Property Names in Two Components

## Problem
Two files reference properties that don't exist on their respective types:

**BulkCommissionManagement.tsx** — `ConfirmedQuotation` interface is missing `phone_number` and `email`. These fields aren't fetched from Supabase either.

**ConfirmedTripsTable.tsx** — `QuotationWithPayments` has `customer_phone`/`customer_email` (not `phone_number`/`email`) and `advance_paid`/`balance_due` (not `advance_payment_amount`/`balance_payment_amount`).

## About the "0 vehicles" issue
The "FINANCE - BATCH 6" sheet shows 0 vehicles because 0 records were inserted during import — the file was uploaded and a sheet record was created, but no vehicle rows passed validation. You need to **delete that sheet** and **re-upload** the file with correct column mappings.

## Fix Plan

### File 1: `src/components/special-hire/BulkCommissionManagement.tsx`
- Add `phone_number` and `email` to the `ConfirmedQuotation` interface (lines 35-54)
- Add those fields to the Supabase select query so data is actually fetched

### File 2: `src/components/special-hire/ConfirmedTripsTable.tsx`
- Line 113: Change `trip.advance_payment_amount` → `trip.advance_paid`
- Line 114: Change `trip.balance_payment_amount` → `trip.balance_due`
- Line 121: Change `trip.phone_number` → `trip.customer_phone`
- Line 122: Change `trip.email` → `trip.customer_email`

These are straightforward property name corrections — 6 lines total across 2 files.

