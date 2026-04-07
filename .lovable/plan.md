

# Fix Build Errors and Add Antigravity External Links to Fleet Documents

## Problem

The Antigravity bus document integration code is fully synced (manifest, modal, images), but the Lovable preview cannot render it because **TypeScript build errors in other files from the same merge prevent compilation**. Additionally, you want both bus-level folder links and per-document source links to Antigravity.

## Step 1: Fix build errors blocking the preview

These files from the external merge have type mismatches that must be fixed before anything renders:

1. **`src/components/accounting/settings/DocumentTemplateManager.tsx`** (line 52-55)
   - Calls `useDocumentTemplates(companyId, typeId)` with 2 args, but hook only accepts 1
   - Destructures `{ data: templates, isLoading, refetch }` but hook returns `{ templates, loading, refetch }`
   - Fix: Change to `useDocumentTemplates(selectedTypeId === "all" ? undefined : selectedTypeId)` and destructure as `{ templates, loading: isLoading, refetch }`

2. **`src/components/accounting/shared/FinanceDocumentPreviewModal.tsx`** (line 88)
   - Same destructuring mismatch: `{ data: allTemplates }` → `{ templates: allTemplates }`

3. **`src/components/accounting/inventory/LandedCostVoucherForm.tsx`** — Supabase deep type instantiation errors
   - Cast queries with `as any` to bypass strict typing

4. **`src/hooks/useLeaveRequests.ts`** — `leave_requests` table not in generated types
   - Cast `.from('leave_requests')` with `as any`

5. **`src/components/special-hire/LoadSavedRouteDialog.tsx`** — `saved_routes` table not in types
   - Cast `.from('saved_routes')` with `as any`

## Step 2: Add Antigravity external links

Once the build works, enhance the document modal with external links:

1. **`src/data/bus_folder_links.json`** (new file)
   - A mapping of bus numbers to their Antigravity cloud folder URLs
   - Format: `{ "JC 2449": "https://antigravity.cloud/ncg/buses/JC2449", ... }`
   - Initially empty/placeholder — you or Antigravity can populate it later

2. **`src/components/fleet/BusDocumentPreviewModal.tsx`**
   - Add a "View on Antigravity" button in the modal header (bus-level folder link)
   - Add a small external link icon next to each document in the sidebar (per-document link)
   - If no Antigravity link exists for a bus, hide the button gracefully

3. **`src/pages/FleetManagement.tsx`**
   - No changes needed — the existing "📎 X Docs" badge and modal integration are already correct

## Files to modify
- `src/components/accounting/settings/DocumentTemplateManager.tsx` — fix hook usage
- `src/components/accounting/shared/FinanceDocumentPreviewModal.tsx` — fix hook usage
- `src/components/accounting/inventory/LandedCostVoucherForm.tsx` — type casts
- `src/hooks/useLeaveRequests.ts` — type casts
- `src/components/special-hire/LoadSavedRouteDialog.tsx` — type casts
- `src/data/bus_folder_links.json` — new Antigravity URL mapping
- `src/components/fleet/BusDocumentPreviewModal.tsx` — add Antigravity links UI

## Result
- The preview will compile and render successfully
- Fleet Management table shows "📎 X Docs" badges for buses with documents
- Clicking a badge opens the document modal with sidebar + preview
- Modal header shows "View on Antigravity" folder link
- Each document in the sidebar has an external source link icon

