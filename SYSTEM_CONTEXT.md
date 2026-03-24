# NCG FleetONE — AI System Context (Anti-Hallucination Memory)

> **Purpose:** This file is the single source of truth for any AI tool (Lovable, Antigravity, Cursor, etc.) working on this codebase. Read this FIRST before making any changes.
> **Last Updated:** 2026-03-24

---

## 1. System Overview

**NCG FleetONE** is a modular fleet management & ERP system for NCG Holdings (Sri Lanka).

| Tech | Details |
|------|---------|
| **Frontend** | React 18 + TypeScript + Vite |
| **UI Library** | shadcn/ui (Radix primitives) + Lucide icons |
| **Styling** | Tailwind CSS |
| **Backend** | Supabase (PostgreSQL + Auth + Edge Functions + Storage) |
| **State** | TanStack React Query (server state), React Context (client state) |
| **Routing** | React Router v6 |
| **Charts** | Recharts |
| **PDF** | jsPDF + html2canvas |
| **Currency** | LKR (Sri Lankan Rupees) — always format with `Intl.NumberFormat` |

---

## 2. Architecture Rules (MUST FOLLOW)

### ⚠️ Critical Rules — Violating These Causes Bugs

1. **Multi-Company Isolation**: ALL Supabase queries MUST include `company_id` filter. Use `useCompany()` context to get `selectedCompanyId` and `getEffectiveCompanyId()`.

2. **GL Posting**: When creating AR/AP transactions, auto-GL posting is handled inside the mutation hooks (`useAccountingMutations.ts`). Do NOT create separate GL posting logic — it's already built in.

3. **Document Numbers**: Use `useNumbering()` hook for sequential document numbers (INV-0001, REC-0001, etc.). Never hardcode or generate numbers manually.

4. **Business Unit Code**: Sub-companies tag data with `business_unit_code` (SBO, YUT, LVH, etc.) for consolidated GL reporting. Always pass this through.

5. **Build Memory**: Production builds require `NODE_OPTIONS="--max-old-space-size=4096"` due to 6,500+ modules.

6. **GitHub PAT**: The current PAT lacks `workflow` scope — CANNOT push changes to `.github/workflows/` files.

### ✅ Patterns to Follow

- **New pages**: Add route in `App.tsx`, create page in `src/pages/`, components in `src/components/<module>/`
- **New hooks**: Place in `src/hooks/use<Name>.ts`
- **Database queries**: Use TanStack `useQuery` with proper query keys for caching
- **Mutations**: Use TanStack `useMutation` with `queryClient.invalidateQueries` on success
- **Toasts**: Use `toast` from `sonner` (imported as `toast`)
- **Icons**: Use `lucide-react` — never install other icon packages

---

## 3. Module Map (74 Pages, 125 Hooks)

### Core Finance (Accounting Module)
| Feature | Page | Key Hook | Tables |
|---------|------|----------|--------|
| Chart of Accounts | Accounting | useAccountingData | `chart_of_accounts` |
| Journal Entries | Accounting | useAccountingMutations | `journal_entries`, `journal_entry_lines` |
| AR Invoices | Accounting | useCreateARInvoice | `ar_invoices`, `ar_invoice_lines` |
| AR Receipts | Accounting | useCreateARReceipt | `ar_receipts`, `ar_receipt_allocations` |
| AR Credit Notes | Accounting | useCreateARCreditNote | `ar_credit_notes` |
| AP Invoices | Accounting | useCreateAPInvoice | `ap_invoices`, `ap_invoice_lines` |
| AP Payments | Accounting | useCreateAPPayment | `ap_payments`, `ap_payment_allocations` |
| AP Debit Notes | Accounting | useCreateAPDebitNote | `ap_debit_notes` |
| Bank Reconciliation | Accounting | useBankReconciliation | `bank_accounts`, `bank_transactions` |
| Fund Transfers | Accounting | useCreateFundTransfer | `fund_transfers` |
| Fixed Assets | Accounting | useCreateFixedAsset | `fixed_assets` |
| Budgeting | Budgeting | useAccountingData | `budgets`, `budget_lines` |
| WHT Certificates | Accounting | useCreateWHTCertificate | `wht_certificates` |

### Operations Modules
| Module | Page(s) | Key Hook(s) |
|--------|---------|-------------|
| School Bus Service | SchoolBusService, SchoolRouteManagement, SchoolPayments | useSchoolBusFinance, useSchoolBusExpense |
| Special Hire | SpecialHire | useSpecialHireFinance, useRealtimeSpecialHire |
| Public Bus (NSP) | NSPDailySales, NSPSalesSummary | useNSPSalesAnalytics |
| Daily Trips | DailyTrips, QuickTripsEntry | useCrewGroupedTrips |
| Yutong Bus Sales | YutongQuotations | useYutongOrderManagement, useYutongFinanceManagement |
| Sinotruck Sales | SinotruckQuotations | useSinotrukOrderManagement |
| Light Vehicle Sales | LightVehicleQuotations | useLightVehicleOrderManagement |
| NCG Express | (embedded) | useNCGExpressFinance |

