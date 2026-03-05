

# Auto-Numbering Cheques from Bank Cheque Books

## Problem
When recording an AP payment by cheque, the user must manually type the cheque number. There is no cheque book management — so no way to auto-assign the next cheque number for a given bank account.

## Solution
Create a **cheque_books** table to track cheque book ranges per bank account, then auto-populate the cheque number field when the user selects a bank account and cheque payment method.

## Database Changes

### New table: `cheque_books`
```sql
CREATE TABLE public.cheque_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  company_id UUID,
  prefix TEXT DEFAULT '',
  start_number INTEGER NOT NULL,
  end_number INTEGER NOT NULL,
  next_number INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
- Each bank account can have one or more cheque books (only one active at a time).
- `next_number` tracks the next available cheque leaf.
- When `next_number > end_number`, the book is exhausted.

### New RPC: `get_next_cheque_number`
A database function that, given a `bank_account_id`, finds the active cheque book and returns the next cheque number (with prefix formatting), then increments `next_number`.

## Code Changes

### 1. New hook: `src/hooks/useChequeBooks.ts`
- `useChequeBooks(bankAccountId)` — fetch cheque books for a bank account
- `useNextChequeNumber()` — mutation calling the RPC to get and consume the next number
- `useCreateChequeBook()` / `useUpdateChequeBook()` — CRUD for cheque book management

### 2. Modify: `src/components/accounting/APPaymentForm.tsx`
- When payment method is "cheque" **and** a bank account is selected, auto-fetch the next cheque number via the hook and populate the `cheque_number` field.
- Show a small indicator if the cheque book is running low or exhausted.
- Still allow manual override if needed.

### 3. New UI: Cheque Book Management (in Banking settings)
- A simple table to add/view cheque books per bank account (prefix, start, end, next, status).
- This lets the user register new cheque books when they receive them from the bank.

### 4. Apply same logic to `ChequeIssueForm.tsx`
- Auto-populate cheque number from the active cheque book when bank account is selected.

