

# Fix: Logo Missing + Old Template Appearing in Document Previews

## Root Causes

### 1. Logo not rendering
The `{{ncg_master_logo}}` placeholder falls back to `/ncg-holdings-logo.png` — a relative path. Inside an iframe using `srcDoc`, this path needs to resolve against the app origin. The issue is intermittent because:
- If `companyData.logo_url` is set (Supabase storage URL), it works when network is good but fails on slow connections
- If `companyData.logo_url` is empty, the fallback `/ncg-holdings-logo.png` may not resolve inside `srcDoc` iframes consistently

**Fix**: Convert the fallback to an absolute URL using `window.location.origin + '/ncg-holdings-logo.png'` so it always resolves correctly inside iframes.

**File: `src/lib/document-template-utils.ts`** (line 162)
- Change: `companyData?.logo_url || '/ncg-holdings-logo.png'`
- To: `companyData?.logo_url || \`\${window.location.origin}/ncg-holdings-logo.png\``
- Apply the same fix to all other fallback references to `/ncg-holdings-logo.png` in this file

### 2. Old template appearing / template flickering
**File: `src/components/accounting/shared/FinanceDocumentPreviewModal.tsx`** (lines 244-263)

There is a "TEMPORARY FIX" `useEffect` that **overwrites the AP Payment Voucher template in the database every time the modal opens**. This:
- Creates a race condition: template renders with old DB content, then gets overwritten async
- Silently destroys any customized templates
- Can show stale content if the update hasn't completed before render

**Fix**: Remove this entire `useEffect` block. Template updates should only happen via "Replace All Templates" in Settings — not on every modal open.

## Files to modify
- `src/lib/document-template-utils.ts` — Use absolute URL for logo fallback
- `src/components/accounting/shared/FinanceDocumentPreviewModal.tsx` — Remove the auto-overwrite useEffect

## Result
- Logo always renders regardless of network timing
- Templates stay consistent — no more random overwrites on modal open
- "Replace All Templates" in Settings remains the proper way to update templates

