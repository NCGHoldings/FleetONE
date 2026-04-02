

# Cross-Check: Special Hire + Yutong — Complete Flow Diagrams + Fix Build Errors

## Part 1: Build Error Fixes (17 TypeScript errors in Edge Functions)

All errors are `error is of type 'unknown'` — need to cast to `Error` before accessing `.message`. Affects 7 files:

| File | Lines | Fix |
|------|-------|-----|
| `populate-sample-fleet-data/index.ts` | 167 | `(error as Error).message` |
| `process-payment-reminders/index.ts` | 207, 216, 234 | Cast `invErr`, `ruleErr`, `error` |
| `process-recurring-invoices/index.ts` | 125, 131, 151 | Cast `err`, `error` |
| `run-scheduled-tasks/index.ts` | 91, 99, 119 | Cast `taskErr`, `error` |
| `service-callback/index.ts` | 119 | Cast `error` |
| `submit-special-hire/index.ts` | 87 | Cast `error` |
| `sync-staff-registry/index.ts` | 301 | Cast `error` |
| `update-bus-odometer/index.ts` | 121 | Cast `error` |
| `yutong-executive-report/index.ts` | 30 | Add null check for `setting` |

## Part 2: Flow Diagrams

Two Mermaid diagrams will be generated to `/mnt/documents/`:

### Diagram 1: Special Hire Complete Operation-to-Finance Flow

Covers all scenarios verified against the code:

```text
OPERATIONS FLOW:
  Quotation Created → Payment Received → Trip Completed → Post-Trip Adjustment → Invoice Sent → Balance Paid → Settled

FINANCE FLOW (Journal Entries):
  JE1: Advance Payment     → DR Bank (13001011)           CR Customer Advance (22303001)
  JE2: Full Payment         → DR Bank (13001011)           CR Customer Advance (22303001)
  JE3: AR Invoice (Revenue) → DR Trade Receivable (12201001) CR Revenue Int/Ext (41103002/03)
  JE4: Post-Trip Adjustment → DR Trade Receivable (12201001) CR Revenue Int/Ext (41103002/03)
  JE5: Balance Payment      → DR Bank (13001011)           CR Trade Receivable (12201001)
  JE6: Advance Application  → DR Customer Advance (22303001) CR Trade Receivable (12201001)
  JE7: Discount (if any)    → DR Discount Expense           CR Trade Receivable (12201001)
  JE8: Refund (if cancel)   → DR Customer Advance (22303001) CR Bank (13001011)

SETTLEMENT CHECK:
  Trade Receivable = Invoice + Adjustments - Advance Applied - Balance Paid - Discount = 0 ✓
  Customer Advance = Payments In - Applied - Refunded = 0 ✓
  Bank = All cash in - Refunds out ✓
```

### Diagram 2: Yutong Complete Operation-to-Finance Flow

```text
OPERATIONS FLOW:
  Quotation → Order → Payment (Advance) → Invoice Gen (PI/CI/TI) → Invoice Approval → Balance Payment → Delivered

FINANCE FLOW (Journal Entries):
  JE1: Advance Payment       → DR Bank                     CR Customer Advance (22303001)
  JE2: Invoice Approval       → DR Trade Receivable (12201001) CR Sales Revenue (41101001) + CR VAT Output (22302001)
  JE3: Advance Application    → DR Customer Advance (22303001) CR Trade Receivable (12201001)
  JE4: Balance Payment        → DR Bank                     CR Trade Receivable (12201001)
  JE5: Full Payment (no adv)  → DR Bank                     CR Sales Revenue (41101001)

AR INTEGRATION:
  - Draft AR Invoice created at invoice generation (PI/CI/TI)
  - Revenue JE linked back to ar_invoices.journal_entry_id on approval
  - Balance payments create AR Receipts + Allocations
  - Invoice status: draft → approved → partial → paid

SETTLEMENT CHECK:
  Trade Receivable = Invoice Amount - Advance Applied - Balance Paid = 0 ✓
  Customer Advance = Advance In - Applied = 0 ✓
  Revenue = Invoice Amount (excl VAT if tax invoice) ✓
```

### Cross-Check Verification Points

Both modules will be validated against these accounting principles:
1. Every JE has total_debit = total_credit (balanced)
2. COA balances update correctly (debit-normal vs credit-normal)
3. source_module tagged on every JE
4. business_unit_code tagged (SPH / YUT)
5. No revenue leakage (all income hits correct revenue account via item category)
6. No double-posting (guards check existing journal_entry_id)
7. AR Invoice ↔ JE linkage maintained
8. Bank balance reflects all cash movements

## Files to modify

1. **7 edge function files** — Add `(error as Error).message` casts
2. **1 edge function file** — Add null check for `setting`
3. **Generate 2 Mermaid diagrams** to `/mnt/documents/`

## Result
- All 17 build errors fixed
- Two comprehensive flow diagrams showing every operation step and its corresponding double-entry journal entry
- Complete cross-reference between Operations and Finance for both Special Hire and Yutong

