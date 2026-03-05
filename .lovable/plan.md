

# Advanced Petty Cash Management System

## Current State

The petty cash system is basic:
- Simple fund cards with Disburse/Replenish buttons
- Minimal create form (name, business unit, opening balance, custodian)
- Basic transaction history table
- No branch-wise or section-wise filtering
- No expense category tracking on disbursements
- No approval workflow
- No receipt/voucher number generation
- No fund limits/thresholds
- No detailed disbursement form (payee, category, GL account, receipt attachment)

## What Needs to Change

### 1. Database Migration — Enhance petty_cash tables

Add missing columns to `petty_cash_funds`:
- `branch_id` (FK to `school_branches`) — for school bus branch-wise fund management
- `fund_limit` — maximum balance allowed
- `low_balance_threshold` — alert when below this
- `fund_type` (main/branch/department) — categorize funds
- `approval_required_above` — amount threshold requiring approval
- `notes` — fund description/notes

Add missing columns to `petty_cash_transactions`:
- `payee_name` — who received the money
- `expense_category` — expense type (fuel, food, etc.)
- `payment_method` (cash/cheque)
- `reference_number` — external reference
- `approved_by` — approval tracking
- `status` (pending/approved/rejected/void)
- `voucher_number` — auto-generated PC voucher number
- `attachment_url` — receipt image
- `branch_id` — for branch filtering
- `company_id` — for section filtering

Create new table `petty_cash_voucher_seq` or use a Postgres sequence for auto-numbering vouchers.

### 2. Rebuild `PettyCashView.tsx` — Full Management Interface

Replace the basic view with a tabbed, advanced interface:

**Tab 1: Dashboard**
- Summary cards: Total balance, Total disbursed (month), Total replenished (month), Active funds count
- Branch-wise and section-wise balance breakdown (grouped cards/table)
- Low balance alerts
- Recent transactions feed

**Tab 2: Funds Management**
- Full CRUD table with all fund details
- Filter by branch, section (business unit), custodian, status
- Fund detail panel showing: opening balance, current balance, limit, threshold, custodian, GL account, branch
- Edit fund, deactivate fund
- Enhanced create form with all new fields

**Tab 3: Disbursements**
- Advanced disbursement form:
  - Select Fund (filtered by branch/section)
  - Voucher number (auto-generated)
  - Payee name
  - Expense category (from EXPENSE_CATEGORIES)
  - GL Account (SearchableAccountSelector)
  - Amount with validation against fund balance and approval threshold
  - Description, Reference number
  - Receipt attachment upload
  - Status workflow (pending → approved → posted)
- Disbursement history table with filters

**Tab 4: Replenishments**
- Replenishment form with bank account selection
- Replenishment history
- Pending replenishment requests

**Tab 5: Reports**
- Branch-wise summary
- Section-wise summary  
- Fund utilization report
- Category-wise spending
- Period-based filtering (date range)

### 3. Update `usePettyCash.ts` — Enhanced hooks

- Add `usePettyCashDashboard()` — aggregated stats
- Update `useCreatePettyCashTransaction()` — include new fields (payee, category, voucher, status, branch)
- Add `useUpdatePettyCashFund()` — edit fund details
- Add `usePettyCashByBranch()` — branch-filtered data
- Add `useDeactivatePettyCashFund()` — soft delete
- Update queries to join `school_branches` and include branch info

### 4. Update `useCreatePettyCashFund()` — Enhanced creation

Accept all new fields: branch_id, fund_limit, low_balance_threshold, fund_type, approval_required_above, notes, GL account selection.

## Files to Change

| File | Change |
|---|---|
| Migration SQL | Add columns to `petty_cash_funds` and `petty_cash_transactions`, create voucher sequence |
| `src/components/accounting/PettyCashView.tsx` | Complete rebuild with tabbed advanced interface |
| `src/hooks/usePettyCash.ts` | Enhanced hooks with new fields, branch filtering, dashboard stats |

