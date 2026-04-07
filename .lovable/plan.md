

# Enhance Public Complaint Form: Type Toggle, Multi-Category, Route/Bus Validation

## Changes

### 1. Add Type selector (Complaint / Good Feedback)
- Add a "Type" toggle at the top of the public form (radio buttons or select) with options: **Complaint** and **Good Feedback**
- When "Good Feedback" is selected: change the header icon/color to green, update title to "Submit Feedback", change button text, and store `type: 'good_feedback'` in the database
- When "Complaint" is selected: keep current red/warning styling and store `type: 'complaint'`
- Update the RLS INSERT policy to also allow `type = 'good_feedback'` (current policy only permits `type = 'complaint'`)

### 2. Allow multiple category selection
- Replace the single `Select` dropdown for Category with a **multi-select checkbox list** (or badge-toggle approach)
- Categories: Service Quality, Driver Behavior, Vehicle Condition, Scheduling Issues, Safety Concerns, Billing Issues, Customer Service, Other
- Store as comma-separated string in the `category` column (e.g., `"driver,safety"`)
- Update validation schema to accept an array of at least 1 category, then join before insert

### 3. Make Route Number OR Bus Number mandatory (at least one)
- Add a Zod `.refine()` to require at least one of `routeNumber` or `busNumber` to be filled
- Add a helper text below the fields: "Please provide at least a Route Number or Bus Number"
- Mark both labels with conditional asterisk styling

### 4. Update validation schema (`src/lib/validation.ts`)
- Add `type` field: `z.enum(['complaint', 'good_feedback'])`
- Change `category` from single string to `z.array(z.string()).min(1, 'At least one category is required')`
- Add `.refine()` for route/bus: at least one must be non-empty

### 5. Update success screen
- When type is "Good Feedback", show a different success message ("Thank you for your positive feedback!")

## Files
- **Modify**: `src/components/complaints/PublicComplaintForm.tsx` — add type toggle, multi-category, route/bus validation UI
- **Modify**: `src/lib/validation.ts` — update schema with type, multi-category array, route/bus refine
- **New migration**: Update public INSERT RLS policy to allow `type = 'good_feedback'`

