

# Fix Expense GL Posting Failure + Enhance GL Integrity Guardian

## Root Cause

The error "No GL account mapped for expense category: food" occurs because:
1. No explicit mapping exists in `module_finance_settings` for the "food" (Food/Meals) expense category
2. The fallback logic tries to find a COA account with "food" in the name — none exists
3. The final fallback looks for "general expense" — also not found

The GL Integrity Guardian doesn't detect this because it only checks:
- Whether unposted transactions exist (gap scan)
- Whether core GL settings are configured (AR/AP/Revenue/Bank)
- Whether modules have settings at all

It does **NOT** check whether all expense categories have GL account mappings.

## Plan

### 1. Add Expense Category Mapping Audit Rule to GL Guardian (`src/hooks/useGLIntegrityScanner.ts`)

Add a new audit rule in `runAuditRules()` that:
- Fetches the expense_requests module settings and its `mappings` array
- Compares against the full `EXPENSE_CATEGORIES` list (21 categories)
- Reports which categories are **unmapped** (no explicit GL account)
- Checks if fallback accounts exist in COA (accounts matching category names or "general expense")
- Status: `fail` if >50% unmapped with no fallbacks, `warning` if some unmapped, `pass` if all mapped
- Recommendation: "Go to Settings → Module GL Mappings → Expense Requests to map missing categories"

### 2. Add a "Missing Mappings" Detection in the Gap Scanner (`src/hooks/useGLIntegrityScanner.ts`)

In the expense_requests scan target processing, also check for approved expenses where the category has no mapping. Surface these as a distinct warning in the scan results — not just "unposted" but specifically "unpostable due to missing mapping."

### 3. Improve Expense GL Posting Fallback (`src/hooks/useExpenseRequestFinance.ts`)

Make the posting more resilient:
- If no explicit mapping and no name-match, fall back to `gl_settings.default_expense_account_id` (the core GL default expense account) before throwing
- This ensures posting works as long as core GL settings have a default expense account configured

### 4. Auto-populate Expense Category Mappings in Settings (`src/components/settings/ModuleFinanceSettingsView.tsx`)

When the expense_requests module settings are opened and no mappings exist yet, auto-populate all 21 categories from `EXPENSE_CATEGORIES` as empty mappings so the user can see exactly what needs to be configured — instead of having to manually type each category name.

## Files to Change

| File | Change |
|---|---|
| `src/hooks/useGLIntegrityScanner.ts` | Add audit rule checking expense category GL mappings completeness |
| `src/hooks/useExpenseRequestFinance.ts` | Add fallback to `gl_settings.default_expense_account_id` before throwing error |
| `src/components/settings/ModuleFinanceSettingsView.tsx` | Auto-populate all expense categories when no mappings exist |

