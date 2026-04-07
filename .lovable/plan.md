

# Fix: Show Delete & Transfer Buttons in LIVE Mode Too

## What's Happening

1. **JE Delete button**: The code is correctly implemented (Trash2 icon in actions column). It should be visible on all journal entries. If you're not seeing it, the latest build may not have deployed yet — try refreshing the page. The red trash icon should appear next to the eye/reverse icons.

2. **Transfer Data & Clear Test Data buttons**: These are **intentionally hidden in LIVE mode** — they only show when you select NCG Test company. The `TestModeBanner` component returns just a green "LIVE MODE" banner with no action buttons when `isTestCompany` is false (line 70-80).

## Plan: Make Transfer Button Available in LIVE Mode

Since you need to transfer data between live and test environments from either side, the Transfer button should be visible in LIVE mode too.

### Changes

**File: `src/components/accounting/TestModeBanner.tsx`**

1. Move the "Transfer Data" button into the LIVE MODE banner (lines 70-80) so it's accessible from both modes
2. Keep "Clear Test Data" restricted to TEST MODE only (safety)
3. The transfer dialog already supports both directions (`live_to_test` and `test_to_live`), so no logic changes needed

### JE Delete Button

The delete button code is already deployed in `JournalEntriesView.tsx` (line 247-255). It renders unconditionally for all journal entries regardless of status. If it's not showing:
- The latest build may need a page refresh
- If still missing after refresh, I'll investigate further

## Files
- **Modify**: `src/components/accounting/TestModeBanner.tsx` — add Transfer Data button to the LIVE MODE banner section

