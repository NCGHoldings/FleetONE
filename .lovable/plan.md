

# Enhance AR Receipt Form — Add Vendor Selection, Category Grouping & GL Code Link

## Problem

1. **Customer-only dropdown**: The AR Receipt form only shows customers. Vendors should also be selectable (e.g., for inter-company receipts, vendor refunds, employee advances).
2. **No category grouping**: The dropdown is a flat list. Both customers and vendors have categories (External Customer, Internal, Inter Company, Employee, Supplier Local, etc.) that should be shown as grouped headers.
3. **No GL code visibility**: When recording a receipt, users can't see which GL account will be hit. The system resolves GL accounts behind the scenes but doesn't show this to the user.

## Plan

### 1. Combine Customers + Vendors in Dropdown with Category Groups

**File: `src/components/accounting/ARReceiptForm.tsx`**

- Import `useVendors` alongside `useCustomers`
- Add a `partyType` state: `'customer' | 'vendor'` to track which type was selected
- Replace the basic `<Select>` dropdown with a searchable `Command`-based combobox (like the existing `SearchableAccountSelector` pattern)
- Group entries by category:
  ```
  ── Customers ──
    External Customer
      Ms.Kanthi Perera
      Mr.Anjula
    Internal Customer
      Mr.Hasith
  ── Vendors ──
    Employee
      A E H Kumara
      K M Darshana
    Supplier Local
      Chairman Sri Lanka...
    Inter Company
      NCG Express...
  ```
- Each item stores both the entity ID and type (customer/vendor)
- Update `customer_id` field in form schema to `party_id` conceptually but keep DB column as `customer_id` (since the `ar_receipts` table uses `customer_id`)

### 2. Show Resolved GL Account on the Form

**File: `src/components/accounting/ARReceiptForm.tsx`**

- After a customer/vendor is selected, call `resolveCustomerARAccounts` (or equivalent for vendors) to get the AR account
- Display a small info badge below the dropdown: "GL: 11201001 - Trade Receivable" (or "Advance Account: 11201002")
- When in Advance mode, show the advance GL account instead
- This gives users visibility into which GL code the receipt will hit

### 3. Update GL Posting Logic for Vendor Selection

**File: `src/hooks/useAccountingMutations.ts`**

- The `useCreateARReceipt` mutation currently resolves GL via `resolveCustomerARAccounts`
- Add fallback: if the selected party is a vendor, use `resolveVendorAPAccounts` instead to get the appropriate GL account
- This ensures correct GL posting regardless of whether a customer or vendor is selected

### 4. Invoice Allocation — Show Vendor Invoices Too

When a vendor is selected and advance mode is OFF, fetch AP invoices with outstanding balances (from `ap_invoices` table) instead of AR invoices, allowing allocation against vendor credit notes or refund invoices.

## Files to Change

- `src/components/accounting/ARReceiptForm.tsx` — replace customer Select with grouped searchable combobox showing both customers and vendors by category, add GL code display badge
- `src/hooks/useAccountingMutations.ts` — handle vendor party type in GL resolution

## Result

- Dropdown shows both customers and vendors, grouped by their categories
- Users can see which GL account will be hit before recording
- Correct GL posting for both customer and vendor receipts

