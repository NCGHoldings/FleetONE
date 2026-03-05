

# Cross-Check and Fix All Automation Modules

## Findings from Console Logs and Database Inspection

The GL Integrity Scanner (`useGLIntegrityScanner.ts`) references 7 incorrect table/column names, causing scan errors on every load. The Automation Engine dashboard and sub-modules (Recurring Invoices, Payment Reminders, Workflow Rules, Scheduled Tasks) have CRUD UIs that work but some underlying scanner targets are broken.

### Errors Found (from console logs)

| Error | Wrong Reference | Actual Table/Column |
|---|---|---|
| `maintenance_logs` not found | `tableName: "maintenance_logs"` | `maintenance_records` |
| `insurance_records.company_id` missing | `.eq("company_id", ...)` | No `company_id` column; use `bus_id` join or remove filter |
| `special_hire_payments.company_id` missing | `.eq("company_id", ...)` | No `company_id` column; join via `quotation_id` |
| `school_bus_payments` not found | `tableName: "school_bus_payments"` | `school_payments` |
| `loan_payments` not found | `tableName: "loan_payments"` | `bus_loan_payments` |
| `ncg_express_daily_trips` not found | `tableName: "ncg_express_daily_trips"` | Table does not exist — remove target |
| `ncg_express_daily_expenses` not found | `tableName: "ncg_express_daily_expenses"` | Table does not exist — remove target |

Additional column mismatches:
- `maintenance_records` has no `maintenance_date` (use `scheduled_date`), no `cost` (use `actual_cost`), no `company_id`, no `gl_posted`
- `school_payments` has no `receipt_number`, no `journal_entry_id`, no `company_id`
- `insurance_records` has no `company_id`, no `journal_entry_id`, no `last_amortization_month`

## Plan

### 1. Fix `useGLIntegrityScanner.ts` — SCAN_TARGETS array (lines 106-277)

Fix all 12 scan targets:

- **maintenance**: Change `tableName` from `"maintenance_logs"` to `"maintenance_records"`, `dateColumn` from `"maintenance_date"` to `"scheduled_date"`, `amountColumn` from `"cost"` to `"actual_cost"`. Since no `company_id` or `gl_posted`, change `glCheckType` to `"journal_entry_id"` (if column exists) or remove the target entirely.
- **insurance**: Change `glCheckType` approach since no `company_id` or `journal_entry_id`. Remove company filter for this target.
- **special_hire**: Remove direct `company_id` filter; the scanner must skip the company filter for this table.
- **school_bus**: Change `tableName` from `"school_bus_payments"` to `"school_payments"`, `refColumn` from `"receipt_number"` to `"reference_no"`, remove `company_id` dependency. Since no `journal_entry_id`, change `glCheckType` to `"gl_posted"` or remove target.
- **leasing**: Change `tableName` from `"loan_payments"` to `"bus_loan_payments"`.
- **ncge_trips** and **ncge_expenses**: Remove both targets entirely since the tables don't exist.

### 2. Fix `useGLIntegrityScanner.ts` — Scanner query logic (lines 578-600)

The scanner blindly applies `.eq("company_id", effectiveCompanyId)` to all targets. Add a `hasCompanyId` flag to each `ScanTarget` so tables without `company_id` skip that filter.

### 3. Fix `useFinanceAutomationEngine.ts` — Pending Amortizations (lines 592-697)

The `usePendingAmortizations` hook queries `insurance_records.company_id` and `insurance_records.last_amortization_month`, neither of which exist. Fix by removing `company_id` filter and `last_amortization_month` reference (or skipping insurance amortization entirely until columns are added).

Similarly for `route_permits` — verify the `last_amortization_month` column exists.

### 4. Verify remaining automation sub-modules work

The CRUD views (RecurringInvoicesView, PaymentReminderRulesView, WorkflowRulesView, ScheduledTasksView) all query real tables (`recurring_invoices`, `payment_reminder_rules`, `workflow_rules`, `scheduled_tasks`) and appear structurally correct. The edge functions (`process-recurring-invoices`, `process-payment-reminders`, `execute-workflow-rules`, `run-scheduled-tasks`) are deployed. No code changes needed for these — they work.

### Summary of Changes

| File | What |
|---|---|
| `src/hooks/useGLIntegrityScanner.ts` | Fix 7 table names, 5 column names, add `hasCompanyId` flag, remove 2 non-existent targets |
| `src/hooks/useFinanceAutomationEngine.ts` | Fix `usePendingAmortizations` to handle missing columns |

This will eliminate all 7 console errors and make the Automation Engine dashboard fully functional with accurate module health reporting, GL integrity scanning, and pending amortization tracking.

