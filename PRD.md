# Product Requirements Document (PRD)

## Ralph Loop Task List

### Status: Active

1. **Map Cash Flow Data Sources**: Identify all tables and queries used in the Cash Flow Statement generation. Document the data flow.
2. **Audit Operating Activities**: Verify correct tagging of AP, AR, and Expenses in the Cash Flow statement.
3. **Audit Investing & Financing**: Verify Fixed Assets, Loans, and Equity transactions are correctly reflected.
4. **Cross-Check Interconnections**: Verify that GL entries match the Cash Flow items and identify any gaps.

---

## Task Details

### 1. Map Cash Flow Data Sources

- **Goal**: Understand where the numbers come from.
- **Action**: Trace the `CashFlowStatement` component back to the Supabase queries.
- **Output**: A data flow diagram or detailed list of sources.

### 2. Audit Operating Activities

- **Goal**: Ensure daily operations are captured.
- **Action**: Check if "Bill Payments" and "Invoice Receipts" clearly map to Operating lines.

### 3. Audit Investing & Financing

- **Goal**: Ensure long-term moves are captured.
- **Action**: Purchase of Fixed Assets should be Investing. Loan repayments should be Financing.

### 4. Cross-Check Interconnections

- **Goal**: The "Perfect Interconnection".
- **Action**: Identify any transaction types that hit the Bank Account but miss the Cash Flow Statement.
