

# Fix Yutong Reports Tab & Complete Public Report Route

## Problem
1. The Yutong Executive Report components were created but the "Reports" tab was never added to the Yutong page (`YutongQuotations.tsx`), so the report is invisible
2. The public report page (`PublicYutongReport.tsx`) and its route in `App.tsx` were never created
3. The Supabase Edge Function for public report access was never built

## Changes

### 1. Add "Reports" Tab to YutongQuotations.tsx
- Add a new `TabsTrigger` with `value="reports"` and the `BarChart3` icon (already imported)
- Add a new `TabsContent` rendering `<YutongExecutiveReport />`
- Import `YutongExecutiveReport` from the report components
- Expand the grid columns from 10 to 11 to fit the new tab

### 2. Create PublicYutongReport.tsx Page
- New page at `src/pages/PublicYutongReport.tsx`
- Accepts `?code=XXXX` query parameter
- Shows a code-entry form if no code or invalid code
- On valid code, fetches report data from the edge function and renders `YutongExecutiveReport` in read-only mode (`isPublic={true}`)

### 3. Create Edge Function: yutong-executive-report
- New edge function at `supabase/functions/yutong-executive-report/index.ts`
- Accepts access code in request body or header
- Validates code against `system_settings` table (key: `yutong_report_access_code`)
- If valid, queries all Yutong tables using service role and returns aggregated analytics JSON
- Returns the same data shape as `useYutongExecutiveReport`

### 4. Add Public Route to App.tsx
- Add route: `/public/yutong-report` pointing to `PublicYutongReport`
- This route is outside the `ProtectedRoute` wrapper so it's accessible without login

### 5. Staff Management Page Access
- The Staff Management page (`staff_management`) is already in the page access system in `src/lib/pages.ts` and the user already has access set to `true`
- No changes needed here -- if the user wants to grant/revoke access for other staff members, they can use the existing Page Access Modal in Staff Management

## Technical Details

**Files to create:**
- `src/pages/PublicYutongReport.tsx`
- `supabase/functions/yutong-executive-report/index.ts`

**Files to modify:**
- `src/pages/YutongQuotations.tsx` -- add Reports tab + TabsContent
- `src/App.tsx` -- add public report route

