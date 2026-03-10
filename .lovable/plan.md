

# Fix Invoice Flashing & Infinite Network Requests

## Root Cause

The `DocumentViewer` component creates a **new blob URL on every render** inside the render function (lines 386-396). Each new blob URL changes the iframe `src`, which triggers re-rendering, which creates another blob URL — causing an infinite loop of GET requests until the browser hits `ERR_INSUFFICIENT_RESOURCES`.

Additionally, blob URLs are never revoked via `URL.revokeObjectURL()`, causing memory leaks.

## Fix

### `src/components/special-hire/DocumentViewer.tsx`
- Move blob URL creation from the render body into a `useMemo` + `useEffect` cleanup pattern
- Memoize the PDF URL so it only recalculates when `document.document_data` or `currentDocument.document_data` actually changes
- Add `URL.revokeObjectURL()` cleanup to prevent memory leaks

### `src/components/special-hire/EnhancedPDFViewer.tsx`
- Stabilize the `onDownloadReady` effect — currently depends on `onDownloadReady` which is a new function reference each render, potentially causing extra effect runs
- Memoize the `pdfUrl` prop check to avoid unnecessary iframe reloads

## Changes Summary

| File | Change |
|---|---|
| `DocumentViewer.tsx` | Use `useMemo` for blob URL creation + `useEffect` cleanup for `revokeObjectURL`. Remove inline IIFE from render. |
| `EnhancedPDFViewer.tsx` | Memoize the pdfUrl to prevent iframe re-mount on every render |

