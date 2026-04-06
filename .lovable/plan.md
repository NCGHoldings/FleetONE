

# Fix: "Process & Match" Fails for New Branches — Auto-Create Default Settings

## Problem
When clicking "Process & Match 92 Transactions" on the Katunayaka branch, the system queries `school_payment_import_settings` for this branch. Since it's a new branch with no settings row, `.single()` returns a 406 error, and the toast "Settings Not Found — Please configure import settings first" appears.

## Root Cause
`BankStatementUploadZone.tsx` line 103-107 uses `.single()` to fetch settings but does not auto-create defaults when none exist. The Settings page (`SchoolPaymentSettings.tsx`) already has this auto-create logic, but users shouldn't have to visit Settings before importing.

## Solution

### Modify: `src/components/school/BankStatementUploadZone.tsx`

In `handleProcess`, after the settings query fails or returns null, auto-create default settings (same defaults as `SchoolPaymentSettings.tsx`):

```typescript
// Replace .single() with .maybeSingle()
const { data: settings } = await supabase
  .from('school_payment_import_settings')
  .select('*')
  .eq('branch_id', branchId)
  .maybeSingle();

let activeSettings = settings;

if (!activeSettings) {
  // Auto-create default settings for this branch
  const { data: newSettings, error: createError } = await supabase
    .from('school_payment_import_settings')
    .insert([{
      branch_id: branchId,
      min_confidence_threshold: 80,
      auto_approve_high_confidence: true,
      admission_prefixes: ['N', 'LNU'],
      default_payment_method: 'Bank Transfer',
      auto_split_siblings: true,
      enable_pattern_learning: true,
    }])
    .select()
    .single();

  if (createError || !newSettings) {
    toast({ title: "Settings Error", description: "Could not create default settings", variant: "destructive" });
    setStep("preview");
    setProcessing(false);
    return;
  }
  activeSettings = newSettings;
}
```

Then use `activeSettings` instead of `settings` for the rest of the function.

## Result
- New branches can immediately use "Process & Match" without visiting Settings first
- Default settings are auto-created with sensible values matching existing branches
- No more 406 errors from `.single()` on missing rows