### Fleet & HR
| Module | Page(s) | Key Hook(s) |
|--------|---------|-------------|
| Fleet Management | FleetManagement, FleetAnalytics | useFleetAnalytics, useBusMasterData |
| Maintenance | Maintenance | useMaintenanceFinance, useAssetMaintenance |
| Tyre Management | TyreManagement, TyreAnalytics | useTyreManagement |
| Insurance | Insurance | useInsuranceFinance |
| Route Permits | RoutePermits | useRoutePermitFinance |
| Staff / Payroll | StaffManagement, StaffAttendancePayroll | useStaffRegistry, usePayrollFinance |
| Driver Allocation | DriverAllocation | (embedded) |

### System & Settings
| Module | Page(s) | Key Hook(s) |
|--------|---------|-------------|
| Dashboard | Dashboard, TotalDashboard | useDashboardAnalytics |
| Executive Dashboard | ExecutiveDashboard | useExecutiveDashboard |
| Settings | Settings | useAccountingData |
| System Health | SystemHealthDashboard | useSystemHealthChecks |
| System Issues | SystemIssueTracker | useSystemIssues, usePerformanceGuardian |
| Document Management | DocumentManager | useDocumentManagement |
| Customer Portal | CustomerPortal | useCustomerData |
| Vendor Portal | VendorPortal | (embedded) |

---

## 4. Auto-GL Posting Rules

These transactions **automatically create journal entries** — DO NOT add duplicate GL logic:

| Transaction | Auto GL Entry | Hook |
|-------------|---------------|------|
| AR Invoice | DR Trade Receivable / CR Sales Revenue + Tax Payable | `useCreateARInvoice` |
| AR Receipt | DR Bank / CR Trade Receivable | `useCreateARReceipt` |
| AR Receipt (Advance) | DR Bank / CR Customer Advance | `useCreateARReceipt` |
| AR Credit Note | DR Sales Revenue / CR Trade Receivable | `useCreateARCreditNote` |
| AP Invoice | DR Expense(s) / CR Trade Payable + Input Tax | `useCreateAPInvoice` |
| AP Payment (on approve) | DR Trade Payable / CR Bank | `useApproveAPPayment` |
| AP Debit Note | DR Trade Payable / CR Expense | `useCreateAPDebitNote` |
| Fund Transfer | DR Target Bank / CR Source Bank | `useCreateFundTransfer` |
| Asset Depreciation | DR Depreciation Expense / CR Accumulated Depreciation | `useRunDepreciation` |
| Stock Adjustment (on approve) | DR/CR Inventory + COGS | `useApproveStockAdjustment` |

**GL Settings Required** (in `gl_settings` table):
- `trade_receivable_account_id`, `sales_revenue_account_id`, `tax_payable_account_id`
- `trade_payable_account_id`, `default_expense_account_id`, `input_tax_account_id`
- Each bank account must have `gl_account_id` linked

---

## 5. Component Directory Map (40 folders)

```
src/components/
├── accounting/        # AR, AP, JE, bank, fixed assets, reconciliation
├── ai-chatbot/        # AI chat widget
├── auth/              # Login, registration
├── budgeting/         # Budget templates, forecasting
├── complaints/        # Public complaint system
├── customer-portal/   # Customer-facing portal
├── customer/          # Customer management
├── dashboard/         # Dashboard widgets, KPI cards
├── documents/         # Document management
├── driver-allocation/ # Driver assignment to routes
├── executive/         # Executive dashboards
├── feedback/          # Customer feedback
├── fleet/             # Vehicle management
├── flow-diagram/      # System flow visualization
├── governance/        # Compliance, governance calendar
├── inquiries/         # Vehicle inquiry hub
├── issues/            # Issue tracking
├── layout/            # App shell, sidebar, header
├── lightvehicle/      # Light vehicle sales module
├── maintenance/       # Vehicle maintenance
├── marketing/         # Marketing features
├── ncg-express/       # NCG Express courier service
├── nsp/               # NSP daily sales
├── route-permits/     # Route permit management
├── school-bus/        # School bus admin
├── school/            # School bus operations (routes, finance, expenses)
├── seasonal/          # Seasonal themes
├── settings/          # App settings, GL settings, categories
├── shared/            # Shared/reusable components
├── sinotruck/         # Sinotruck vehicle sales
├── special-hire/      # Special hire management
├── staff/             # Staff management
├── system-health/     # System health monitoring
├── system/            # Performance Guardian
├── trips/             # Trip management
├── trips-analytics/   # Trip analytics
├── ui/                # shadcn/ui base components
├── vendor-portal/     # Vendor-facing portal
└── yutong/            # Yutong bus sales (orders, invoices, spreadsheets)
```

