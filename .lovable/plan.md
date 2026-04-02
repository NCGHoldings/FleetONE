
## Fix: Special Hire document previews are blocked

### What is happening
The Sales Receipt, Invoice, and other Special Hire documents are generated correctly, but the preview modal cannot display them because the app blocks the PDF iframe.

Your screenshot matches this exact issue:
- document modal opens
- PDF toolbar appears
- main document area says: "This content is blocked"

### Root cause
The Special Hire viewer renders PDFs like this:

```text
DocumentViewer
  -> converts base64/storage PDF to blob URL
  -> passes blob URL into EnhancedPDFViewer
  -> EnhancedPDFViewer shows it inside <iframe src={pdfUrl}>
```

But `index.html` currently has this CSP:

```text
frame-src 'self' https://www.google.com https://maps.google.com;
```

That policy does not allow:
- `blob:`
- `data:`

So Chrome blocks the Special Hire PDF preview iframe.

## Files involved
- `index.html`
- `src/components/special-hire/DocumentViewer.tsx`
- `src/components/special-hire/EnhancedPDFViewer.tsx`

## Implementation plan

### 1. Fix CSP so PDF blob previews are allowed
Update `index.html` Content Security Policy to allow Special Hire document previews rendered from blob URLs.

Change `frame-src` to include:
- `'self'`
- `blob:`
- optionally `data:` for compatibility if any future PDF/image viewer uses data URLs
- keep Google Maps sources already used in the app

Target result:

```text
frame-src 'self' blob: data: https://www.google.com https://maps.google.com;
```

### 2. Keep the current Special Hire document flow unchanged
Do not change the document generation logic unless needed:
- `document_storage` remains the source
- `storage_path` fallback remains
- `DocumentViewer` still decodes PDF safely
- `EnhancedPDFViewer` can continue using the iframe-based viewer

This keeps the fix low-risk and avoids damaging quotation / receipt / invoice generation.

### 3. Add a small safety improvement in the viewer
In `EnhancedPDFViewer.tsx`, add a lightweight fallback state so if iframe loading fails again in future, the user sees a clearer message and can still download the file.

Example behavior:
- if preview cannot load, show:
  - “Preview blocked or failed to load”
  - “Download PDF” button
- no change to normal successful flow

### 4. Cross-check all Special Hire document entry points
After the CSP fix, verify the same viewer works from all current Special Hire entry paths:
- Confirmed Trips table
- Finance Approval modal
- any modal opening `DocumentViewer`

Because all of them use the same `DocumentViewer`, one fix should restore:
- Sales Receipt preview
- Invoice preview
- other stored Special Hire PDFs

## Expected result
After this fix:
- Special Hire Sales Receipt preview opens normally
- Special Hire Invoice preview opens normally
- PDF area no longer shows “This content is blocked”
- Download still works
- No changes to document content, logo, bank details, or approval flow

## Technical details
The issue is not with:
- missing document data
- bad PDF generation
- bank details
- quotation save logic

It is a browser security policy issue:

```text
Current:
iframe src="blob:..."

Blocked by:
Content-Security-Policy frame-src missing blob:

Fix:
Allow blob: in frame-src
```
