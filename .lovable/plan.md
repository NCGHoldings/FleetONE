

# Fix CI/CD Pipeline Failure - Missing Test Scripts

## Problem Identified

Your GitHub CI/CD pipeline is failing at the **"Validate Code"** step because the required test scripts are not defined in `package.json`.

The workflow file (`.github/workflows/ci.yml`) attempts to run:
- `npm run test -- --run --reporter=verbose` (for Unit Tests)
- `npm run test:e2e -- --project=chromium` (for E2E Tests)

But these scripts do not exist in your `package.json`.

---

## Solution

Add the missing scripts to `package.json`:

| Script | Command | Purpose |
|--------|---------|---------|
| `test` | `vitest` | Run Vitest unit tests |
| `test:e2e` | `playwright test` | Run Playwright E2E tests |
| `type-check` | `tsc --noEmit` | TypeScript validation (optional but useful) |

---

## Implementation

### Update `package.json` scripts section

**Current:**
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "build:dev": "vite build --mode development",
  "lint": "eslint .",
  "preview": "vite preview"
}
```

**Updated:**
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "build:dev": "vite build --mode development",
  "lint": "eslint .",
  "preview": "vite preview",
  "test": "vitest",
  "test:e2e": "playwright test",
  "type-check": "tsc --noEmit"
}
```

---

## What Will Happen After This Fix

1. **CI Pipeline Flow:**
   - Validate Code → TypeScript check, ESLint, Build
   - Unit Tests → `npm run test` using Vitest
   - E2E Tests → `npm run test:e2e` using Playwright

2. All three checks should pass (assuming no code errors)

3. Once all checks pass, the commit can be merged to `main`

---

## Files to Modify

| File | Change |
|------|--------|
| `package.json` | Add `test`, `test:e2e`, and `type-check` scripts |

