

# Fix: Yutong Quotation PDF Signature Rendering and Multi-Page Preview

## Problems Identified

### 1. Signatures Not Rendering in Downloaded PDF
The `generatePDFBase64` function in `YutongQuotationViewModal.tsx` only pre-loads images matching `img[src*="lovable-uploads"]` as base64 for html2canvas. Signature images (which use data URLs from canvas drawings or Supabase storage URLs) are **not included** in this pre-loading step. This causes html2canvas to either skip or fail to render signature images in the PDF.

### 2. Both Pages Must Always Show Signatures
Both Page 1 and Page 2 have identical signature blocks that fetch from the same `signatures` state. The signatures load correctly on screen preview but fail in PDF due to the image pre-loading issue above.

## Fix Details

### File: `src/components/yutong/YutongQuotationViewModal.tsx`

**Change 1: Pre-load ALL images, not just lovable-uploads (lines 119-148)**

Replace the selector `img[src*="lovable-uploads"]` with `img` to capture all images including signature images. Also add handling for signature data URLs that may need special treatment with html2canvas.

```typescript
// Before: Only lovable-uploads images
const allImages = printRef.current.querySelectorAll('img[src*="lovable-uploads"]');

// After: ALL images including signatures
const allImages = printRef.current.querySelectorAll('img');
```

Also skip base64 data URLs from the fetch-and-convert step (they are already base64), and only convert external/relative URLs:

```typescript
allImages.forEach(img => {
  const imgEl = img as HTMLImageElement;
  // Skip data URLs - already base64
  if (!imgEl.src.startsWith('data:')) {
    uniqueUrls.add(imgEl.src);
  }
});
```

**Change 2: Improve html2canvas options for signature rendering (line 174-186)**

Add `allowTaint: true` option and ensure data URL images are handled. Also set a fixed height matching A4 proportions (1123px at 96dpi) instead of using `page.scrollHeight`:

```typescript
const canvas = await html2canvas(page, {
  scale: 2.5,          // Higher quality (matching memory standard)
  useCORS: true,
  allowTaint: true,    // Allow tainted canvas for data URLs
  backgroundColor: '#ffffff',
  width: 794,
  height: 1123,        // Fixed A4 height at 96dpi
  scrollX: 0,
  scrollY: 0,
  foreignObjectRendering: false,
  removeContainer: true,
  logging: false
});
```

**Change 3: Use JPEG output for smaller file size (line 193)**

```typescript
const imgData = canvas.toDataURL('image/jpeg', 0.95);
```

### File: `src/components/yutong/YutongQuotationPreview.tsx`

**Change 4: Ensure signature images have crossOrigin attribute (lines 817-819, 993-995)**

Add `crossOrigin="anonymous"` to signature `<img>` tags on both pages so html2canvas can access them:

```typescript
<img
  src={sig.signature_data}
  alt={`${sig.signer_name} signature`}
  style={{ maxHeight: "60px", maxWidth: "100%" }}
  crossOrigin="anonymous"
/>
```

This change applies to both Page 1 (line ~817) and Page 2 (line ~994) signature blocks.

## Also Fixing: Edge Function Build Errors

Multiple edge functions have `'error' is of type 'unknown'` TypeScript errors. These will be fixed by adding proper type assertions (`(error as Error).message`) across all affected files:

- `aggregate-fleet-analytics/index.ts`
- `analyze-trips/index.ts`
- `auto-sync-attendance/index.ts`
- `calculate-commissions/index.ts`
- `check-fuel-alerts/index.ts`
- `create-temporary-account/index.ts`
- `discover-bus-api/index.ts`
- `execute-workflow-rules/index.ts`
- `fetch-driver-events/index.ts`
- `fetch-fios-mileage/index.ts`
- `fetch-fios-tracking/index.ts` (also fix `bus` possibly undefined and missing `gsm`/`hdop` properties)
- `get-maps-api-key/index.ts`

## Expected Result

- Signatures (drawn, typed, or uploaded) render correctly in the downloaded PDF on both pages
- Both pages display properly in the preview and in the generated PDF
- PDF quality matches the A4 professional standard
- All edge function build errors resolved

