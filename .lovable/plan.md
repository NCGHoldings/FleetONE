
I cross-checked the current COA upload code, your screenshots, and recent DB upload history.  
Do I know what the issue is? **Yes.**

### What is still going wrong

1. **Replace mode is still reachable in some paths**  
   Even with UI warnings, the logic still allows the app to enter replace flow and attempt inserts.

2. **Replace flow only checks `deleteError`, not whether rows were actually deleted**  
   If delete becomes a no-op (or partial visibility/RLS behavior), code continues to insert → duplicate key errors (`23505`) on `(company_id, account_code)`.

3. **Linked-data detection is incomplete and under-counted**
   - It currently checks limited tables and only first 100 account IDs (`slice(0, 100)`), so replace can be incorrectly allowed.
   - Many FK references exist in finance tables; if any remain, delete will fail.

4. **Current UX still permits dangerous replace attempts**
   Confirmation checkbox can still allow replacing logic to proceed instead of hard-blocking.

---

### Implementation plan (target file: `src/components/accounting/ChartOfAccountsUpload.tsx`)

1. **Make replace non-bypassable at runtime**
   - In `handleUpload`, if replace is selected and linked data exists, immediately force merge and return (no replace call).
   - Add same hard guard at top of `handleUploadReplace` as defensive fallback.

2. **Require verified delete before any insert**
   - Change replace delete call to return deleted rows/count.
   - Compare deleted count against expected existing account count.
   - If mismatch (including 0 deleted while accounts exist), treat as failure and **stop**; do not run insert loop.

3. **Remove confirmation override for linked data**
   - Keep Replace disabled when linked data exists.
   - Remove/disable the “I understand…” path that still lets replace proceed.
   - Radio `onValueChange` should reject selecting `"replace"` when blocked and keep mode at `"merge"`.

4. **Fix link detection accuracy**
   - Replace `accountIds.slice(0, 100)` with chunked counting across all account IDs.
   - Keep separate counters for journal/budget/other refs; compute a total linked count used for gating.

5. **Improve failure messaging + audit logs**
   - Log explicit reason in `coa_upload_history`:
     - `replace_blocked_linked_data`
     - `replace_blocked_delete_no_rows`
     - `replace_blocked_delete_error`
   - Show one clear toast instead of batch duplicate-noise.

6. **Optional hardening (recommended)**
   - If account count > 0 and this is a live company, default to merge and hide destructive replace unless explicitly unlocked by super-admin flow.

---

### Validation checklist I will run after implementation

1. Reproduce your exact case (395 existing, 222 import, linked records present):
   - Replace cannot proceed to inserts.
   - No 222 duplicate-key batch spam.
   - Clear “use Merge/Update” message shown.

2. Test Merge with same file:
   - Should complete successfully.

3. Test clean company (no linked refs):
   - Replace works only when delete is verified successful.

4. Confirm UI behavior:
   - Replace selection cannot be forced when blocked.
   - Upload history records the correct failure/success reason.
