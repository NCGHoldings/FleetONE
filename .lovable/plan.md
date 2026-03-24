

# Add Cheque Book Management to Cheque Register + Fix Cheque Auto-Issue Flow

## Problem
The Cheque Register page (Banking > Cheque Register tab) has no way to create or manage cheque books — that feature is hidden in a separate "Cheque Books" sub-tab inside BankingView. Users need to register cheque books directly from the Cheque Register and have AP payments auto-assign the next cheque number when "cheque" is selected as payment method.

## Current State
- **ChequeBookManagement** component exists but is only in BankingView's sub-tab — not visible from the Cheque Register
- **APPaymentForm** already has `useNextChequeNumber` wired, but the auto-fetch only triggers when `cheque_number` is empty AND the form is open — it may not re-trigger on bank account change
- The Cheque Register (`ChequeRegisterView`) has no link to cheque book management

## Changes

### 1. Add Cheque Book Management section to ChequeRegisterView
**File:** `src/components/accounting/ChequeRegisterView.tsx`

- Import and render `ChequeBookManagement` component below the cheque table
- Add a "Cheque Books" tab alongside the existing type filters (All Types / Outgoing / Incoming) OR render it as a collapsible section at the bottom
- This gives users direct access to register new cheque books and see active books from the same page

### 2. Fix cheque number auto-issue on AP Payment
**File:** `src/components/accounting/APPaymentForm.tsx`

- Fix the `useEffect` for cheque auto-fetch: remove the `!currentCheque` guard so switching bank accounts re-fetches a new cheque number
- Add a "Cheque Book" indicator showing the active book's remaining count and prefix
- When no active cheque book exists for the selected bank, show a warning with a link/button to register one

### 3. Add cheque register entry creation on AP payment submit
**File:** `src/components/accounting/APPaymentForm.tsx` (submit handler)

- When `payment_method === "cheque"`, after payment creation, auto-insert a `cheque_register` entry with status `draft`, linking the cheque number, amount, payee (vendor name), and bank account
- This ensures every cheque payment automatically appears in the Cheque Register without manual entry

## Files touched
- `src/components/accounting/ChequeRegisterView.tsx` — Add ChequeBookManagement section
- `src/components/accounting/APPaymentForm.tsx` — Fix auto-fetch logic + auto-create cheque register entry

