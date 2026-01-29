
# Fix Yutong Quotation PDF Download - Missing Header Image

## Problem Identified

When downloading the Yutong quotation PDF, the header image (with "QUOTATION" title, NCG Holdings logo, and Yutong logo) is visible in the preview but **missing in the downloaded PDF**.

**Root Cause:** The `html2canvas` library fails to capture images loaded from relative paths like `/lovable-uploads/...`. While the preview works (browser loads images normally), during PDF generation, `html2canvas` cannot reliably fetch these images even with `useCORS: true`.

## Existing Working Solution

The `yutong-order-invoice-generator.ts` already has a working solution using a `loadImageAsBase64()` function that:
1. Pre-loads images via `fetch()`
2. Converts to base64 data URL
3. Replaces image URLs in HTML with base64 data before running `html2canvas`

## Solution

Apply the same image preloading technique to the quotation PDF generation.

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/yutong/YutongQuotationViewModal.tsx` | Add image preloading before `html2canvas` capture |
| `src/components/lightvehicle/LightVehicleQuotationViewModal.tsx` | Apply same fix for consistency |

### Technical Implementation

**1. Add helper function to preload images as base64:**

```typescript
async function loadImageAsBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) return '';
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading image:', url, error);
    return '';
  }
}
```

**2. Modify `generatePDFBase64()` to preload images before capture:**

```typescript
const generatePDFBase64 = async (): Promise<string> => {
  if (!printRef.current) throw new Error('Print reference not found');

  // Pre-load header image as base64
  const headerImageUrl = '/lovable-uploads/3a890245-ca01-4bcf-b6a0-346e06befe92.png';
  const headerBase64 = await loadImageAsBase64(headerImageUrl);

  // Find all header images in the preview and replace src with base64
  const headerImages = printRef.current.querySelectorAll('img[src*="lovable-uploads"]');
  const originalSrcs: Map<HTMLImageElement, string> = new Map();
  
  headerImages.forEach((img) => {
    const imgEl = img as HTMLImageElement;
    originalSrcs.set(imgEl, imgEl.src);
    if (headerBase64) {
      imgEl.src = headerBase64;
    }
  });

  // Wait a moment for images to be applied
  await new Promise(resolve => setTimeout(resolve, 100));

  try {
    // ... existing html2canvas logic
  } finally {
    // Restore original image sources
    originalSrcs.forEach((originalSrc, imgEl) => {
      imgEl.src = originalSrc;
    });
  }
};
```

## Expected Result

After the fix:
- Header image with "QUOTATION", NCG Holdings logo, and Yutong logo will appear in downloaded PDF
- Preview will continue to work as before
- Same fix applied to Light Vehicle quotations for consistency
