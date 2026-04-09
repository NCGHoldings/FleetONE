
# Fix Bank Statement Auto-Mapping + Branch Isolation

## What is actually wrong

I checked the import flow and there are 3 separate gaps:

1. `BankStatementUploadZone.tsx` only auto-matches from `txn.description`.
   - If the admission number is in `Tran ID`, `Tran Serial`, or `reference`, it is ignored.
   - That is why formats like `NEX-000W14929` are not matching.

2. `extractAdmissionNumbers()` is too narrow.
   - It only handles clean prefix+digits patterns like `N14929`, `LNU14502`, or standalone numbers.
   - It does **not** extract IDs from wrapped values like `NEX-000W14929`.

3. Branch safety is not fully enforced in the database.
   - Frontend queries use `.eq('branch_id', branchId)`, which is good.
   - But current RLS for `school_payment_import_settings`, `school_payment_imports`, `school_payment_import_items`, and `school_payment_pattern_history` is basically `auth.uid() IS NOT NULL`.
   - `school_students` is role-based, not branch-based.
   - So branch isolation is not strong enough server-side.

## Plan

### 1. Make matching use the correct bank statement columns
Update the import flow so matching can use:
- Description
- Reference / Tran ID
- Tran Serial
- Combined text from multiple mapped columns

Implementation approach:
- Add a **“Match From”** option in the column-mapping step.
- Default it to **Combined (Description + Reference)** for best automation.
- Keep Description as the display text, but use the selected match source for extraction and auto-match logic.

This fixes the user problem where the file has admission-like values in `Tran ID` but matching still fails.

### 2. Strengthen admission number normalization
Create a shared normalization helper so these all become matchable:
- `N14929`
- `N 14929`
- `LNU-14502`
- `NEX-000W14929`
- `W14929`

New logic should:
- uppercase
- remove spaces / separators
- extract trailing 4-6 digit runs safely
- compare both full normalized token and numeric-only token
- still stay conservative to avoid false matches

### 3. Add fallback name-based auto-match
Right now if the bank file contains only student names, the import stays unmatched.

Add a second-pass matcher:
- first try admission-number matching
- if no reliable ID found, try exact / normalized student-name matching
- optionally use light fuzzy matching only inside the **current branch’s student list**
- keep low-confidence results in **Needs Review**, not auto-confirm

This will help files where the Description column has names like in your screenshots.

### 4. Use branch-safe matching only
Keep all matching limited to the selected branch and harden it further:
- continue fetching students only for the current `branchId`
- add defensive checks so imported suggestions cannot include students from other branches
- when confirming matches, validate the student still belongs to the same branch before creating payment records

### 5. Fix database-level branch protection
Add a proper branch access model and tighten RLS.

Recommended approach:
- create a branch access table such as `user_school_branch_access`
- add a `can_access_school_branch(_branch_id)` security-definer function
- update RLS for:
  - `school_students`
  - `school_payment_import_settings`
  - `school_payment_imports`
  - `school_payment_import_items`
  - `school_payment_pattern_history`

Rules:
- super admins/admins can access all
- normal users only access explicitly assigned branches
- import items must be visible only through imports belonging to allowed branches

This is the real fix for “cannot get other school branches database”.

### 6. Make automation improve over time
The project already has `school_payment_pattern_history`, but it is not used.

Wire it into the import flow:
- check learned patterns before generic extraction
- when a user manually matches an unmatched payment, save that pattern for the current branch
- reuse it in future imports

That will reduce repeated manual work.

## Files to change

- `src/components/school/BankStatementUploadZone.tsx`
  - add “Match From” mapping
  - use combined / selected text for auto-match
  - keep branch-safe matching

- `src/utils/bank-statement-processor.ts`
  - add stronger admission-token extraction and normalization
  - support wrapped IDs like `NEX-000W14929`
  - expose match-source helpers

- `src/components/school/UnmatchedPaymentsTable.tsx`
  - validate selected student belongs to the same branch
  - save manual-match learning history
  - make student search null-safe

- `src/components/school/PaymentMatchingPreview.tsx`
  - keep branch-safe confirmation checks for suggested matches

- New Supabase migration(s)
  - branch access table/function
  - tighten RLS on school payment import tables and student data

## Technical notes

Current root cause lines:
- `BankStatementUploadZone.tsx` calls `extractAdmissionNumbers(txn.description, ...)` only
- `extractAdmissionNumbers()` does not understand wrapped IDs like `NEX-000W14929`
- RLS for import tables is currently too open (`auth.uid() IS NOT NULL`)

Suggested matching order:
```text
1. Learned branch pattern
2. Admission number from selected match text
3. Normalized token / trailing digit comparison
4. Exact name match inside same branch
5. Low-confidence fuzzy name suggestion inside same branch
```

## Expected result

After this fix:
- admission numbers in `Description`, `Tran ID`, or `Tran Serial` can auto-match
- wrapped references like `NEX-000W14929` can resolve correctly
- name-only bank descriptions can still produce smart suggestions
- auto-matching stays limited to the current branch
- users from one school branch cannot read/import another branch’s data through the database layer