---

## 6. Key Utility Libraries

| File | Purpose |
|------|---------|
| `src/lib/gl-posting-utils.ts` | GL journal entry creation helpers |
| `src/lib/invoice-generator.ts` | HTML invoice generation |
| `src/lib/document-template-seeder.ts` | 12 document templates (AR/AP/PO/GRN/etc.) |
| `src/lib/document-template-utils.ts` | Template variable replacement |
| `src/lib/bank-statement-processor.ts` → `src/utils/` | Bank statement CSV parsing |
| `src/lib/yutong-order-invoice-generator.ts` | Yutong order invoice HTML |
| `src/lib/sinotruck-order-invoice-generator.ts` | Sinotruck order invoice HTML |
| `src/lib/lightvehicle-order-invoice-generator.ts` | Light vehicle order invoice HTML |
| `src/lib/advance-details-generator.ts` | Special hire advance details |
| `src/lib/pdf-multi-page.ts` | Multi-page PDF generation |

---

## 7. Common Pitfalls (DO NOT)

| ❌ Don't | ✅ Do Instead |
|----------|--------------|
| Create new GL posting logic | Use existing auto-GL in `useAccountingMutations.ts` |
| Hardcode document numbers | Use `useNumbering()` hook |
| Query without `company_id` | Always filter by `selectedCompanyId` |
| Use `fetch()` for Supabase | Use `supabase` client from `@/integrations/supabase/client` |
| Install new UI component libs | Use existing shadcn/ui components in `src/components/ui/` |
| Use `any` type in TypeScript | Define proper interfaces |
| Create duplicate hook names | Check existing 125 hooks first |
| Touch `.github/workflows/` | PAT lacks workflow scope — edit on GitHub directly |
| Run `npm run build` without memory | Set `NODE_OPTIONS="--max-old-space-size=4096"` |
| Use `console.log` for errors | Use `toast.error()` for user-facing, `console.warn` for dev |

---

## 8. Database Schema Quick Reference

### Core Tables
- `companies`, `company_users` — Multi-company system
- `chart_of_accounts` — COA tree with `parent_id`
- `journal_entries`, `journal_entry_lines` — GL postings
- `gl_settings` — Default account mappings per company
- `accounting_periods` — Fiscal periods

### AR Suite
- `customers`, `customer_categories`
- `ar_invoices`, `ar_invoice_lines`
- `ar_receipts`, `ar_receipt_allocations`
- `ar_credit_notes`

### AP Suite
- `vendors`, `vendor_categories`
- `ap_invoices`, `ap_invoice_lines`
- `ap_payments`, `ap_payment_allocations`
- `ap_debit_notes`
- `wht_certificates`

### Procurement
- `purchase_requisitions`, `purchase_requisition_lines`
- `purchase_orders`, `purchase_order_lines`
- `goods_receipts`, `goods_receipt_items`

### Banking
- `bank_accounts`, `bank_transactions`
- `bank_reconciliations`, `bank_reconciliation_items`
- `fund_transfers`
- `cheque_register`

### Operations
- `buses`, `bus_categories`, `bus_sub_categories`
- `routes`, `trips`, `daily_bus_expenses`
- `school_routes`, `school_students`, `school_payments`
- `special_hires`, `special_hire_expenses`
- `yutong_quotations`, `yutong_orders`
- `sinotruck_quotations`, `sinotruck_orders`

### HR
- `staff_members`, `staff_attendance`
- `payroll_entries`, `leave_requests`

### System
- `system_issues`, `audit_logs`
- `document_templates`, `document_numbers`
- `notifications`

---

## 9. Git & Deployment

| Item | Details |
|------|---------|
| Main Repo | `NCGHoldings/FleetONE` (GitHub, private) |
| Lovable Repo | `globallyceum25-dot/ncg-fleetone` |
| Branch | `main` only |
| CI | GitHub Actions — lint + type check on push |
| Deploy | Manual via GitHub Actions → SSH to VPS (`146.190.6.188`) |
| Production URL | `fleetone.ncg.lk` |
| Supabase Project | Connected via `.env` |

---

## 10. File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Pages | PascalCase | `SchoolBusService.tsx` |
| Components | PascalCase | `ARInvoiceForm.tsx` |
| Hooks | camelCase with `use` prefix | `useSchoolBusFinance.ts` |
| Utils/Lib | kebab-case | `gl-posting-utils.ts` |
| Types | PascalCase with `I` or `T` prefix | `IInvoice`, `TPaymentMethod` |

---

**This file should be updated whenever major architectural changes are made.**
