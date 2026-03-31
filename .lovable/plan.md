

# Global Test Mode Banner in Header

## What Changes

1. **LIVE banner** — stays only in Finance & Accounting section (no change needed)
2. **TEST banner** — moves to the global `Header.tsx` so it shows on every page (Operations, Dashboard, etc.)
3. **Fix runtime error** — add a safe wrapper so the Header doesn't crash if CompanyContext isn't ready

## Implementation

### 1. Header.tsx — Add test mode indicator
- Import `useCompany` (with a try/catch safe hook or direct since CompanyProvider wraps the app)
- Check `isTestCompany` — if true, render an orange "🧪 TEST MODE" strip below the header bar (or inline)
- If not test company, show nothing (LIVE banner stays only in Accounting)

### 2. TestModeBanner.tsx — Remove LIVE banner display, keep only TEST banner with Clear Data button
- Remove the `if (!isTestCompany)` block that renders the green LIVE banner — that stays only in Accounting page
- OR: Keep the LIVE banner in Accounting but the component is only used there anyway

### 3. AppLayout.tsx — Add global test banner
- Import a lightweight `GlobalTestBanner` (or reuse logic) between `<Header />` and `<main>`
- This banner only renders when `isTestCompany` is true
- Shows: "🧪 TEST MODE — You are working in the test environment. Data is isolated from live."

## Files to modify
- `src/components/layout/AppLayout.tsx` — add global test banner between Header and main content
- `src/components/layout/Header.tsx` or new `src/components/layout/GlobalTestBanner.tsx` — small component checking `isTestCompany`
- `src/components/accounting/TestModeBanner.tsx` — keep as-is for Accounting page (LIVE + TEST + Clear Data)

