
# Fix: Add Customer Category Dropdown to Customer Master Form

## Problem
The "Add New Customer" dialog in the Customer Master view (`CustomerMasterView.tsx`) uses its own **inline form** -- it does NOT use the `CustomerForm` component where the category dropdown was added. So the category field is missing from the actual form users see.

## Solution
Add the Customer Category dropdown to the existing inline form in `CustomerMasterView.tsx`.

## Changes (1 file)

### `src/components/accounting/CustomerMasterView.tsx`

1. **Import** `useActiveCustomerCategories` from `useCustomerCategories` hook and `Select` components from UI library

2. **Add category hook**: Call `useActiveCustomerCategories()` to fetch available categories

3. **Add to `formData` state**: Add `customer_category_id: ""` to the initial state object (line 66-75)

4. **Add to `Customer` interface**: Add `customer_category_id: string | null` field

5. **Add dropdown field**: Insert a Customer Category `Select` dropdown between the Address field and the Cancel/Create buttons (around line 345), showing category code + name for each option, with a "No Category" default

6. **Update `handleSubmit`**: Include `customer_category_id: formData.customer_category_id || null` in the insert/update payload

7. **Update `resetForm`**: Reset `customer_category_id` to `""`

8. **Update edit handler**: Populate `customer_category_id` when editing an existing customer

9. **Update query select**: Fetch `customer_category_id` in the customers query

10. **Show category in table** (optional): Add a Category column to the customer list table so users can see which category each customer belongs to
