

# Add Bank Details to Vendor Master Create/Edit Form

## Problem
The Vendor Master view (`VendorMasterView.tsx`) uses its own inline form for creating/editing vendors. This form does NOT include the bank account fields that were added to the separate `VendorForm.tsx` component. So when users create or edit vendors from the main Vendors tab, they cannot add bank payment details.

## Solution
Add the multi-bank-account section directly into the `VendorMasterView.tsx` dialog form, matching the same functionality already in `VendorForm.tsx`. This ensures bank details are captured at vendor creation time and flow through to AP payments and payment voucher documents.

## Changes

### File: `src/components/accounting/VendorMasterView.tsx`

1. **Import hooks**: Add imports for `useVendorBankAccounts` and `useSaveVendorBankAccounts` from `useVendorBankAccounts.ts`, plus `Star` and `Trash2` icons (Trash2 already imported).

2. **Add bank account state**: Add a `bankAccounts` state array (same `BankAccountRow` shape as VendorForm) and helper functions (`addBankAccount`, `removeBankAccount`, `updateBankAccount`).

3. **Load existing bank accounts on edit**: When `handleEdit` is called, fetch the vendor's bank accounts using `useVendorBankAccounts` and populate the state.

4. **Add bank account UI section**: Insert a "Banking Details" section between the Address field and the Cancel/Create buttons, with:
   - "Add Account" button
   - Dynamic rows with: Account Label, Bank Name, Branch, Account Number, Account Holder, Default toggle, Remove button
   - Same layout as `VendorForm.tsx` lines 376-471

5. **Save bank accounts on submit**: After successful vendor create/update, call `saveBankAccounts.mutateAsync()` with the vendor ID and bank account rows (same logic as VendorForm lines 170-175).

6. **Reset bank accounts**: Clear `bankAccounts` state in `resetForm()`.

7. **Enlarge dialog**: Change `max-w-lg` to `max-w-2xl` and add `max-h-[85vh] overflow-y-auto` to accommodate the bank details section.

### No other files need changes
The AP Payment form already reads from `vendor_bank_accounts` and shows the "Pay To Account" selector. The payment voucher template already maps vendor bank placeholders. This change just ensures bank details can be entered at vendor creation time through the primary vendor form.

