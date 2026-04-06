
# Fix: "Process & Match" Still Fails for Katunayaka

## What I found
- **Katunayaka branch exists** in the database.
- It currently has **no `school_payment_import_settings` row**.
- In the **current codebase**, `src/components/school/BankStatementUploadZone.tsx` already uses `.maybeSingle()` and already tries to auto-create default settings.
- The exact toast text shown in your screenshot — **"Please configure import settings first"** — does **not exist anywhere in the current codebase**.

## Do I know what the issue is?
**Yes.**

The actual issue is now **two-part**:

1. **The branch has no settings row yet**, so defaults must be created.
2. **Your browser/preview is still showing an older frontend bundle** that contains the old behavior, because the toast in your screenshot is from old code, not the current source.

## Why it failed
For a brand-new branch, the first import needs a default settings row.  
That part was already fixed in source, but the screen you are seeing is still using the **older version** that stops immediately when settings are missing.

Also, the import flow should be made more robust so that if settings creation fails, it:
- shows the **real database error**
- retries by **re-fetching** the row
- never leaves you with a vague settings error again

## Plan

### 1. Harden the import flow
**File:** `src/components/school/BankStatementUploadZone.tsx`

Update the settings step so it:
- keeps using `.maybeSingle()`
- inserts default settings if missing
- if insert hits a duplicate/unique conflict, **re-fetches the row**
- if insert fails for another reason, shows the **actual error message**
- only continues once a valid settings row is confirmed

### 2. Align the Settings page
**File:** `src/pages/SchoolPaymentSettings.tsx`

Make the Settings page use the same safe pattern:
- replace `.single()` with `.maybeSingle()`
- use the same default-create logic as the import page

This avoids mixed behavior between the two screens.

### 3. Prevent the problem when creating a branch
**File:** `src/pages/SchoolBusService.tsx`

When a new school branch is created, also create its default:
- `school_payment_import_settings`

That way, a new branch is ready immediately and users do not depend on the Payment Import page to create setup data.

## Verification
I would verify the fix with this exact flow:

1. Create a fresh school branch
2. Go directly to **Payment Import**
3. Upload a bank statement
4. Click **Process & Match**
5. Confirm:
   - no settings error
   - settings row exists automatically
   - import continues normally

## Immediate guidance for you
After the fix is implemented, you should:
- do a **hard refresh**
- reopen the preview/import page
- check the **version/build badge** in the header changed
- test Katunayaka again

## Expected result
- New branches can import immediately
- No more old **"configure import settings first"** failure
- If anything still goes wrong, the app will show the **real cause**, not a generic toast

## Files to update
- `src/components/school/BankStatementUploadZone.tsx`
- `src/pages/SchoolPaymentSettings.tsx`
- `src/pages/SchoolBusService.tsx`
