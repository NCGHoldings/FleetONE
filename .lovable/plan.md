

# Add App Version Display & "What's New" Changelog

## What to build
A version numbering system with an in-app "What's New" panel so both you and users can confirm which version they're running and what features are available.

## How it works

### 1. Version constant + build timestamp
Create `src/config/appVersion.ts` with:
- `APP_VERSION = "1.4.0"` (manually bumped when deploying new features)
- `BUILD_DATE` auto-set from build time
- `CHANGELOG` array with recent entries (version, date, title, description, type: feature/fix/improvement)

### 2. "What's New" dialog component
Create `src/components/layout/WhatsNewDialog.tsx`:
- Triggered from a version badge in the Header or a "What's New" menu item
- Shows grouped changelog entries by version with badges (New, Fix, Improved)
- Auto-shows on first visit after version change (stores last-seen version in localStorage)
- Scrollable list of recent changes (last 5-10 versions)

### 3. Version badge in Header
Add to `src/components/layout/Header.tsx`:
- Small version badge (e.g., `v1.4.0`) next to the user menu
- Clicking opens the What's New dialog
- Shows a dot indicator when there are unseen updates

### 4. Populate initial changelog
Pre-populate with recent major features from `ANTIGRAVITY_ncgCHANGELOG.md`:
- Proforma Invoice toggle
- Trial Balance fix
- Landed Cost posting
- Test mode data leak fix
- Workflow column performance improvement

## Files
- **Create**: `src/config/appVersion.ts` — version constant + changelog data
- **Create**: `src/components/layout/WhatsNewDialog.tsx` — changelog dialog UI
- **Modify**: `src/components/layout/Header.tsx` — add version badge + dialog trigger
- **Modify**: `package.json` — update `version` field to match

