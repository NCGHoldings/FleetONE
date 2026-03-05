

# Fix AP Payments Not Showing in Table

## Root Cause
The `useAPPayments()` query in `src/hooks/useAccountingData.ts` joins `bank_accounts (...)` via PostgREST, but the `ap_payments.bank_account_id` column has **no foreign key constraint** to the `bank_accounts` table. PostgREST cannot resolve this join, causing the entire query to fail silently. React Query keeps retrying, leaving the table stuck on "Loading payments..." forever.

The data is fine — there are 8 payments in the database. The query itself is broken.

## Fix

### 1. Add the missing FK constraint (Database)
Run SQL to add the foreign key:
```sql
ALTER TABLE ap_payments 
ADD CONSTRAINT ap_payments_bank_account_id_fkey 
FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id);
```

### 2. Defensive fallback in code
In `src/hooks/useAccountingData.ts`, wrap the `useAPPayments` query with error handling so if the join fails it falls back to fetching without the join. Alternatively, keep the join but add a `.catch` that retries without the joined fields.

**Recommended approach**: Add the FK constraint (step 1) since `bank_account_id` values already reference valid `bank_accounts` rows. This is the correct fix and also improves database integrity. The code change is optional as a safety net.

### File Changes
- **Database migration**: Add FK constraint `ap_payments_bank_account_id_fkey`
- **`src/hooks/useAccountingData.ts`** (optional safety): No code change needed if FK is added

