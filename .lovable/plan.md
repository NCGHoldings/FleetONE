
# Fix Bank Statement Matching, Admission Number Precision, and Import Validation

## Do I know what the issue is?
Yes.

I cross-checked the current code and the recent imported data. The problem is not one single bug; it is a combination of matching logic + duplicated student master data + missing validation.

## What is actually wrong

### 1. The “Match From” option is not really being used
In `BankStatementUploadZone.tsx`, the UI stores `matchFromCol`, but `handleProcess()` still always builds one combined text and ignores the user’s actual choice.

### 2. Admission matching is too loose
In `bank-statement-processor.ts`, token extraction for values like `NEX-000W13235` produces broad tokens such as `NEX000` and `W13235`.

Then `matchStudentsFromTokens()` uses a loose `includes()` rule, so `NEX000` matches almost every `NEX-000Wxxxxx` student.

That is why one import row is currently getting massive false matches instead of one exact student.

### 3. The matcher is using all branch students, including old inactive duplicates
Current import logic fetches all students in the branch, not only active/canonical students.

I checked the branch data:
- Total students: 2,765
- Active: 536
- Inactive: 2,229

There are many repeated admission numbers in the same branch. Example: the same admission no appears 5 times, with only 1 active row and several inactive old rows.

This turns exact matches into “partial match” lists.

### 4. Zero-padded admission numbers are not normalized properly
Example case:
```text
Bank file:    NEX-000W7304
Student DB:   NEX-000W08304
```

These should be treated as the same logical ID when there is one clear active candidate, but current normalization does not handle that safely.

### 5. Validation is too weak before posting
Current import flow does not properly stop bad or risky data:
- invalid dates silently fall back to today
- no strong pre-check for duplicate payment rows in the file
- no strong pre-check for duplicate student master records
- no guard against huge ambiguous match lists
- “Needs Review” still offers bulk confirm behavior, which is dangerous for ambiguous matches

### 6. Earlier branch isolation is incomplete
The recent migration tightened import tables, but `school_students` branch-level DB protection still needs to be completed to fully guarantee cross-branch isolation at the database layer.

---

## Implementation plan

### 1. Build a canonical student list before matching
Update the import flow to match only against a clean branch-safe candidate set:
- current branch only
- active students only
- dedupe by normalized admission number
- if multiple active students share the same admission no, treat that as a data issue, not an auto-match

This will remove old inactive duplicates from matching.

### 2. Tighten admission token extraction and comparison
Refactor the matcher so it ranks matches safely instead of using broad partial contains:
- exact full normalized admission match
- exact normalized suffix match
- zero-padded numeric suffix equivalence
- exact student name fallback
- parent name fallback

Also remove generic tokens like `NEX000` from being treated as standalone match keys.

### 3. Make “Match From” actually control the match source
Use `columnMapping.matchFromCol` during processing:
- Description only
- Reference / Tran ID only
- specific mapped column
- combined mode when chosen

So the system matches from the column the user selected, not from a hardcoded combined source.

### 4. Add a real pre-import validation step
Before saving import items, show a validation summary:
- invalid / missing dates
- zero or suspicious amounts
- duplicate rows inside the uploaded file
- rows with no extractable ID/name
- rows producing too many candidate students
- duplicate admission numbers in branch master data
- probable duplicate payments already recorded

Critical errors should block processing. Warnings should let the user continue with review.

### 5. Fix the review flow so ambiguous rows are not bulk-confirmed
Change the confirmation behavior:
- auto-confirm only rows with exactly 1 canonical student
- for partial matches, let the user choose one ranked student
- remove or disable unsafe “Confirm All” behavior for ambiguous rows
- re-check branch + active student status before inserting payment transactions

### 6. Finish branch-safe data protection
Add the missing DB hardening for `school_students`:
- branch-scoped RLS using the same branch access function
- keep all import reads/writes branch-validated server-side
- ensure review/confirm queries cannot resolve students from another branch

### 7. Use learned patterns during import
The app currently saves manual matches into `school_payment_pattern_history`, but the main importer is not using them.

I will wire that in so recurring descriptions can auto-match correctly in future imports.

---

## Files to change

- `src/utils/bank-statement-processor.ts`
- `src/components/school/BankStatementUploadZone.tsx`
- `src/components/school/PaymentMatchingPreview.tsx`
- `src/components/school/UnmatchedPaymentsTable.tsx`
- new Supabase migration for `school_students` branch RLS and import-safety hardening

---

## Technical notes

### Current proven root causes
- `matchFromCol` is stored but ignored during processing
- loose token/contains matching is causing false positives
- branch student query includes inactive duplicate records
- this branch currently has heavy duplicate admissions
- recent import rows are getting extremely large match lists instead of one student

### Matching rule I will use
```text
1. exact active admission match
2. exact normalized admission match
3. safe zero-padding equivalence
4. exact student name
5. exact parent name
6. otherwise send to review
```

### Important safety rule
If more than one active student still matches the same normalized admission number, I will not guess. That row will be flagged as a master-data issue for review.

---

## Expected result

After this fix:
- admission numbers match accurately instead of returning huge student lists
- values like `NEX-000W14929` map to the correct student
- short/zero-padded variants like `W7304` can resolve safely when unambiguous
- invalid rows are caught before posting
- partial matches are reviewed safely instead of bulk-confirmed
- cross-branch student data remains protected at the DB level
