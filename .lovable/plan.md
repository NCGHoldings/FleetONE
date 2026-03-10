

# Fix: Allow Non-Price Field Edits Without Recalculation

## Problem
When editing a Special Hire quotation to change non-price fields (customer name, phone, email, special request, etc.), the system opens the full `SpecialHireForm` which recalculates all costs. This causes the quotation price to change unexpectedly — a major complaint from users.

## Solution
Add a third edit option in the `EditTypeSelectionModal`: **"Quick Edit (No Price Change)"**. This opens a lightweight modal with only non-price fields, and does a direct DB update (no recalculation, no new version needed).

### Non-price fields (safe to edit without recalculation):
- Customer Name, Phone, Email, Company Name
- Special Request / Notes
- Pickup/Drop Location text (display only, not recalculated)
- Any other informational fields

### Price-impacting fields (require full form):
- Bus type, number of buses, hire type
- Pickup/Drop date-time
- Parking location, distances
- Discounts, commissions, additional charges

## Changes

### 1. `src/components/special-hire/EditTypeSelectionModal.tsx`
- Add a third card option: **"Quick Edit"** with description "Update customer details, notes, and other non-price fields without recalculating the quotation"
- When selected, call `onConfirm('quick_edit')` instead of the existing two types

### 2. `src/components/special-hire/EditQuotationModal.tsx`
- Update `editConfig` type to include `'quick_edit'`
- When `editConfig.editType === 'quick_edit'`, render a new `QuickEditModal` instead of the full `SpecialHireForm`

### 3. New: `src/components/special-hire/QuickEditModal.tsx`
- A simple Dialog with editable fields: customer name, phone, email, company name, special request
- On save, directly updates the existing `special_hire_quotations` row (no version, no recalculation)
- Shows which fields were changed in a toast

### Files to Edit
| File | Change |
|---|---|
| `src/components/special-hire/EditTypeSelectionModal.tsx` | Add "Quick Edit" option card |
| `src/components/special-hire/EditQuotationModal.tsx` | Handle `quick_edit` type, render `QuickEditModal` |
| `src/components/special-hire/QuickEditModal.tsx` | **New** — lightweight edit form for non-price fields |

