
## Goal
Fix “spaces missing / words stick together” in Special Hire downloaded PDFs on macOS (Chrome/Safari), even though the PDF is image-based. The downloaded PDF must match the on-screen preview’s word spacing.

## What’s causing it (most likely)
In `src/lib/pdf-multi-page.ts`, `sectionBasedPDF()` currently uses `html2canvas` with `letterRendering: true`. On macOS this frequently causes html2canvas to render text with incorrect spacing (spaces collapse or get extremely thin), and because we embed that canvas as an image, the defect is preserved in the PDF.

## Implementation plan (minimal, targeted, keeps preview unchanged)

### 1) Make html2canvas render text normally (primary fix)
**File:** `src/lib/pdf-multi-page.ts`

- Change `html2canvasOpts`:
  - Remove `letterRendering: true` (or explicitly set `letterRendering: false`)
  - Explicitly set:
    - `foreignObjectRendering: false`
    - `removeContainer: true`
    - `scrollX: 0`, `scrollY: 0`
- Rationale: this matches patterns already used elsewhere in the repo (invoice/lightvehicle/yutong generators) and is the most common fix for collapsed/missing spaces.

### 2) Ensure fonts + images are fully ready before capture (stability fix)
**File:** `src/lib/pdf-multi-page.ts`

Add two small helpers and use them before each capture:
- `await document.fonts.ready` (guarded: only if `document.fonts?.ready` exists)
- Wait for images inside each `[data-pdf-page]`:
  - For each `img`, do `await img.decode()` when available, otherwise wait for `load/error` (with a short timeout fallback)
- Rationale: prevents html2canvas measuring text before fonts finalize (another common cause of subtle spacing/kerning issues).

### 3) Switch image encoding to PNG for sharper text edges (quality fix)
**File:** `src/lib/pdf-multi-page.ts`

- Change `canvas.toDataURL('image/jpeg', 0.95)` → `canvas.toDataURL('image/png')`
- Change `pdf.addImage(..., 'JPEG', ...)` → `pdf.addImage(..., 'PNG', ...)`
- Rationale: JPEG subsampling can blur thin gaps/space edges, making “words stick” more noticeable. PNG is lossless.

### 4) Add an `onclone` CSS normalization (last-mile fix for macOS)
**File:** `src/lib/pdf-multi-page.ts`

Add `onclone` in html2canvas options to apply a small style patch to the cloned document (only affects capture, not the visible preview), e.g.:
- Force consistent spacing behavior:
  - `letter-spacing: normal !important;`
  - `word-spacing: normal !important;`
  - `text-rendering: geometricPrecision;` (optional)
  - `-webkit-font-smoothing: antialiased;` (optional)
- Scope it to the cloned container (the passed `container` / `[data-pdf-page]` subtree) to avoid unintended side effects.

### 5) Keep the “1 page element = 1 PDF page” behavior
No change to how pages are split: still capture each `[data-pdf-page]` as one canvas and insert into a corresponding PDF page. The fix is strictly about capture fidelity.

## Acceptance checks
1) On macOS (Chrome and Safari), open a Special Hire quotation → Download PDF:
   - Verify word spacing is correct across:
     - Header/meta block
     - Tables
     - Paragraph blocks (Extra Charges / Terms & Conditions)
2) Verify no regression:
   - No blank pages introduced
   - Layout matches preview (same wrapping/line breaks as before)
3) Quick spot-check another module that uses `sectionBasedPDF` (`DocumentPreviewModal` / `QuotationsList`) to ensure PDF generation still works.

## Files touched
- `src/lib/pdf-multi-page.ts` (all changes concentrated here)

## Risk / rollback
- If disabling `letterRendering` reintroduces any prior “character overlap” issues in other documents, we’ll add an optional `options` parameter to `sectionBasedPDF(container, { letterRendering?: boolean })` and only disable it for Special Hire flows. (We’ll only do this if we observe a regression.)
