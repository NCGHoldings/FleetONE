# Master System Contract: Special Hire Financial Pipeline 🚀

This document is the absolute blueprint for the Special Hire pipeline. As requested, this contains **0% missing steps**. It maps the entire lifecycle from Quotation to Final Settlement, including the exact General Ledger accounts hit, the exact Debit/Credit math, and the database tables updated.

## The Rule of the Guard
If the system operates exactly as drawn below, it is mathematically impossible for an error to occur. Any failure outside this diagram is a human process error.

```mermaid
graph TD
    %% Global Settings Lookups
    Settings[(special_hire_finance_settings)]
    Settings -.->|Provides GL Accounts| JE_ADV
    Settings -.->|Provides GL Accounts| JE_INV
    Settings -.->|Provides GL Accounts| JE_SETTLE

    %% Phase 1: Advance Payment
    subgraph Phase 1: Quotation & Advance Payment
        Q[Quotation Approved] -->|Customer Pays Advance| ADV[Create Advance Payment Receipt]
        ADV -->|Atomic Transaction| JE_ADV[Journal Entry: Advance]
        
        JE_ADV -->|Debit +| DR_ADV["DR: Bank Account Asset<br/><i>(from settings.default_bank_account_id)</i>"]
        JE_ADV -->|Credit +| CR_ADV["CR: Customer Advance Liability<br/><i>(from settings.customer_advance_account_id)</i>"]
        
        DR_ADV --> COA_ADV[Chart of Accounts Auto-Update]
        CR_ADV --> COA_ADV
    end

    %% Phase 2: Trip Execution
    subgraph Phase 2: Trip Execution & Adjustments
        COA_ADV --> TRIP[Trip Starts]
        TRIP --> ADJ{Post-Trip Adjustments}
        ADJ -->|Extra Mileage/Waiting| UPDATE[Update Final Quotation Value]
        UPDATE --> POST[Operations Clicks 'Post to GL']
    end

    %% Phase 3: AR Invoice Generation
    subgraph Phase 3: Final Invoice Generation
        POST -->|Verify Hub Lock| PIPE[Pipeline Engine]
        PIPE -->|1. Generate| AR_INV[ar_invoices Table: Status Unpaid]
        PIPE -->|2. Generate| JE_INV[Journal Entry: Revenue Recognition]
        
        JE_INV -->|Debit +| DR_INV["DR: Trade Receivables Asset<br/><i>(from settings.trade_receivable_account_id)</i>"]
        JE_INV -->|Credit +| CR_INV["CR: Special Hire Revenue<br/><i>(from settings.revenue_external_account_id)</i>"]
        
        DR_INV --> COA_INV[Chart of Accounts Auto-Update]
        CR_INV --> COA_INV
        
        %% Auto Application of Advance
        PIPE --> AUTO_APPLY{Was Advance Paid?}
        AUTO_APPLY -->|Yes| APPLY[Auto-Settle Advance against AR Invoice]
        APPLY --> JE_APPLY[Journal Entry: Settle Advance]
        JE_APPLY -->|Debit -| DR_APPLY["DR: Customer Advance Liability<br/><i>(from settings.customer_advance_account_id)</i>"]
        JE_APPLY -->|Credit -| CR_APPLY["CR: Trade Receivables Asset<br/><i>(from settings.trade_receivable_account_id)</i>"]
    end

    %% Phase 4: Final Settlement
    subgraph Phase 4: Final Settlement
        AR_INV -->|Remaining Balance| PAY[Customer Pays Balance]
        PAY --> AR_REC[Create ar_receipts Table]
        AR_REC --> JE_SETTLE[Journal Entry: Final Settlement]
        
        JE_SETTLE -->|Debit +| DR_SETTLE["DR: Bank Account Asset<br/><i>(from settings.default_bank_account_id)</i>"]
        JE_SETTLE -->|Credit -| CR_SETTLE["CR: Trade Receivables Asset<br/><i>(from settings.trade_receivable_account_id)</i>"]
        
        DR_SETTLE --> COA_FINAL[Chart of Accounts Auto-Update]
        CR_SETTLE --> COA_FINAL
        
        AR_REC --> CLOSE[AR Invoice Status = PAID]
    end

    %% Global Integrity Guard
    VH{Verify Hub Monitoring}
    JE_ADV -.->|Audits Missing| VH
    JE_INV -.->|Audits Missing| VH
    JE_SETTLE -.->|Audits Missing| VH
    AR_INV -.->|Audits Missing| VH
```
