

# Fix: Company Dropdown Guard & Data Protection

## Problem
1. The CompanySwitcher sometimes shows "No companies available" even though companies exist — this happens when the auth session or user access queries haven't resolved yet, but `isLoading` for companies is already `false`
2. When no company is selected (or dropdown fails to load), the accounting pages still render with zero/empty data — misleading users into thinking data is missing
3. No retry or refresh mechanism exists for users when the dropdown fails

## Root Cause
In `CompanyContext.tsx`, the company list query (`companies-hierarchy`) can finish loading before `session` and `userCompanyAccess` queries resolve. When that happens:
- `isLoading = false` (companies loaded fine)
- But `companies` array is empty because `isManagementRole = false` (roles haven't loaded yet) and `hasExplicitAccess = false` (access hasn't loaded yet)
- The CompanySwitcher sees empty companies and shows "No companies available"

## Fix

### 1. Fix `CompanyContext.tsx` — Include all loading states
- Combine `isLoading` from companies query WITH session/access/roles loading states
- Only report `isLoading = false` when ALL three queries have resolved
- This prevents the "No companies available" flash

### 2. Fix `CompanySwitcher.tsx` — Add retry button
- When companies array is empty after loading, show a "Retry" button instead of just a disabled message
- The retry button invalidates the `companies-hierarchy`, `auth-session-company`, `user-company-access-current`, and `user-roles-company` queries
- Add auto-retry: if companies are empty after load, automatically retry once after 2 seconds

### 3. Create `CompanyRequiredGuard.tsx` — Protect data pages
- A wrapper component that checks if `selectedCompanyId` exists and company data is loaded
- If not loaded: show a loading spinner with "Loading company data..."
- If loaded but no company selected: show a card with message "Please select a company to view data" and the CompanySwitcher
- Wrap the accounting page content with this guard so users never see misleading zero data

### 4. Update `src/pages/Accounting.tsx`
- Wrap the main content area (below the header) with `CompanyRequiredGuard`
- Keep the header/CompanySwitcher visible outside the guard so users can still interact

## Files
- **Modify**: `src/contexts/CompanyContext.tsx` — combine loading states from session + access + roles + companies
- **Modify**: `src/components/accounting/CompanySwitcher.tsx` — add retry button, auto-retry logic
- **Create**: `src/components/accounting/CompanyRequiredGuard.tsx` — guard component for data pages
- **Modify**: `src/pages/Accounting.tsx` — wrap content with CompanyRequiredGuard

## Result
- Company dropdown never falsely shows "No companies available" while auth is still loading
- Users see a clear loading state until everything is ready
- If something fails, users can retry without refreshing the page
- Data pages are protected from showing misleading zero/empty values when no company is selected

