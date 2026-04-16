# NCG FleetFlow — Full System Context

> **Last verified:** 2026-03-29  
> **Purpose:** Single source of truth for ALL system development. Read this FIRST before making any changes.  
> **This file is auto-read by agents before any work to prevent hallucination.**

---

## 1. PROJECT & DATABASE CONNECTION

| Key | Value |
|-----|-------|
| **Project Root** | `/Users/staff/Downloads/ncg new one/ncg-fleetflow` |
| **Framework** | React + TypeScript + Vite |
| **Client Config** | `src/integrations/supabase/client.ts` |
| **DB URL** | `import.meta.env.VITE_SUPABASE_URL` |
| **Actual DB** | `wwjpdszkmtnzshbulkon.supabase.co` (from `public-client.ts`) |
| **Types** | `src/integrations/supabase/types.ts` (~28,000 lines, auto-generated) |
| **MCP Access** | **NO** — MCP only sees `Garage-One` / `Garage-One-Staging`, NOT the actual project |

> **WARNING:** Any DB schema changes must be run manually via the Supabase SQL Editor. Never trust MCP results for this project.

---

## 2. SYSTEM MODULES OVERVIEW

### 2.1 Pages (75 total in `src/pages/`)

| Category | Pages |
|----------|-------|
| **Core Dashboard** | `Dashboard`, `TotalDashboard`, `ExecutiveDashboard`, `BranchDashboard`, `Index`, `Welcome` |
| **Fleet Operations** | `FleetManagement`, `FleetAnalytics`, `RealTimeTracking`, `DailyTrips`, `QuickTripsEntry`, `TripsAnalytics`, `DailyBusExpenses`, `RouteManagement`, `DriverAllocation`, `DriverTraining` |
| **Vehicle Sales** | `YutongQuotations`, `SinotruckQuotations`, `LightVehicleQuotations`, `VehicleInquiryHub` |
| **Finance & Accounting** | `Accounting`, `Budgeting`, `StaffAttendancePayroll` |
| **Maintenance** | `Maintenance`, `TyreManagement`, `TyreAnalytics` |
| **Insurance & Permits** | `Insurance`, `RoutePermits` |
| **Special Hire** | `SpecialHire`, `PublicSpecialHire` |
| **School Bus** | `SchoolBusService`, `SchoolStudentDatabase`, `SchoolPayments`, `GlobalSchoolPayments`, `GlobalSchoolImport`, `SchoolImportPage`, `SchoolPaymentImport`, `SchoolPaymentSettings`, `SchoolReceiptManagement`, `SchoolReports`, `SchoolBranchReports`, `SchoolRouteManagement` |
| **HR & Staff** | `StaffManagement`, `StaffPerformance`, `HolidayManagement` |
| **Customer & Vendor** | `CustomerManagement`, `CustomerPortal`, `VendorPortal` |
| **NSP** | `NSPDailySales`, `NSPSalesSummary` |
| **Documents** | `DocumentManager` |
| **Marketing** | `Marketing` |
| **Governance** | `GovernanceCalendar` |
| **Feedback** | `FeedbackModule`, `Complaints`, `PublicComplaint` |
| **System** | `Settings`, `SystemHealthDashboard`, `SystemIssueTracker`, `ScheduledTasks`, `ApiUsageMonitoring`, `SeasonalThemes` |
| **Auth** | `Auth`, `ResetPassword`, `AcceptInvite`, `Profile` |
| **Public** | `PublicYutongReport`, `PublicYutongSpreadsheet`, `PublicConductorUpload`, `PublicReceiptUpload`, `WhatsAppHub` |
| **Other** | `NotFound`, `InstallApp` |

### 2.2 Component Directories (40 in `src/components/`)

| Directory | Purpose |
|-----------|---------|
| **Vehicle Sales** | `yutong/` (100 files), `sinotruck/` (125 files), `lightvehicle/` (104 files) |
| **Finance** | `accounting/` |
| **Fleet** | `fleet/`, `trips/`, `trips-analytics/`, `driver-allocation/` |
| **Maintenance** | `maintenance/` |
| **School Bus** | `school/`, `school-bus/` |
| **Special Hire** | `special-hire/` |
| **HR** | `staff/` |
| **Customer** | `customer/`, `customer-portal/`, `vendor-portal/` |
| **NSP** | `nsp/`, `ncg-express/` |
| **Settings** | `settings/` |
| **Documents** | `documents/` |
| **Governance** | `governance/` |
| **Safety** | `safety/`, `accident/` |
| **Marketing** | `marketing/` |
| **Feedback** | `feedback/`, `complaints/`, `inquiries/` |
| **System** | `system-health/`, `issues/`, `ai/`, `flow-diagram/`, `seasonal/` |
| **Shared** | `shared/`, `ui/`, `layout/`, `auth/` |
| **Budgeting** | `budgeting/` |
| **Route Permits** | `route-permits/` |
| **Dashboard** | `dashboard/`, `executive/` |

