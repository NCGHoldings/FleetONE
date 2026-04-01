

# Fix: School Bus Student Overpayment — Wrong Liability Account + JE/AR Consistency

## Issues Found

1. **Wrong Account Mapping**: The `advance_payments_liability_account_id` in School Bus Finance Settings is mapped to `22501001 INCOME TAX PAYABLE` — this is incorrect. It should be `22303001 CUSTOMER ADVANCES` (exists in your COA).

2. **JE vs AR Amount Mismatch**: When student pays LKR 8,000 on a LKR 7,300 fixed amount:
   - **AR Invoice** correctly shows LKR 7,300 paid ✓
   - **JE** correctly posts: DR Bank 8,000 / CR Trade Receivable 7,300 / CR Liability 700 ✓
   - The JE logic is actually **correct** — it records the full cash received and splits it properly
   - But the liability account is wrong (Income Tax instead of Customer Advances)

3. **The credit balance logic is sound**: Your system already handles overpayment → credit → next month consumption correctly. The only fix needed is the account mapping.

## What Needs to Happen

### 1. Fix the account mapping via SQL migration
Update `school_bus_finance_settings` to point `advance_payments_liability_account_id` to `22303001 CUSTOMER ADVANCES` instead of `22501001 INCOME TAX PAYABLE`:
- LIVE company (`a0000000-0000-0000-0000-000000000001`): map to `ffe5f2b1-c2ad-4598-874d-153852a55646` (22303001 CUSTOMER ADVANCES)
- TEST company (`f40b0a9d-ae5b-41b3-9188-535ae94c9020`): find corresponding account and map it

### 2. Reverse the incorrect JE line (existing data)
The LKR 700 credit currently sitting in `22501001 INCOME TAX PAYABLE` needs to be moved to `22303001 CUSTOMER ADVANCES`. Create a correcting journal entry or update the existing line.

### 3. Verify the AR receipt amount
The AR receipt created alongside the payment should record only the invoice amount (LKR 7,300), not the full payment (LKR 8,000). Need to verify this in the code — the advance portion is a liability, not revenue.

## Files to modify
- **SQL migration** — Update `school_bus_finance_settings.advance_payments_liability_account_id` to correct account, create correcting JE for existing wrong postings
- No code changes needed — the payment recording logic in `useSchoolBusFinance.ts` is already correct, it just used the wrong account because of the settings mapping

## Result
- Student overpayments correctly post to `22303001 CUSTOMER ADVANCES` (liability)
- Next month when credit is consumed: DR Customer Advances / CR Trade Receivable
- JE totals remain balanced and correct
- AR invoice amounts remain correct (fixed monthly amount only)

