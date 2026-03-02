
# Fix: Quotation Versioning Loses Bus Model Data

## Problem
When a Yutong quotation is edited (creating a new version like v1.1), critical fields are **not copied** from the original quotation to the new version:
- `bus_model_id` (null in v1.1 -- this is the link to the bus model database)
- `seating_capacity` (null in v1.1)
- `customer_id` (not carried over)

Because `bus_model_id` is null, the Quotation Preview component cannot look up the actual bus model details and falls back to **hardcoded defaults**: capacity "37+1+1", engine "YUCHAI-YC6A270-50 (Euro V)", year "2025". These are wrong for models like the C12 Pro (which is 51+1+1, WEICHAI, 2026).

## Root Cause
In `src/components/yutong/YutongEditQuotationModal.tsx` (line 316-356), the version insert statement copies `bus_model` (text) but **omits** `bus_model_id`, `seating_capacity`, and `customer_id`.

## Fix

### File: `src/components/yutong/YutongEditQuotationModal.tsx`

Add the missing fields to the new-version insert object (around line 326):

```typescript
bus_model: quotation.bus_model,
bus_model_id: quotation.bus_model_id,        // ADD THIS
seating_capacity: quotation.seating_capacity, // ADD THIS
customer_id: quotation.customer_id,           // ADD THIS
```

This is a 3-line addition. No other files need changes -- the preview already correctly reads from `bus_model_id` when it exists; it just wasn't being passed through during versioning.

### Secondary Fix: Remove Hardcoded Fallbacks in Preview

**File: `src/components/yutong/YutongQuotationPreview.tsx`** (lines 78-92)

The fallback values are misleading. Change them to show "N/A" or empty instead of specific wrong model data:

- Change `"37+1+1"` fallback to `quotation.seating_capacity || "N/A"`
- Change `"YUCHAI-YC6A270-50 (Euro V)"` fallback to `"N/A"`
- Change `"2025"` fallback to `"N/A"`

This prevents any future quotation from showing wrong specs if the model link is missing for any reason.

### Files Modified (2)
- `src/components/yutong/YutongEditQuotationModal.tsx` -- Add 3 missing fields to version insert
- `src/components/yutong/YutongQuotationPreview.tsx` -- Replace misleading hardcoded fallbacks with "N/A"