### 2.3 Hooks (150 in `src/hooks/`)

#### Finance Hooks
`useAccountingData`, `useAccountingMutations`, `useAccountingAccess`, `useAdvanceDetails`, `useBankDeposits`, `useBankFees`, `useCashFlowData`, `useCashReconciliation`, `useChequeBooks`, `useCommissionFinance`, `useCommissions`, `useExpenseRequestFinance`, `useExpenseRequests`, `useFuelExpenseFinance`, `useFinanceApproval`, `useFinanceAutomationEngine`, `useGLIntegrityScanner`, `useInsuranceFinance`, `useInterBankTransfer`, `useLeasingFinance`, `useMaintenanceFinance`, `useNCGExpressFinance`, `usePayrollFinance`, `usePettyCash`, `useRoutePermitFinance`, `useSalesOrders`, `useSchoolBusFinance`, `useSpecialHireFinance`, `useVehicleSalesFinance`, `useTemporaryAccounts`, `useNumbering`

#### Vehicle Sales Hooks (per module x3)
Per module pattern: `use{Module}OrderManagement`, `use{Module}OrderInvoiceManagement`, `use{Module}InvoiceManagement`, `use{Module}FinanceManagement`, `use{Module}CashReceipts`, `use{Module}InvoiceSignatures`, `use{Module}Signatures`, `use{Module}QuotationCards`, `use{Module}SpreadsheetData`, `use{Module}ShipmentGroupManagement`, `use{Module}SupplierManagement`, `use{Module}DeliveryManagement`, `use{Module}LogisticsManagement`, `use{Module}AfterSalesManagement`, `use{Module}VehicleDataManagement`, `use{Module}OldSalesManagement`, `use{Module}ExecutiveReport`

#### Fleet & Operations Hooks
`useFleetAnalytics`, `useFleetFinancials`, `useFleetMasterSpreadsheet`, `useBusMasterData`, `useBusCategories`, `useDailyBusExpenses`, `useDailyBusGroupedTrips`, `useCrewGroupedTrips`, `useTripsAnalytics`, `usePostTripAdjustment`, `useTyreManagement`

#### System/Admin Hooks
`useCompanyAccess`, `useCompanyFilteredData`, `useCompanyMutations`, `usePagePermissions`, `useSystemHealthChecks`, `useSystemIssues`, `useBusinessFlowTests`, `useDataQualityChecks`, `useDocumentApprovals`, `useDocumentFlow`, `useDocumentManagement`, `useDocumentTemplates`

---

## 3. DATABASE SCHEMA

### 3.1 Table Count by Domain (~200 tables)

