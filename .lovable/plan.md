

# Fix: Signature Page Toggle Not Persisting

## Root Cause

The `special_hire_signature_settings` table has **no row** for `signature_page` — only `approved_by`, `checked_by`, `prepared_by` exist. When the page loads and can't find a `signature_page` row, it defaults to `true` (line 52-53).

The save function on line 107-116 tries to insert/update, but doesn't check for errors on that specific operation — so if the insert fails (e.g., due to a column constraint), it fails silently and the row never gets created.

## Plan

### 1. Auto-create the `signature_page` row on first load
In `loadSettings()`, when no `signature_page` row is found (line 51-54), immediately insert it into the database instead of just setting local state. This guarantees the row exists for future toggles.

### 2. Add error handling on the signature_page save
In `handleSave()`, add proper error checking on the insert/update for the `signature_page` row (lines 107-116) so failures are reported to the user.

### 3. Make the toggle save immediately (no need for Save button)
Change the `Switch` for "Show Signature Page" to save directly to the database on toggle — similar to how most master toggles work. This eliminates the "toggle then forget to save" problem.

## Files
- **Modify**: `src/components/settings/SpecialHireSignatureSettings.tsx`
  - Auto-insert `signature_page` row on first load if missing
  - Make the toggle save immediately via `onCheckedChange`
  - Add error handling on the DB operations

## Result
Toggling "Show Signature Page" off will persist immediately — no need to scroll down and click Save. Refreshing the page will show the correct state.

