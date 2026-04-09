

# Fix AR Receipt Form — Scroll Issue, GL Code Override & Category Display

## Problems

1. **Dropdown can't scroll**: The `CommandList` inside the `Popover` has `max-h-[300px]` but the `PopoverContent` may be clipped by the dialog's `overflow-y-auto`. The popover needs higher z-index and portal behavior to escape the dialog's overflow container.

2. **No GL code override option**: Users want to manually select a GL account that overrides the auto-resolved one. Currently there's no field for this. The system should allow a manual GL account selector with priority: **Manual override > Category mapping > Global settings**.

3. **Category not showing for all entries**: The customer/vendor queries need to properly join category tables to show category names in the grouped dropdown.

## Plan

### 1. Fix Dropdown Scroll — Escape Dialog Overflow

**File: `src/components/accounting/ARReceiptForm.tsx`**

- Add `portal` container or use `PopoverContent` with `sideOffset` and explicit `style={{ pointerEvents: 'auto' }}` to ensure the popover renders above the dialog
- Increase `CommandList` max height to `max-h-[400px]`  
- Add `onOpenAutoFocus` to prevent dialog from stealing focus from the command input

### 2. Add Manual GL Account Override Selector

**File: `src/components/accounting/ARReceiptForm.tsx`**

- Add a new optional field below the Customer/Vendor selector: "GL Account Override" using the existing `SearchableAccountSelector` component
- New state: `overrideGLAccountId`
- When set, the GL badge shows the override account instead of the auto-resolved one
- When cleared, falls back to the category/global resolution

**File: `src/hooks/useAccountingMutations.ts`**

- Accept an optional `override_gl_account_id` in the receipt mutation
- Priority logic in `useCreateARReceipt`:
  ```
  GL account = override_gl_account_id || resolvedFromCategory || globalSetting
  ```

### 3. Add DB Column for GL Override

**New SQL migration**

- Add `override_gl_account_id UUID REFERENCES chart_of_accounts(id)` to `ar_receipts` table
- This persists the user's manual GL choice for audit trail

### 4. Ensure Category Names Display Correctly

**File: `src/hooks/useAccountingData.ts`**

- Verify the `useCustomers` and `useVendors` queries join `customer_categories` and `vendor_categories` correctly (already added in previous work — just confirm it works)

## Files to Change

- `src/components/accounting/ARReceiptForm.tsx` — fix popover scroll/z-index, add GL override selector, update GL badge priority
- `src/hooks/useAccountingMutations.ts` — accept `override_gl_account_id` in receipt creation, use it as top priority in GL resolution
- New SQL migration — add `override_gl_account_id` column to `ar_receipts`

## Result

- Dropdown scrolls properly within the dialog
- Users can optionally pick a specific GL account that overrides category/global defaults
- GL badge shows the effective account (override > category > global)
- Categories display correctly as group headers in the dropdown