| Domain | Tables | Examples |
|--------|--------|---------|
| **Accounting & GL** | ~30 | `journal_entries`, `journal_entry_lines`, `chart_of_accounts`, `financial_periods`, `gl_settings`, `gl_posting_log`, `cashbook_entries`, `fund_transfers` |
| **AR (Receivable)** | ~10 | `ar_invoices`, `ar_invoice_lines`, `ar_receipts`, `ar_receipt_allocations`, `ar_credit_notes`, `ar_ageing_buckets`, `ar_bad_debt_provisions`, `ar_reconciliations` |
| **AP (Payable)** | ~10 | `ap_invoices`, `ap_invoice_lines`, `ap_payments`, `ap_payment_lines`, `ap_debit_notes`, `ap_ageing_buckets`, `ap_reconciliations` |
| **Banking** | ~8 | `bank_accounts`, `bank_transactions`, `bank_reconciliations`, `bank_reconciliation_items`, `bank_fee_charges`, `bank_statement_imports`, `inter_bank_transfers`, `cheque_books`, `cheque_register` |
| **Fixed Assets** | ~8 | `fixed_assets`, `asset_categories`, `asset_depreciation_schedule`, `asset_disposals`, `asset_maintenance_logs`, `asset_maintenance_teams`, `asset_revaluations`, `asset_transfers` |
| **Budgeting** | ~6 | `budgets`, `budget_line_items`, `budget_departments`, `budget_approvals`, `budget_revisions`, `budget_templates` |
| **Fleet/Buses** | ~15 | `buses`, `bus_categories`, `bus_types`, `bus_loans`, `bus_loan_payments`, `bus_tyres`, `bus_fuel_readings`, `bus_daily_mileage`, `bus_service_alerts`, `fleet_master_roster`, `fleet_analytics_daily` |
| **Trips** | ~6 | `daily_trips`, `completed_trips`, `daily_bus_expenses`, `conductor_submissions` |
| **Yutong** | ~35 | `yutong_orders`, `yutong_quotations`, `yutong_customers`, `yutong_customer_payments`, `yutong_invoice_records`, `yutong_invoice_documents`, `yutong_finance_settings`, `yutong_shipments`, etc. |
| **Sinotruk** | ~25 | `sinotruck_orders`, `sinotruck_quotations`, `sinotruck_customers`, `sinotruck_customer_payments`, `sinotruck_invoice_records`, `sinotruck_finance_settings`, etc. |
| **Light Vehicle** | ~25 | `lightvehicle_orders`, `lightvehicle_quotations`, `lightvehicle_customers`, `lightvehicle_customer_payments`, `lightvehicle_invoice_records`, `lightvehicle_finance_settings`, etc. |
| **Inventory** | ~10 | `items`, `item_categories`, `item_stock`, `batch_numbers`, `bin_locations`, `warehouses`, `composite_items`, `goods_receipt_notes`, `goods_receipt_lines`, `grn_lines`, `landing_cost_*` |
| **Procurement** | ~5 | `accounts_payable`, `vendors`, `vendor_categories`, `vendor_bank_accounts`, `vendor_performance`, `vendor_portal_*` |
| **Customers** | ~8 | `customers`, `customer_categories`, `customer_price_lists`, `customer_portal_access`, `customer_support_requests`, `accounts_receivable` |
| **HR/Staff** | ~6 | `user_roles`, `user_company_access`, `user_page_permissions`, `user_activity_log` |
| **Insurance** | ~3 | `insurance_records`, `accident_records`, `accident_documents`, `accident_audit_trail` |
| **Documents** | ~8 | `documents`, `document_storage`, `document_templates`, `document_template_types`, `document_approvals`, `document_versions` |
| **Special Hire** | ~3 | `hire_rate_cards`, `vehicle_inquiries` |
| **School Bus** | ~4 | (managed via school-bus hooks) |
| **Marketing** | ~8 | `marketing_projects`, `marketing_tasks`, `marketing_task_categories`, `marketing_job_requests`, `marketing_social_*`, `marketing_team_members`, `marketing_credit_settings` |
| **Governance** | ~5 | `governance_items`, `governance_occurrences`, `governance_audit_log`, `governance_notifications` |
| **Feedback** | ~6 | `feedback_items`, `feedback_comments`, `feedback_complaints`, `feedback_escalations`, `feedback_meetings`, `feedback_levels` |
| **System** | ~12 | `api_keys`, `api_usage_logs`, `approval_workflows`, `auto_posting_rules`, `workflow_rules`, `webhook_endpoints`, `webhook_deliveries`, `data_archive_policies` |
| **Tax** | ~4 | `vat_returns`, `wht_certificates`, `wht_certificate_details` |
| **Misc** | ~10 | `companies`, `locations`, `currencies`, `exchange_rates`, `holidays`, `cost_centers`, `unit_of_measures` |

### 3.2 RPC Functions (28 declared in types.ts)
`apply_payment_to_invoices`, `calculate_expenses_from_details`, `calculate_income_from_details`, `calculate_sla_due_date`, `create_or_get_sph_customer`, `force_delete_coa_for_company`, `generate_entity_number`, `generate_lightvehicle_invoice_no`, `generate_next_lightvehicle_version_number`, `generate_next_version_number`, `generate_next_yutong_version_number`, `generate_sbs_invoice_number`, `generate_sinotruck_invoice_no`, `generate_sph_ar_invoice_number`, `generate_sph_ar_receipt_number`, `generate_yutong_invoice_no`, `get_cron_jobs`, `get_liability_account_setting`, `get_next_cheque_number`, `get_user_page_permissions`, `get_user_roles`, `has_any_role`, `has_page_access`, `has_role`, `increment_name_suggestion`, `process_gl_posting`, `update_liability_account_setting`, `update_trip_status_with_adjustments`, `verify_admission_number`

---

## 4. FINANCE ARCHITECTURE

### 4.1 Finance Hub Files
| File | Purpose |
|------|---------|
| `useVehicleSalesFinance.ts` | Centralized GL for all 3 vehicle modules |
| `useNCGExpressFinance.ts` | NCG Express bus module finance |
| `useSchoolBusFinance.ts` | School bus module finance |
| `useSpecialHireFinance.ts` | Special hire module finance |
| `useExpenseRequestFinance.ts` | Staff expense requests → GL |
| `useFuelExpenseFinance.ts` | Fuel expenses → GL |
| `useInsuranceFinance.ts` | Insurance → GL |
| `useMaintenanceFinance.ts` | Maintenance costs → GL |
| `usePayrollFinance.ts` | Payroll → GL |
| `useRoutePermitFinance.ts` | Route permits → GL |
| `useLeasingFinance.ts` | Leasing/LC finance |
| `useCommissionFinance.ts` | Sales commissions → GL |
| `lib/gl-posting-utils.ts` | Core GL posting utility (used by AR module) |

