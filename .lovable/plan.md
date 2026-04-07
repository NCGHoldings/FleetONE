

# Fix Public Complaint Form URL and Security

## Problem
1. The QR generator and shared links use `window.location.origin`, so in preview they produce `https://preview--ncg-fleetone.lovable.app/public/complaint` — the "preview" URL leaks internal app context
2. The published URL should be `https://ncg-fleetone.lovable.app/public/complaint` — clean, no "preview"
3. Need to verify the public form cannot leak any data (SELECT queries, navigation to other pages, etc.)

## Security Audit (Already Confirmed)
- The public form uses `createAnonymousClient()` with `persistSession: false`, no token storage — good
- INSERT policy restricts anon to only `type IN ('complaint', 'good_feedback')`, `status = 'new'`, `reported_by IS NULL` — good, no data can be read back
- The `.insert()` call does NOT use `.select()` — good, no SELECT needed
- The `/public/complaint` route is outside `ProtectedRoute` — correct, it's a standalone page
- No navigation links to internal pages exist on the public form — good
- The anon key is a publishable key (read-only by design) — acceptable

## Plan

### 1. Update QR Generator to use published domain
**Modify `src/components/complaints/ComplaintQRGenerator.tsx`**
- Replace `window.location.origin` with the published domain `https://ncg-fleetone.lovable.app`
- Always generate QR code and URL pointing to `https://ncg-fleetone.lovable.app/public/complaint`
- This ensures printed QR codes and copied links always use the clean published URL, regardless of whether staff generate them from preview or published site

### 2. Add security headers to the public form page
**Modify `src/components/complaints/PublicComplaintForm.tsx`**
- Add `useEffect` to set `document.title` to a generic "NCG Express - Submit Feedback" (no internal info)
- Ensure no console.log statements leak internal data in production

### 3. No migration needed
- RLS policies are already correctly configured
- The anon INSERT policy properly restricts what can be submitted
- No SELECT policy exists for anon — data cannot be read

## Result
- QR codes and shared links will always point to `https://ncg-fleetone.lovable.app/public/complaint`
- The public form remains fully isolated — insert only, no data leakage
- Staff can share the link/QR safely with customers

## Files
- **Modify**: `src/components/complaints/ComplaintQRGenerator.tsx` — hardcode published domain
- **Modify**: `src/components/complaints/PublicComplaintForm.tsx` — set proper page title

