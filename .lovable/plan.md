

# AP Flow Audit: GL, COA, and Payment Interconnection Verification

## Flow Traced End-to-End

### 1. AP Invoice Creation (`useCreateAPInvoice`)
- **Saves**: `ap_invoices` header + `ap_invoice_lines` with `account_id` per line — **CORRECT**
- **Status**: Created as `unpaid` — **CORRECT**
- **No GL posting at creation** — this is by design (GL posts only on approval)

### 2. AP Invoice Approval (`useApproveAPInvoice`)
- **GL Posting**: DR Expense / CR Trade Payable via `postAPInvoiceToGL()` — **CORRECT double-entry**
- **COA Balance Update**: `createAndPostJournalEntry` → `updateAccountBalance()` adjusts `chart_of_accounts.current_balance` using debit/credit normal rules — **CORRECT**
- **Journal Entry**: Created with `status: "posted"`, linked via `journal_entry_id` — **CORRECT**

### 3. AP Payment (`useCreateAPPayment`)
- **Saves**: `ap_payments` with `vendor_bank_account_id` — **CORRECT** (recently fixed)
- **Invoice Allocation**: Updates `paid_amount`, `balance`, and `status` (paid/partial/unpaid) — **CORRECT**
- **GL Posting**: DR Trade Payable / CR Bank via `postAPPaymentToGL()` — **CORRECT double-entry**
- **WHT Handling**: Extra line DR Trade Payable / CR WHT Payable when WHT > 0 — **CORRECT**
- **Bank Transaction**: Creates `bank_transactions` record and updates `bank_accounts.current_balance` — **CORRECT**
- **Cheque Register**: Auto-creates entry for cheque payments — **CORRECT**
- **Journal Link**: Links `journal_entry_id` back to payment record — **CORRECT**

### 4. COA Balance Updates (`updateAccountBalance`)
- Assets/Expenses: debit increases, credit decreases — **CORRECT**
- Liabilities/Revenue/Equity: credit increases, debit decreases — **CORRECT**
- Applied after every GL posting — **CORRECT**

### 5. Debit = Credit Validation
- `createAndPostJournalEntry` validates `totalDebit === totalCredit` before posting — **CORRECT**

---

## One Issue Found: Per-Line GL Account Not Used During Approval

You just added `account_id` per AP invoice line, but **`useApproveAPInvoice` ignores the per-line accounts**. It posts the entire invoice total to a single `default_expense_account_id` from `gl_settings`. This means if a user assigns "Water & Electricity" to one line and "Repairs" to another, both still hit the same default expense account in the GL.

### Fix Required
Update `useApproveAPInvoice` to:
1. Fetch `ap_invoice_lines` with their `account_id`
2. For lines with an `account_id`, post to that specific account
3. For lines without, fall back to `default_expense_account_id`
4. Create multi-line journal entries (one debit line per distinct account, one credit to Trade Payable)

### Files to Modify
1. `src/hooks/useAccountingMutations.ts` — `useApproveAPInvoice` mutation (lines ~1480-1542)
2. `src/lib/gl-posting-utils.ts` — update `postAPInvoiceToGL` to accept multiple expense lines instead of a single `expenseAccountId`

### Summary
Everything else in the AP → GL → COA → Bank flow is properly interconnected and working correctly. The only gap is that per-line GL accounts added to AP invoice lines are not yet used during GL posting on approval.