### 4.2 Key Constants
- **NCG Holding ID:** `f40b0a9d-ae5b-41b3-9188-535ae94c9020`
- **Business Unit Codes:** `YUT` (Yutong), `SNT` (Sinotruk), `LTV` (Light Vehicle)

### 4.3 GL Posting Patterns
| Event | DR | CR |
|-------|----|----|
| Customer Advance Payment | Bank | Customer Advance |
| AR Invoice (Revenue) | Trade Receivable | Sales Revenue |
| AR Invoice (with VAT) | Trade Receivable | Sales Revenue + VAT Output |
| Advance Offset | Customer Advance | Trade Receivable |
| AP Invoice | Expense/Asset | Accounts Payable |
| AP Payment | Accounts Payable | Bank |
| Expense Request | Expense Account | Petty Cash / Bank |
| Fuel Expense | Fuel Expense | Cash / Bank |

---

## 5. VEHICLE SALES ARCHITECTURE

### 5.1 Invoice Types
| Type | Prefix | Description |
|------|--------|-------------|
| Direct Customer Invoice | `CI-` | Full amount to customer |
| Proforma Invoice | `PI-` | For bank/leasing company |
| Tax Invoice (SL Govt) | `TI-` | 18% VAT breakdown |

### 5.2 Invoice Number Prefixes
| Module | Pattern | Example |
|--------|---------|---------|
| Yutong | `NCGH-YT-{CI/PI/TI}-XXXXXX` | `NCGH-YT-CI-000001` |
| Sinotruk | `NCGH-ST-{CI/PI/TI}-XXXXXX` | `NCGH-ST-PI-000001` |
| Light Vehicle | `NCGH-LV-XXXXXX` | `NCGH-LV-000001` |

### 5.3 Key Tables Per Module
`{m}_quotations`, `{m}_orders`, `{m}_customers`, `{m}_customer_payments`, `{m}_payment_schedules`, `{m}_invoice_records`, `{m}_invoice_documents`, `{m}_invoice_signatures`, `{m}_finance_settings`, `{m}_cash_receipts`, `{m}_models/bus_models`, `{m}_model_images`, `{m}_addons/quotation_addons`, `{m}_customization_options`, `{m}_shipment_groups`, `{m}_delivery_orders`, `{m}_vehicle_records`, `{m}_vehicle_data_sheets`

---

## 6. KNOWN ISSUES

### 6.1 Naming Inconsistency (Sinotruk)
- Component files: mix of `Sinotruk` and `Sinotruck` naming
- DB tables: always `sinotruck_*`
- Hook files: both `useSinotruk*.ts` and `useSinotruck*.ts` exist

### 6.2 DB Verification Queries
Run these in the Supabase SQL Editor to verify infrastructure:
```sql
-- Check RPC functions
SELECT proname FROM pg_proc 
WHERE proname IN ('generate_yutong_invoice_no', 'generate_sinotruck_invoice_no', 'generate_lightvehicle_invoice_no')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Check storage buckets
SELECT name FROM storage.buckets 
WHERE name IN ('yutong-invoices', 'sinotruck-invoices', 'lightvehicle-invoices');

-- Check finance settings
SELECT 'yutong' as m, count(*) FROM yutong_finance_settings
UNION ALL SELECT 'sinotruck', count(*) FROM sinotruck_finance_settings
UNION ALL SELECT 'lightvehicle', count(*) FROM lightvehicle_finance_settings;
```

### 6.3 Migration Script
If anything is missing: `supabase/migrations/vehicle_invoice_infrastructure.sql`

---

## 7. LIB DIRECTORY (PDF Generators & Utilities)

| File | Purpose |
|------|---------|
| `yutong-order-invoice-generator.ts` | Yutong invoice PDF generation |
| `yutong-invoice-generator.ts` | Legacy Yutong invoice PDF |
| `sinotruck-order-invoice-generator.ts` | Sinotruk invoice PDF generation |
| `lightvehicle-order-invoice-generator.ts` | Light Vehicle invoice PDF generation |
| `sri-lanka-tax-invoice-generator.ts` | Sri Lanka tax invoice template |
| `invoice-generator.ts` | General invoice utility |
| `gl-posting-utils.ts` | Core GL posting utility |
