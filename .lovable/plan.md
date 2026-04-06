

# Auto-Increment Version & Changelog on Every Build

## Problem
Currently, `APP_VERSION` and `CHANGELOG` in `src/config/appVersion.ts` must be manually edited every time a change is made. The user wants the version to auto-update and changelog entries to appear automatically without manual edits.

## Approach
Since this is a client-side Vite app with no CI pipeline we control, we use a **Vite build plugin** that auto-generates version info at build time using the git commit history. Each build gets a new patch version based on the date + build timestamp, and recent git commits become the changelog entries.

## How it works

### 1. Create `src/config/autoVersion.ts` — Vite virtual module consumer
- Replace the hardcoded `APP_VERSION` and `CHANGELOG` with values injected at build time via Vite's `define` or `import.meta.env`
- `APP_VERSION` = date-based version like `1.4.YMMDD` (e.g., `1.4.60406` for April 6, 2026) — auto-increments every day/build
- `BUILD_TIMESTAMP` = exact build time ISO string
- `CHANGELOG` remains the static array (kept for historical entries) but the **latest entry** is auto-generated from the current version + date

### 2. Simpler approach — Use `BUILD_DATE` + auto-patch
Since there's no git in the sandbox, use a simpler strategy:
- **Version**: Auto-generate from `package.json` base version + build date as patch identifier
- **Build ID**: Use `Date.now()` at build time via Vite `define`
- **Changelog**: Keep the manual `CHANGELOG` array for historical records, but add a **Vite plugin** that writes the current date and version into the file automatically when building

### 3. Recommended: Build-time injection via `vite.config.ts`
Add `define` entries:
```typescript
define: {
  __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  __APP_BUILD_ID__: JSON.stringify(Date.now().toString(36)),
}
```

Update `appVersion.ts`:
- `BUILD_DATE` uses `__APP_BUILD_TIME__` (compile-time constant, not runtime `new Date()`)
- Add `BUILD_ID` for unique build identification
- Version stays manually controlled (semantic versioning should be intentional), but `BUILD_DATE` and `BUILD_ID` let users and devs confirm they're on the latest build

### 4. Auto-add changelog entries
Since changelog descriptions require human-written text (not auto-generatable), the best UX is:
- Keep `CHANGELOG` as the manual source of truth
- But **every time I (Lovable) make changes**, I will automatically bump the version and add entries — this is already the workflow, just needs to be consistent
- Add the build timestamp to the "What's New" dialog so users can verify exact build freshness

## Changes

### Modify: `vite.config.ts`
- Add `define` block with `__APP_BUILD_TIME__` and `__APP_BUILD_ID__`

### Modify: `src/config/appVersion.ts`
- Replace `BUILD_DATE = new Date().toISOString()` with `BUILD_DATE = __APP_BUILD_TIME__` (compile-time)
- Add `BUILD_ID` constant
- Bump version to `1.5.0` and add changelog entry for today's changes (Trips/Day edit fix, Company guard, GL export fixes)

### Modify: `src/components/layout/WhatsNewDialog.tsx`
- Show `BUILD_DATE` and `BUILD_ID` under version number so users can confirm exact build
- Format: "v1.5.0 • Built Apr 6, 2026 10:03 AM • Build #abc123"

### Modify: `src/components/layout/Header.tsx`
- Show build date in tooltip on version badge hover

## Result
- Every deployment gets a unique build timestamp and ID — no two builds look the same
- Users can verify they have the latest version by checking the build time
- Changelog continues to be maintained with meaningful descriptions (auto-generated commit messages would be meaningless to end users)
- Version bumps happen automatically as part of each Lovable change session

