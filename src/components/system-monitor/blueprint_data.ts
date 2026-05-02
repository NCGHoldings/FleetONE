import { SupabaseClient } from "@supabase/supabase-js";

export type BlueprintGenerator = string | ((supabase: SupabaseClient, companyId: string) => Promise<string>);

export const BLUEPRINTS: Record<string, { code: BlueprintGenerator, filename: string }> = {
  sph: {
    filename: "special_hire_pipeline.mermaid",
    code: async (supabase: SupabaseClient, companyId: string) => {
      const { data: settings } = await supabase
        .from('special_hire_finance_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      const { data: coa } = await supabase.from('chart_of_accounts').select('id, name');

      const getGL = (id: string | null | undefined, fallback: string) => {
        if (!id) return `❌ Not Connected (${fallback})`;
        const account = coa?.find(c => c.id === id);
        return account ? `${account.name} (Level 5 GL)` : `❌ Unknown Account`;
      };

      const bankAcc = getGL(settings?.default_bank_account_id, "Missing default_bank_account_id");
      const advLiab = getGL(settings?.customer_advance_account_id, "Missing customer_advance_account_id");
      const tradeRec = getGL(settings?.trade_receivable_account_id, "Missing trade_receivable_account_id");
      const revenueAcc = getGL(settings?.revenue_external_account_id, "Missing revenue_external_account_id");

      return `graph TD
    %% Global Settings Lookups
    Settings[(special_hire_finance_settings)]
    Settings -.->|Provides GL Accounts| JE_ADV
    Settings -.->|Provides GL Accounts| JE_INV
    Settings -.->|Provides GL Accounts| JE_SETTLE

    %% Phase 1: Advance Payment
    subgraph Phase 1: Quotation & Advance Payment
        Q[Quotation Approved] -->|Customer Pays Advance| ADV[Create Advance Payment Receipt]
        ADV -->|Atomic Transaction| JE_ADV[Journal Entry: Advance]
        
        JE_ADV -->|Debit +| DR_ADV["DR: ${bankAcc}"]
        JE_ADV -->|Credit +| CR_ADV["CR: ${advLiab}"]
        
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
        
        JE_INV -->|Debit +| DR_INV["DR: ${tradeRec}"]
        JE_INV -->|Credit +| CR_INV["CR: ${revenueAcc}"]
        
        DR_INV --> COA_INV[Chart of Accounts Auto-Update]
        CR_INV --> COA_INV
        
        %% Auto Application of Advance
        PIPE --> AUTO_APPLY{Was Advance Paid?}
        AUTO_APPLY -->|Yes| APPLY[Auto-Settle Advance against AR Invoice]
        APPLY --> JE_APPLY[Journal Entry: Settle Advance]
        JE_APPLY -->|Debit -| DR_APPLY["DR: ${advLiab}"]
        JE_APPLY -->|Credit -| CR_APPLY["CR: ${tradeRec}"]
    end

    %% Phase 4: Final Settlement
    subgraph Phase 4: Final Settlement
        AR_INV -->|Remaining Balance| PAY[Customer Pays Balance]
        PAY --> AR_REC[Create ar_receipts Table]
        AR_REC --> JE_SETTLE[Journal Entry: Final Settlement]
        
        JE_SETTLE -->|Debit +| DR_SETTLE["DR: ${bankAcc}"]
        JE_SETTLE -->|Credit -| CR_SETTLE["CR: ${tradeRec}"]
        
        DR_SETTLE --> COA_FINAL[Chart of Accounts Auto-Update]
        CR_SETTLE --> COA_FINAL
        
        AR_REC --> CLOSE[AR Invoice Status = PAID]
    end

    %% Global Integrity Guard
    VH{Verify Hub Monitoring}
    JE_ADV -.->|Audits Missing| VH
    JE_INV -.->|Audits Missing| VH
    JE_SETTLE -.->|Audits Missing| VH
    AR_INV -.->|Audits Missing| VH`;
    }
  },
  iou: {
    filename: "iou_pipeline.mermaid",
    code: async (supabase: SupabaseClient, companyId: string) => {
      const { data: settings } = await supabase
        .from('finance_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      const { data: coa } = await supabase.from('chart_of_accounts').select('id, name');

      const getGL = (id: string | null | undefined, fallback: string) => {
        if (!id) return `❌ Not Connected (${fallback})`;
        const account = coa?.find(c => c.id === id);
        return account ? `${account.name} (Level 5 GL)` : `❌ Unknown Account`;
      };

      const advAsset = getGL(settings?.staff_advance_account_id, "Missing staff_advance_account_id");
      const bankAcc = getGL(settings?.bank_account_id, "Missing default bank_account_id");

      return `graph TD
    %% Global Settings Lookups
    Settings[(finance_settings)]
    Settings -.->|Provides GL Accounts| JE_ISSUE
    Settings -.->|Provides GL Accounts| JE_SETTLE

    %% Phase 1: Issuing the Advance
    subgraph Phase 1: IOU Issuance
        REQ[Staff Requests IOU] -->|Manager Approves| ISSUE[Finance Issues Funds]
        ISSUE -->|Atomic Transaction| JE_ISSUE[Journal Entry: IOU Disbursement]
        
        JE_ISSUE -->|Debit +| DR_ADV["DR: ${advAsset}"]
        JE_ISSUE -->|Credit -| CR_BANK["CR: ${bankAcc}"]
        
        DR_ADV --> COA_ISSUE[COA Auto-Update]
        CR_BANK --> COA_ISSUE
    end

    %% Phase 2: Expense Submission
    subgraph Phase 2: Expense Settlement
        COA_ISSUE --> EXP[Staff Submits Actual Expenses/Receipts]
        EXP -->|HOD Approves| SETTLE[Finance Settles IOU]
        
        SETTLE -->|Atomic Transaction| JE_SETTLE[Journal Entry: Expense Recognition]
        
        JE_SETTLE -->|Debit +| DR_EXP["DR: Actual Expense Account<br/><i>(Mapped via expense_categories)</i>"]
        
        %% Splitting the Credit based on over/under spending
        JE_SETTLE -->|Credit -| CR_ADV_CLEAR["CR: ${advAsset}"]
        JE_SETTLE -->|Optional Credit| CR_BANK_EXTRA["CR: Bank - If company owes staff more money<br/><i>(${bankAcc})</i>"]
        JE_SETTLE -->|Optional Debit| DR_BANK_REFUND["DR: Bank - If staff refunds unused cash<br/><i>(${bankAcc})</i>"]
        
        DR_EXP --> COA_FINAL[COA Auto-Update]
        CR_ADV_CLEAR --> COA_FINAL
    end
    
    %% Integrity Guard
    VH{Verify Hub}
    JE_ISSUE -.->|Monitors| VH
    JE_SETTLE -.->|Monitors| VH`;
    }
  },
  pc: {
    filename: "petty_cash_pipeline.mermaid",
    code: async (supabase: SupabaseClient, companyId: string) => {
      const { data: settings } = await supabase
        .from('finance_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      const { data: funds } = await supabase
        .from('petty_cash_funds')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true);

      const { data: coa } = await supabase.from('chart_of_accounts').select('id, name');

      const getGL = (id: string | null | undefined, fallback: string) => {
        if (!id) return `❌ Not Connected (${fallback})`;
        const account = coa?.find(c => c.id === id);
        return account ? `${account.name} (Level 5 GL)` : `❌ Unknown Account`;
      };

      const bankAcc = getGL(settings?.bank_account_id, "Missing default bank_account_id");

      let mermaidStr = `graph TD
    %% Global Settings Lookups
    Settings[(company_settings & petty_cash_funds)]
    Settings -.->|Provides GL Accounts| JE_REPLENISH

    subgraph Phase 1: Request & Approval
        LOW[Petty Cash Balance Low] -->|Cashier generates report| REQ[Replenishment Request]
        REQ -->|Director Approves| AP_VOUCHER[Generate AP Payment Voucher]
    end

    subgraph Phase 2: Fund Transfer
        AP_VOUCHER -->|Atomic Transaction| JE_REPLENISH[Journal Entry: Float Top-up]
        JE_REPLENISH -->|Credit -| CR_BANK["CR: ${bankAcc}"]
        
        %% Dynamic Petty Cash Funds
`;

      if (funds && funds.length > 0) {
        funds.forEach(fund => {
          const fundAcc = getGL(fund.gl_account_id, `Missing gl_account_id for ${fund.fund_name}`);
          const nodeId = `DR_PC_${fund.id.substring(0,6).replace(/-/g, '')}`;
          mermaidStr += `        JE_REPLENISH -->|Debit +| ${nodeId}["DR: ${fundAcc}<br/><i>(Fund: ${fund.fund_name})</i>"]\n`;
          mermaidStr += `        ${nodeId} --> COA[COA Auto-Update]\n`;
        });
      } else {
        mermaidStr += `        JE_REPLENISH -->|Debit +| DR_PC["DR: ❌ No Active Funds Configured"]\n`;
        mermaidStr += `        DR_PC --> COA[COA Auto-Update]\n`;
      }

      mermaidStr += `        CR_BANK --> COA
        
        COA --> FLOAT_UPDATE[Petty Cash Working Float Updated]
    end
    
    %% Integrity Guard
    VH{Verify Hub}
    JE_REPLENISH -.->|Monitors| VH`;

      return mermaidStr;
    }
  },
  ap: {
    filename: "ap_procurement_pipeline.mermaid",
    code: async (supabase: SupabaseClient, companyId: string) => {
      const { data: settings } = await supabase
        .from('finance_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      const { data: coa } = await supabase.from('chart_of_accounts').select('id, name');

      const getGL = (id: string | null | undefined, fallback: string) => {
        if (!id) return `❌ Not Connected (${fallback})`;
        const account = coa?.find(c => c.id === id);
        return account ? `${account.name} (Level 5 GL)` : `❌ Unknown Account`;
      };

      const invAcc = getGL(settings?.inventory_asset_account_id || settings?.default_expense_account_id, "Missing inventory_asset_account_id");
      const accrualAcc = getGL(settings?.grn_accrual_account_id || settings?.accounts_payable_account_id, "Missing grn_accrual_account_id");
      const apAcc = getGL(settings?.accounts_payable_account_id, "Missing accounts_payable_account_id");
      const bankAcc = getGL(settings?.bank_account_id, "Missing default bank_account_id");

      return `graph TD
    %% Global Settings Lookups
    Settings[(finance_settings)]
    Settings -.->|Provides GL Accounts| JE_GRN
    Settings -.->|Provides GL Accounts| JE_BILL
    Settings -.->|Provides GL Accounts| JE_PAY

    subgraph Phase 1: Receiving Goods
        PO[Purchase Order Approved] --> GRN[Goods Receipt Note GRN]
        GRN -->|Atomic Transaction| JE_GRN[Journal Entry: Inventory accrual]
        
        JE_GRN -->|Debit +| DR_INV["DR: ${invAcc}"]
        JE_GRN -->|Credit +| CR_ACCRUAL["CR: ${accrualAcc}"]
    end

    subgraph Phase 2: Invoice Matching
        CR_ACCRUAL --> AP_BILL[Vendor Sends Invoice]
        AP_BILL -->|Match to GRN| AP_RECORD[Create AP Invoice Table]
        AP_RECORD -->|Atomic Transaction| JE_BILL[Journal Entry: AP Recognition]
        
        JE_BILL -->|Debit -| DR_ACCRUAL["DR: ${accrualAcc}"]
        JE_BILL -->|Credit +| CR_AP["CR: ${apAcc}"]
    end

    subgraph Phase 3: Final Payment
        CR_AP --> PAY[Finance Executes Payment]
        PAY -->|Atomic Transaction| JE_PAY[Journal Entry: Bill Payment]
        
        JE_PAY -->|Debit -| DR_AP["DR: ${apAcc}"]
        JE_PAY -->|Credit -| CR_BANK["CR: ${bankAcc}"]
        
        DR_AP --> COA[COA Final Update]
        CR_BANK --> COA
    end
    
    %% Integrity Guard
    VH{Verify Hub}
    JE_GRN -.->|Monitors| VH
    JE_BILL -.->|Monitors| VH
    JE_PAY -.->|Monitors| VH`;
    }
  },
  sbus: {
    filename: "school_bus_pipeline.mermaid",
    code: async (supabase: SupabaseClient, companyId: string) => {
      // 1. Fetch active branches for the company
      const { data: branches } = await supabase
        .from('school_branches')
        .select('id, branch_name')
        .eq('is_active', true);

      // 2. Fetch ALL school bus settings (system uses cross-company fallback for branches)
      const { data: settings } = await supabase
        .from('school_bus_finance_settings')
        .select('branch_id, branch_gl_account_id, company_id');

      // 3. Fetch ALL chart of accounts to ensure cross-company GLs resolve
      const { data: coa } = await supabase
        .from('chart_of_accounts')
        .select('id, name');

      // 4. Fetch the global suspense/cash account to show Override Fallback
      const { data: globalSettings } = await supabase
        .from('finance_settings')
        .select('suspense_account_id, cash_account_id')
        .eq('company_id', companyId)
        .maybeSingle();

      const getAccountName = (id: string | null | undefined, fallback: string) => {
        if (!id) return fallback;
        const account = coa?.find(c => c.id === id);
        return account ? account.name : fallback;
      };

      const suspenseName = getAccountName(globalSettings?.suspense_account_id, "Suspense / Clearing Account");

      let mermaidStr = `graph TD
    Settings[(school_bus_finance_settings)]
    Settings -.->|Provides GL Accounts| JE_INV
    Settings -.->|Provides GL Accounts| ROUTER

    subgraph Phase 1: Mass Invoicing Monthly
        CRON[End of Month / Batch Trigger] -->|Generate Student Invoices| AR_INV[ar_invoices Table: Status Unpaid]
        AR_INV -->|Atomic Transaction| JE_INV[Journal Entry: Revenue Recognition]
        
        JE_INV -->|Debit +| DR_INV["DR: Trade Receivables Asset<br/><i>(from settings.trade_receivable_account_id)</i>"]
        JE_INV -->|Credit +| CR_INV["CR: School Bus Revenue<br/><i>(from settings.sbs_collection_account_id)</i>"]
    end

    subgraph Phase 2: Bank Reconciliation - Branch Level 5 Routing
        BANK[Bank Statement Upload] -->|Match to Student| PAY[Create ar_receipts Table]
        
        PAY --> ROUTER{Branch GL Routing Engine}
`;

      if (branches && branches.length > 0) {
        branches.forEach((branch, index) => {
          // Exact match for branch AND company
          let setting = settings?.find(s => s.branch_id === branch.id && s.company_id === companyId && s.branch_gl_account_id);
          
          if (!setting) {
            // Fallback 1: Cross-company branch settings (System behavior)
            setting = settings?.find(s => s.branch_id === branch.id && s.branch_gl_account_id);
          }
          if (!setting) {
            // Fallback 2: Company default (branch is null)
            setting = settings?.find(s => s.branch_id === null && s.company_id === companyId && s.branch_gl_account_id);
          }
          
          const bankAcc = coa?.find(c => c.id === setting?.branch_gl_account_id);
          const nodeId = `B_${branch.id.substring(0,6).replace(/-/g, '')}`;
          
          let label = '';
          if (bankAcc) {
            label = `DR: ${bankAcc.name} (Level 5 GL)<br/><i>(Connected to Branch: ${branch.branch_name})</i>`;
          } else {
            label = `DR: ❌ Not Connected (Level 5 GL)<br/><i>(Missing bank account for ${branch.branch_name})</i>`;
          }
          
          mermaidStr += `        ROUTER -->|If Branch = ${branch.branch_name}| ${nodeId}["${label}"]\n`;
          mermaidStr += `        ${nodeId} --> JE_PAY[Atomic Journal Entry]\n`;
        });
      } else {
        mermaidStr += `        ROUTER -->|No Branches Found| W_BANK["DR: ❌ No Branches Configured"]\n`;
        mermaidStr += `        W_BANK --> JE_PAY[Atomic Journal Entry]\n`;
      }
      
      mermaidStr += `
        %% The Runtime Override Path
        PAY -.->|Runtime Override Applied| OVERRIDE_NODE["DR: ${suspenseName}<br/><i>(Mapped dynamically via custom Bank/AR ID)</i>"]
        OVERRIDE_NODE -.-> JE_PAY

        JE_PAY -->|Credit -| CR_BANK_AR["CR: Trade Receivables Asset<br/><i>(from settings.trade_receivable_account_id)</i>"]
    end
    
    VH{Verify Hub Monitoring & DB Trigger}
    JE_INV -.->|Blocked if Invalid| VH
    JE_PAY -.->|Blocked if Invalid| VH
`;
      return mermaidStr;
    }
  },
  yutong: {
    filename: "yutong_operations_pipeline.mermaid",
    code: async (supabase: SupabaseClient, companyId: string) => {
      const { data: settings } = await supabase
        .from('sinotruck_finance_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      const { data: coa } = await supabase.from('chart_of_accounts').select('id, name');

      const getGL = (id: string | null | undefined, fallback: string) => {
        if (!id) return `❌ Not Connected (${fallback})`;
        const account = coa?.find(c => c.id === id);
        return account ? `${account.name} (Level 5 GL)` : `❌ Unknown Account`;
      };

      const bankAcc = getGL(settings?.default_bank_account_id, "Missing default_bank_account_id");
      const advLiab = getGL(settings?.customer_advance_account_id, "Missing customer_advance_account_id");
      const tradeRec = getGL(settings?.trade_receivable_account_id, "Missing trade_receivable_account_id");
      const revenueAcc = getGL(settings?.sales_revenue_account_id, "Missing sales_revenue_account_id");
      const lcBank = getGL(settings?.lc_bank_account_id, "Missing lc_bank_account_id");

      return `graph TD
    %% Global Settings Lookups
    Settings[(sinotruck_finance_settings)]
    Settings -.->|Provides GL Accounts| JE_ADV
    Settings -.->|Provides GL Accounts| JE_INV
    Settings -.->|Provides GL Accounts| JE_PURCH

    %% Phase 1: Advance Payment
    subgraph Phase 1: Quotation & Customer Advance
        Q[Quotation Approved] -->|Customer Pays Advance| ADV[Create Advance Payment Receipt]
        ADV -->|Atomic Transaction| JE_ADV[Journal Entry: Advance]
        
        JE_ADV -->|Debit +| DR_ADV["DR: ${bankAcc}"]
        JE_ADV -->|Credit +| CR_ADV["CR: ${advLiab}"]
        
        DR_ADV --> COA_ADV[Chart of Accounts Auto-Update]
        CR_ADV --> COA_ADV
    end

    %% Phase 2: Purchasing / LC
    subgraph Phase 2: Letter of Credit & Purchasing
        COA_ADV --> LC[Open Letter of Credit]
        LC -->|Atomic Transaction| JE_PURCH[Journal Entry: LC Liability]
        
        JE_PURCH -->|Debit +| DR_LC["DR: Inventory in Transit (System Default)"]
        JE_PURCH -->|Credit +| CR_LC["CR: ${lcBank}"]
    end

    %% Phase 3: Vehicle Delivery & Final Invoice
    subgraph Phase 3: Vehicle Delivery & Revenue
        JE_PURCH --> DELIV[Vehicle Handover]
        DELIV -->|Generate Final Invoice| JE_INV[Journal Entry: Revenue Recognition]
        
        JE_INV -->|Debit +| DR_INV["DR: ${tradeRec}"]
        JE_INV -->|Credit +| CR_INV["CR: ${revenueAcc}"]
        
        %% Auto Application of Advance
        JE_INV --> APPLY[Auto-Settle Advance against Invoice]
        APPLY --> JE_APPLY[Journal Entry: Settle Advance]
        JE_APPLY -->|Debit -| DR_APPLY["DR: ${advLiab}"]
        JE_APPLY -->|Credit -| CR_APPLY["CR: ${tradeRec}"]
    end
    
    %% Integrity Guard
    VH{Verify Hub Monitoring}
    JE_ADV -.->|Audits Missing| VH
    JE_INV -.->|Audits Missing| VH`;
    }
  },
  queue: {
    filename: "zero_downtime_queue_architecture.mermaid",
    code: `graph TD
    %% Global System Infrastructure
    subgraph Client Application [React Frontend]
        UI[User Action] --> MUT[Mutate Data via Supabase Client]
        MUT --> PENDING[Set UI to Optimistic State]
    end

    subgraph Database Layer [PostgreSQL]
        MUT -->|INSERT/UPDATE| TBL[(Business Tables)]
        TBL -->|PostgreSQL Trigger| TG[Database Trigger]
        TG -->|Create Job| QUEUE[(background_jobs Table)]
        
        QUEUE -->|NOTIFY channel| PG_NOTIFY[pg_notify Channel: 'job_created']
    end

    subgraph Worker Nodes [Edge Functions / RPC]
        PG_NOTIFY -->|Listen| WORKER[Edge Worker Node]
        WORKER -->|Lock Row| LOCK[Select FOR UPDATE SKIP LOCKED]
        
        LOCK -->|Process Payload| EXEC[Execute Business Logic / Third Party API]
        
        EXEC -->|Success| SUCCESS[Update Status = 'completed']
        EXEC -->|Failure| FAIL[Update Status = 'failed']
        
        FAIL -->|Retry Logic| RETRY{Max Retries Reached?}
        RETRY -->|No| REQUEUE[Increment Attempts, Schedule Next Run]
        RETRY -->|Yes| DLQ[Move to Dead Letter Queue / job_logs]
        
        SUCCESS -->|Archive| LOG[(job_logs Table)]
    end

    subgraph Monitoring & Recovery [System Health]
        CRON[pg_cron Nightly Trigger] --> ORPHAN[Find 'processing' jobs stuck > 1 hour]
        ORPHAN --> RESET[Reset Status to 'pending']
        
        FAIL --> ALERT[Send Slack/Email Alert to Admins]
    end`
  },
  magiya: {
    filename: "magiya_scraper_pipeline.mermaid",
    code: `graph TD
    %% Trigger Phase
    subgraph Phase 1: Cloud Execution
        GH[GitHub Actions Nightly Cron] -->|Trigger| NODE[Node.js Puppeteer Scraper]
    end

    %% Extraction & Resiliency Phase
    subgraph Phase 2: 3-Strike Resiliency Engine
        NODE -->|Attempt Extraction| MAGIYA[Magiya Partner Portal]
        MAGIYA -->|Success| EXT[Extract Passengers & PDF]
        MAGIYA -.->|Timeout / DOM Change| FAIL_1[Attempt Failed]
        
        FAIL_1 -->|Retry 1, 2, 3| NODE
        FAIL_1 -->|Exceeds 3 Retries| ALERT[(vh_system_alerts Table)]
        ALERT -->|Critical Alert| DASH[Verify Hub Dashboard]
    end

    %% Storage Phase
    subgraph Phase 3: Zero-Trust Database Persistence
        EXT -->|Save Passenger Rows| DB_PASS[(magiya_passenger_bookings)]
        EXT -->|Upload PDF| STORAGE[(Supabase Storage)]
        EXT -->|Save Report Meta| DB_REP[(magiya_daily_reports)]
        
        DB_REP -->|Set Status| PEND[status = 'pending_whatsapp']
    end

    %% Local Automation Phase
    subgraph Phase 4: Local Hub Automation
        PEND -->|Detected by Verify Hub| SWEEP[Verify Hub / MagiyaReports.tsx]
        
        SWEEP -->|Query for Conductor| DB_ALLOC[(driver_allocations)]
        DB_ALLOC -->|Return Conductor Phone| SWEEP
        
        SWEEP -->|API Call| WA_SERVER[Local WhatsApp Server:3000]
        WA_SERVER -->|Send Message & PDF| PHONE((Conductor WhatsApp))
        
        SWEEP -->|Update Status| COMP[status = 'completed']
        COMP --> DB_REP
    end`
  }
};
