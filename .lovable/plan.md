

# Add Searchable Account Dropdowns to All Finance Settings

## Problem Identified

The Finance Settings pages (School Bus, Special Hire, Yutong, Sinotruck, Light Vehicles) currently use basic `Select` dropdown components without search functionality. With many GL accounts (50+ accounts), users must scroll through the entire list to find the correct account - this is not user-friendly.

**Screenshot Evidence:** The dropdown showing accounts like "41101001 - CALL BOOKING", "41102001 - SBS - COLLECTION -A" etc. has no search capability.

## Solution

Replace all basic `Select` dropdowns in Finance Settings with the existing `SearchableAccountSelector` pattern that uses:
- Popover + Command (cmdk) for fuzzy search
- Search input that filters by both account code and account name
- High z-index (z-[100]) for proper visibility in modals/dialogs
- Proper background colors and borders

## Components to Update

| File | Current | Update |
|------|---------|--------|
| `src/components/settings/VehicleFinanceSettingsBase.tsx` | Basic `Select` | Use `Command` + `Popover` for searchable dropdown |
| `src/components/school/SchoolBusFinanceSettings.tsx` | Basic `Select` | Use `Command` + `Popover` for searchable dropdown |
| `src/components/special-hire/SpecialHireFinanceSettings.tsx` | Basic `Select` | Use `Command` + `Popover` for searchable dropdown |

## Implementation Approach

### Option A: Create Reusable Component (Recommended)
Create a new `SearchableFinanceAccountSelector` component that can be used across all settings pages. This ensures consistency and reduces code duplication.

### Option B: Update Each File Individually
Modify each file to use the Popover + Command pattern directly.

**I recommend Option A** - creating a reusable component that all settings pages can use.

## Technical Details

### New Component: `src/components/settings/SearchableFinanceAccountSelector.tsx`

```typescript
interface SearchableFinanceAccountSelectorProps {
  value: string | null;
  onValueChange: (value: string | null) => void;
  accounts: Array<{ id: string; account_code: string; account_name: string }>;
  placeholder?: string;
  required?: boolean;
  hasError?: boolean;
}
```

Features:
- Accepts filtered accounts list (pre-filtered by account type)
- Shows search input with "Search by code or name..."
- Returns `null` for "Not Configured" selection
- Shows required field indicator when `required=true`
- Shows error border when `hasError=true`
- High z-index (z-[100]) on popover content

### Files to Modify

1. **Create:** `src/components/settings/SearchableFinanceAccountSelector.tsx`
   - New reusable searchable account selector for finance settings

2. **Update:** `src/components/settings/VehicleFinanceSettingsBase.tsx`
   - Import `SearchableFinanceAccountSelector`
   - Replace `renderAccountSelect` function to use the new component
   - Add search state for account filtering

3. **Update:** `src/components/school/SchoolBusFinanceSettings.tsx`
   - Import `SearchableFinanceAccountSelector`
   - Replace all `Select` components for account selection
   - Maintain existing account type filtering logic

4. **Update:** `src/components/special-hire/SpecialHireFinanceSettings.tsx`
   - Import `SearchableFinanceAccountSelector`
   - Replace all `Select` components for account selection
   - Maintain existing account type filtering logic

## User Experience Improvement

**Before:**
- Scroll through 50+ accounts in dropdown
- No way to filter or search
- Time-consuming to find specific accounts

**After:**
- Type to instantly filter accounts
- Search by account code (e.g., "411") or name (e.g., "revenue")
- Keyboard navigation support
- Clear "Not Configured" option at top

## Testing Checklist

1. Go to **Settings → School Bus Finance**
   - Click any account dropdown
   - Verify search input appears
   - Type account code - verify filtering works
   - Type account name - verify filtering works
   - Select account and verify it saves

2. Go to **Settings → Special Hire Finance**
   - Repeat same tests
   - Verify all dropdowns have search

3. Go to **Settings → Yutong/Sinotruck/Light Vehicle Finance**
   - Repeat same tests
   - Verify required fields still show red asterisk
   - Verify validation still works on save

