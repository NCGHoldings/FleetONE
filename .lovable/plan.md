

# Fix: AP Payment Creates Duplicate Journal Entries

## Problem Found

Every AP payment creates **two journal entries** instead of one:

| Payment | JE #1 (on Create) | JE #2 (on Approve) |
|---------|-------------------|---------------------|
| PAY-2026-25554 (24K) | JE-22D2 — DR Trade Payable LOCAL / CR **Sampath** ✓ | JE-0CC1 — DR Trade Payable INTERNAL / CR **Seylan** ✗ |
| PAY-2026-25556 (200K) | JE-H7PO — DR Trade Payable LOCAL / CR **Seylan** ✓ | JE-1J8C — DR Trade Payable INTERNAL / CR **Seylan** ✗ |
| PAY-2026-25559 (5M) | JE-JR6X — DR Trade Payable LOCAL / CR **Sampath** ✓ | JE-PNBI — DR Trade Payable INTERNAL / CR **Seylan** ✗ (voided) |

### Root Cause

Two separate GL posting paths fire for the same payment:

1. **`useCreateAPPayment`** (line ~1054-1196): Posts GL at creation time using the **actual bank account** from the form — this is correct.
2. **`useApproveAPPayment`** (line ~1888-1958): Posts a **second** GL entry on approval using **gl_settings defaults** (Trade Payable INTERNAL + Seylan Bank) — completely ignoring the actual bank used. This is the duplicate.

Since payments are created with `status: "posted"` and GL is already posted at creation, the approval step should **not** post to GL again.

## Fix

### File: `src/hooks/useAccountingMutations.ts`

**In `useApproveAPPayment` (lines 1888-1968):**

Add a **double-posting guard**: before creating a new JE, check if the payment already has a `journal_entry_id`. If it does, skip GL posting entirely — the entry was already created at payment time.

Change the approval mutation to:
1. Fetch the payment record including `journal_entry_id`
2. If `journal_entry_id` is already set → skip GL posting, only update approval status
3. If `journal_entry_id` is null → post GL as before (fallback for old payments that were created without GL)

This is a ~5-line guard check added before the GL posting block.

### Data Cleanup

The 3 duplicate journal entries need attention:
- **JE-20260402-0CC1** (24K) — duplicate, should be voided
- **JE-20260402-1J8C** (200K) — duplicate, should be voided  
- **JE-20260402-PNBI** (5M) — already voided + reversed ✓

I'll void the remaining 2 duplicates and reverse their COA balance impact via a one-time cleanup in the migration or direct guidance.

## Result
- AP payments post GL exactly once (at creation)
- Approval step only updates status, no duplicate JE
- Correct bank account is always used (from payment form, not gl_settings defaults)

