

# Fix External System Buttons — URL Update and Back-to-NCG Navigation

## Problem

1. **Wrong Stores One URL**: Currently points to `https://storesone.lgh.lk`, should be `https://storesone.lovable.app`
2. **No way to return to NCG from Document ERP**: The StoresOne POS has a closable "POS Terminal" bar at the top that lets users quickly return. The Document ERP system at `https://docs.lgh.lk` has no equivalent "back to NCG" option. Since these links use `target="_self"`, the user navigates away from NCG entirely.

## Solution

### 1. Fix Stores One URL
Change `https://storesone.lgh.lk` → `https://storesone.lovable.app` in `AppSidebar.tsx`.

### 2. Open external systems in a new tab instead of same tab
Since the external systems are completely separate apps (different Lovable projects), using `target="_self"` replaces NCG entirely and there is no built-in way to add a "back to NCG" button inside those external apps. The practical fix is to open them in a **new tab** (`target="_blank"`) so NCG remains open and accessible. This mirrors how integrated systems typically work — the user can switch between browser tabs instantly.

### File Change: `src/components/layout/AppSidebar.tsx` (lines 360-389)
- Update Stores One `href` to `https://storesone.lovable.app`
- Change both links from `target="_self"` to `target="_blank"` with `rel="noopener noreferrer"`
- Add an `ExternalLink` icon indicator (already imported) when sidebar is expanded, so users know it opens externally

