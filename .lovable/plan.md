

# Fix PDF Text Cutting at Page Breaks

## Problem
The smart page-break detection in `sectionBasedPDF` fails when content has colored backgrounds (table headers with `#eff6ff`, blue banners, borders). The `isRowWhite` function requires ALL pixels to have RGB >= 250, so it cannot find a break point inside or between colored tables. When no white row is found, it falls back to `targetY` — cutting straight through text.

## Solution

Update `src/lib/pdf-multi-page.ts` with two changes:

### 1. Replace "white row" detection with "no-text row" detection
Instead of checking if a row is white, check if a row contains **no dark pixels** (no text). Text pixels are typically dark (RGB < 100). A row with only background colors (white, light blue `#eff6ff`, gray borders `#d1d5db`) will have all pixels above ~180. This means the algorithm can safely break on table borders, light backgrounds, and gaps — just not through actual text characters.

```typescript
const isRowSafeToBreak = (imageData: Uint8ClampedArray, width: number): boolean => {
  for (let x = 0; x < width * 4; x += 4) {
    const r = imageData[x], g = imageData[x+1], b = imageData[x+2];
    // If any pixel is "dark" (text), this row is NOT safe to break
    if (r < 180 && g < 180 && b < 180) return false;
  }
  return true;
};
```

### 2. Increase search range
Increase `MAX_SEARCH_PX` from `150 * SCALE` (300px) to `250 * SCALE` (500px) to handle larger tables and dense content sections.

## Files
- `src/lib/pdf-multi-page.ts` — update `isRowWhite` logic and rename to `isRowSafeToBreak`, increase search range

