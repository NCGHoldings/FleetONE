

# Add Bus Existence Indicator to OCR Bus Number Field

## Problem
When a bus number is entered (via OCR or manually edited), there's no visual feedback telling the user whether that bus exists in the system. The user can't tell if the bus number is valid until they try to apply — which may fail silently or save to a wrong/missing bus.

## Fix

### In `src/components/trips/OCRExtractedDataCard.tsx`

The component already fetches `busData` from the `buses` table (line 435-445) using `data.busNumber`. It just doesn't show the result to the user. The fix:

1. **Also fetch on `editedData.busNumber` changes** — currently the useEffect depends on `data.busNumber` (original OCR value), not the edited value. Change the dependency to `editedData.busNumber` so it re-checks when the user types a new bus number.

2. **Add a status indicator next to the bus number** (both in display and edit modes):
   - **Bus found**: Green checkmark badge — "✓ Bus Found" with route name if available
   - **Bus NOT found**: Red warning badge — "✗ Bus Not Found in System"
   - **Loading**: Small spinner while checking

3. **Show the indicator in the header area** (around line 473 for display mode, line 462-470 for edit mode) — a small badge right after the bus number.

### Example UI
```text
🚌 NE-2200  ✓ Bus Found (Badulla)     ← green badge, bus exists
🚌 XX-9999  ✗ Not Found in System      ← red badge, bus doesn't exist
🚌 [____]   ⟳ Checking...              ← while typing
```

4. **Debounce the lookup** — add a 500ms debounce when the user is typing to avoid excessive DB queries.

## Files to Change
- `src/components/trips/OCRExtractedDataCard.tsx` — update busData fetch to use editedData.busNumber, add visual status badge next to bus number in both view and edit modes

## Result
- Users instantly see whether a bus number exists in the system
- Shows the bus route when found, helping confirm it's the right bus
- Works for both OCR-detected and manually corrected bus numbers

