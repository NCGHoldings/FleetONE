# Finance System Logic Breakdown

This document provides a detailed walkthrough of what happens when you interact with the Yutong and Sinotruk Finance modules.

## 1. "Record Payment" Button
**Action**: Log a payment received from a customer (e.g. Bank Transfer, Cash).

**Logic Flow**:
1.  **Validation**: Checks if a Quotation/Order is selected and an amount is entered.
2.  **Bank Selection (Optional)**: If you select a bank manually, it will be used. If left blank, the system will resolve it later during verification.
3.  **Data Storage**: Saves the record to `${module}_customer_payments` with a `pending` status.
4.  **No GL Impact**: This step **does not** post anything to the General Ledger. It is strictly operational tracking.

---

## 2. "Verify" Button (Payment History)
**Action**: Formally acknowledge a payment and sync it to the General Ledger.

**Logic Flow**:
1.  **Auto-Customer Creation**: If the customer doesn't exist in the Finance Hub yet, the system creates them.
    *   **Auto-Category**: New customers are automatically assigned to the **"External"** category unless specified otherwise.
2.  **GL Account Resolution**: The system searches for accounts in this order:
    *   **Level 1 (Manual)**: Did you select a specific account in the "Record Payment" modal?
    *   **Level 2 (Category)**: Does the Customer's Category (External/Internal) have a mapped bank/receivable account?
    *   **Level 3 (Global)**: Use the fallback accounts in **Settings → Admin → Core GL**.
3.  **Journal Entry Creation**:
    *   **DEBIT**: Selected Bank/Cash Account.
    *   **CREDIT**: Customer Advance (if before invoice) OR Trade Receivable (if invoice exists).
4.  **Status Update**: Payment changes from `pending` to `verified`.

---

## 3. "Finance Hub" Button
**Action**: Opens the auditing center for the specific order.

**Features**:
*   **Payment Lifecycle**: View every recorded payment and its current GL status.
*   **Master AR**: View the official Invoice linked to this order.
*   **Live JEs (The Breakdown)**: This is the **Double-Entry View**. It shows every Debit and Credit exactly as it appears in your ledger.

---

## 4. "Sync GL" Button (Inside Finance Hub)
**Action**: Manually trigger a GL post for a payment that failed to auto-sync.

**Logic Flow**:
*   Same as the **Verify** button logic. 
*   Useful if you updated your GL settings AFTER recording a payment and want to try posting again.

---

## 5. "Reverse" Button (Inside Finance Hub)
**Action**: Cancel a verified payment.

**Logic Flow**:
1.  **GL Reversal**: Creates a "Contra" Journal Entry (swaps Debits and Credits) to net out the original transaction.
2.  **Status Update**: Marks the payment as `reversed`.
3.  **Audit Trail**: The original entry remains for audit purposes, but the financial impact is neutralized.
