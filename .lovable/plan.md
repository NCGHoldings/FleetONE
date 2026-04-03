

# Speed Up Workflow Column Loading

## Problem
Every row in the Confirmed Trips table renders a `SignatureWorkflowIndicator`, and **each instance** makes its own Supabase query to `special_hire_signature_settings` + `profiles` (lines 40-79). With 105 confirmed trips, that's **105 identical queries** for the exact same signer settings data — settings that are global and rarely change.

## Fix: Lift signer settings fetch to the parent

### 1. Move the signer settings query into `ConfirmedTripsTable.tsx`
- Fetch `special_hire_signature_settings` + `profiles` **once** at the parent level (alongside the existing batch document load)
- Store in state: `signerSettings: Record<string, SignerSetting>`

### 2. Pass signer settings as a prop to `SignatureWorkflowIndicator`
- Add a new prop `signerSettings: Record<string, SignerSetting>` 
- Remove the internal `useEffect` + `loadSignerSettings()` + `settingsLoading` state from the component
- The component becomes purely presentational (no fetching)

### Files to modify
- **`src/components/special-hire/ConfirmedTripsTable.tsx`** — add one-time signer settings fetch, pass as prop
- **`src/components/special-hire/SignatureWorkflowIndicator.tsx`** — accept prop instead of fetching internally, remove loading state

## Result
- **105 queries → 1 query** for signer settings
- Workflow column renders instantly after documents load (no per-row spinner)
- No functional or visual changes to the workflow indicators themselves

