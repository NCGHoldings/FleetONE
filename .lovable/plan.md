

# Fix: Auto-Match Fails for Katunayaka — Wrong Admission Prefixes

## Problem
All 92 transactions show as "Unmatched" (0 auto-matched) because the system can't extract admission numbers like `LKA000187` from bank statement descriptions.

**Root cause**: When the Katunayaka branch was auto-created, default prefixes `['N', 'LNU']` were used. But Katunayaka students use prefix `LKA` (31 students) and `Sta` (4 students). The regex in `extractAdmissionNumbers()` only looks for configured prefixes, so `LKA000187` in the description is never recognized.

## Solution — Two changes

### 1. Auto-detect prefixes from actual student data when creating default settings
**File**: `src/components/school/BankStatementUploadZone.tsx`

When auto-creating settings for a new branch (the fallback block), query the branch's students to detect the actual admission number prefixes in use, instead of hardcoding `['N', 'LNU']`.

```
// Before inserting default settings:
// Query distinct prefixes from school_students for this branch
// Extract the alphabetic prefix from each admission_no (e.g., LKA from LKA000187)
// Use those as admission_prefixes, falling back to ['N', 'LNU'] if none found
```

### 2. Same fix in branch creation
**File**: `src/pages/SchoolBusService.tsx`

Same logic — when a new branch is created and default settings are inserted, detect prefixes from imported students (or use a broader default like `['N', 'LNU', 'LKA', 'TKA', 'TN', 'R0']` that covers all known branch patterns).

### 3. Immediate data fix — update Katunayaka settings
**File**: `src/components/school/BankStatementUploadZone.tsx`

Add `LKA` detection: before processing, check if any students have prefixes not in the current settings, and auto-add them. This fixes the problem for the existing Katunayaka branch without manual intervention.

Alternatively, in the `handleProcess` function, after fetching students and before matching, dynamically detect all unique prefixes from the student list and merge them with the configured prefixes:

```typescript
// After fetching students, detect actual prefixes
const detectedPrefixes = new Set<string>();
students?.forEach((s: any) => {
  const match = s.admission_no?.match(/^([A-Za-z]+)/);
  if (match) detectedPrefixes.add(match[1].toUpperCase());
});
// Merge with configured prefixes
const allPrefixes = [...new Set([...prefixes, ...detectedPrefixes])];
```

Then use `allPrefixes` instead of `prefixes` in the `extractAdmissionNumbers()` call.

## Files
- **Modify**: `src/components/school/BankStatementUploadZone.tsx` — auto-detect student prefixes and merge with settings before matching
- **Modify**: `src/pages/SchoolBusService.tsx` — use broader default prefixes on branch creation

## Result
- Katunayaka's `LKA000187` descriptions will be matched to student `LKA000187` automatically
- Any future branch with different prefixes will also work without manual settings configuration
- Existing branches with correct settings are unaffected (their prefixes are just augmented)
- User can still customize prefixes in Settings page if needed

