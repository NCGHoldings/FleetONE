

# Add Customer Category to Vehicle Sales Quotation Forms

## Summary
Currently, the Yutong, Sinotruck, and Light Vehicle quotation forms only have a "Customer Type" field (Personal/Company). The `customer_categories` table (with entries like "Internal", "External Customer") exists and is used in the Accounting module's Customer master, but is not connected to quotation forms. This means when quotations flow into AR invoices, the system cannot resolve the correct GL accounts via the 3-tier hierarchy (customer category -> global GL settings).

## What needs to happen

### 1. Database: Add `customer_category_id` column to all 3 quotation tables
Create a Supabase migration adding a nullable `customer_category_id` column (FK to `customer_categories.id`) to:
- `yutong_quotations`
- `sinotruck_quotations`
- `lightvehicle_quotations`

### 2. Update Yutong Quotation Forms (2 files)
**Files:** `src/components/yutong/YutongQuotationFormUpdated.tsx` and `src/components/yutong/YutongQuotationForm.tsx`

- Add `customer_category_id` to the Zod schema (optional string)
- Import and use `useActiveCustomerCategories()` hook to load categories
- Add a "Customer Category" dropdown (Select) in the Customer Information section, below the Customer Type field
- Include `customer_category_id` in the data sent to Supabase on submit
- When an existing customer is selected, auto-populate their category if they have one

### 3. Update Sinotruck Quotation Form
**File:** `src/components/sinotruck/SinotruckQuotationForm.tsx`

- Add `customer_category_id` to form state
- Import and use `useActiveCustomerCategories()` hook
- Add "Customer Category" dropdown in the customer section
- Include in the insert payload

### 4. Update Light Vehicle Quotation Form
**File:** `src/components/lightvehicle/LightVehicleQuotationForm.tsx`

- Add `customer_category_id` to Zod schema
- Import and use `useActiveCustomerCategories()` hook
- Add "Customer Category" dropdown
- Include in the insert payload

### 5. Auto-populate category when selecting existing customer
In all 3 forms, when a user selects an existing customer from the dropdown, fetch that customer's `customer_category_id` and auto-set the category dropdown. User can still override it.

## Flow after this change
```text
Quotation (with category) → Order → AR Invoice
                                      ↓
                              resolveCustomerARAccounts()
                                      ↓
                              Uses category GL mapping
                              (Internal → AR Internal acct)
                              (External → AR External acct)
```

## Files touched
- Supabase migration (new) — add `customer_category_id` to 3 tables
- `src/components/yutong/YutongQuotationFormUpdated.tsx`
- `src/components/yutong/YutongQuotationForm.tsx`
- `src/components/sinotruck/SinotruckQuotationForm.tsx`
- `src/components/lightvehicle/LightVehicleQuotationForm.tsx`

