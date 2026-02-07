
# NCG FleetFlow Finance ERP - Gap Closure & Development Continuation Plan

## Current Implementation Status Assessment

### COMPLETED (Phase 1 & 2 - Partial)

| Component | Status | Notes |
|-----------|--------|-------|
| Customer Portal Page | DONE | `/customer-portal` route with 5 tabs |
| Portal Login (OTP) | DONE | `PortalLogin.tsx` with email/OTP flow |
| Portal Dashboard | DONE | `PortalDashboard.tsx` with account overview |
| Invoice History | DONE | `InvoiceHistory.tsx` with PDF download |
| Make Payment UI | DONE | `MakePayment.tsx` - **BUT no payment gateway** |
| Account Statement | DONE | `AccountStatement.tsx` with transaction history |
| Support Requests | DONE | `SupportRequests.tsx` for help desk queries |
| Automation Module | DONE | Added to Finance ERP as module tab |
| Recurring Invoices View | DONE | `RecurringInvoicesView.tsx` - **BUT no execution engine** |
| Payment Reminder Rules | DONE | `PaymentReminderRulesView.tsx` - **BUT no execution** |
| Workflow Rules View | DONE | `WorkflowRulesView.tsx` - **BUT no trigger engine** |
| Scheduled Tasks View | DONE | `ScheduledTasksView.tsx` - **BUT no cron runner** |
| Database Tables | DONE | All automation tables created with RLS |

### NOT IMPLEMENTED (Critical Gaps)

| Component | Priority | Impact |
|-----------|----------|--------|
| Payment Gateway (Stripe) | CRITICAL | Customers cannot pay online |
| Recurring Invoice Execution | CRITICAL | Automation doesn't actually run |
| Payment Reminder Execution | HIGH | AR reminders don't send |
| Workflow Rule Engine | HIGH | Field updates/webhooks don't trigger |
| Scheduled Task Runner | HIGH | Cron jobs don't execute |
| Report Builder | MEDIUM | No custom report creation |
| Cash Flow Forecasting | MEDIUM | No predictive analytics |
| Warehouse Management UI | MEDIUM | No bin/location tracking |
| Price Lists | MEDIUM | No customer-specific pricing |
| Vendor Portal | LOW | Vendors can't self-serve |

---

## Development Continuation Plan

### PHASE 1B: Complete Customer Experience (Payment Gateway)

**Objective:** Enable online payments through Stripe integration

#### 1. Stripe Integration Setup

Create Settings component for Stripe configuration:
- Settings -> Payment Gateways tab in Finance ERP
- Store Stripe keys securely (via secrets)
- Test/Live mode toggle

#### 2. Payment Processing Edge Function

Create edge function to handle payments:
```
supabase/functions/process-stripe-payment/index.ts
```
- Create Stripe checkout session
- Handle payment intent
- Process webhooks for reconciliation

#### 3. Update MakePayment Component

Modify existing component to:
- Call Stripe checkout when "Pay Now" clicked
- Show payment status updates
- Auto-create AR Receipt on successful payment

#### 4. Payment Link Generation

Add feature to generate shareable payment links:
- Store in `payment_links` table
- Expiration handling
- Email integration for sending links

**Files to Create/Modify:**
- `src/components/accounting/settings/PaymentGatewaySettings.tsx` (NEW)
- `supabase/functions/process-stripe-payment/index.ts` (NEW)
- `supabase/functions/stripe-webhook/index.ts` (NEW)
- `src/components/customer-portal/MakePayment.tsx` (MODIFY)
- Add Payment Gateways tab to Settings module

---

### PHASE 2B: Complete Automation Engine (Execution Layer)

**Objective:** Make automation rules actually execute

#### 1. Recurring Invoice Generator

Create edge function to generate invoices:
```
supabase/functions/process-recurring-invoices/index.ts
```
- Query `recurring_invoices` where `next_run_date <= today` and `is_active = true`
- Create AR Invoice from template
- Update `next_run_date` based on frequency
- Optionally send email with invoice PDF

#### 2. AR/AP Payment Reminder Processor

Create edge function for payment reminders:
```
supabase/functions/process-payment-reminders/index.ts
```
- Query `payment_reminder_rules` for active rules
- Find matching AR/AP invoices based on trigger (before/on/after due)
- Send email notifications using Resend
- Log reminder in `payment_reminder_log` table

#### 3. Workflow Rule Engine

Create edge function for workflow triggers:
```
supabase/functions/execute-workflow-rules/index.ts
```
- Support trigger events: invoice_created, payment_received, order_confirmed
- Execute actions: email_alert, field_update, webhook
- Log execution in `workflow_execution_log` table

#### 4. Scheduled Task Runner

Create master cron function:
```
supabase/functions/run-scheduled-tasks/index.ts
```
- Check `scheduled_tasks` table for due tasks
- Execute task based on type (recurring_invoice, reminder, report)
- Update last_run and next_run timestamps

#### 5. Cron Job Configuration

Set up Supabase cron extensions or external scheduler to call:
- `process-recurring-invoices` - Daily at 6 AM
- `process-payment-reminders` - Daily at 9 AM
- `run-scheduled-tasks` - Hourly

**Files to Create:**
- `supabase/functions/process-recurring-invoices/index.ts` (NEW)
- `supabase/functions/process-payment-reminders-ar/index.ts` (NEW)
- `supabase/functions/execute-workflow-rules/index.ts` (NEW)
- `supabase/functions/run-scheduled-tasks/index.ts` (NEW)

---

### PHASE 3: Advanced Reporting (3-4 weeks)

**Objective:** Enable custom report creation and forecasting

#### 1. Report Builder Component

Create drag-drop report designer:
```
src/components/accounting/reports/ReportBuilder.tsx
```
- Field selector from available tables
- Filter condition builder
- Grouping and aggregation
- Column ordering
- Preview and save

#### 2. Cash Flow Forecasting

Enhance existing CashFlowView:
```
src/components/accounting/reports/CashFlowForecastView.tsx
```
- Project AR collections based on payment terms
- Project AP payments based on due dates
- Bank balance projections for 30/60/90 days
- Scenario modeling (optimistic/pessimistic)

#### 3. Report Scheduler

Add scheduling capability:
```
src/components/accounting/reports/ReportSchedulerView.tsx
```
- Select report to schedule
- Set frequency (daily/weekly/monthly)
- Configure recipients
- Format selection (PDF/Excel)

**Files to Create:**
- `src/components/accounting/reports/ReportBuilder.tsx` (NEW)
- `src/components/accounting/reports/CashFlowForecastView.tsx` (NEW)
- `src/components/accounting/reports/ReportSchedulerView.tsx` (NEW)
- Database: `custom_reports`, `report_schedules` tables

---

### PHASE 4: Advanced Inventory (3-4 weeks)

**Objective:** Multi-warehouse and pricing capabilities

#### 1. Warehouse Management

Create warehouse configuration:
```
src/components/accounting/inventory/WarehouseManagementView.tsx
```
- Warehouse list with addresses
- Bin/location definition per warehouse
- Stock transfer between warehouses

#### 2. Price Lists

Create customer-specific pricing:
```
src/components/accounting/inventory/PriceListsView.tsx
```
- Price list definition
- Customer group assignment
- Date-effective pricing
- Volume discounts

#### 3. Composite Items

Create kit/assembly management:
```
src/components/accounting/inventory/CompositeItemsView.tsx
```
- BOM (Bill of Materials) definition
- Auto-deduction on sale
- Assembly costing

**Files to Create:**
- `src/components/accounting/inventory/WarehouseManagementView.tsx` (NEW)
- `src/components/accounting/inventory/PriceListsView.tsx` (NEW)
- `src/components/accounting/inventory/CompositeItemsView.tsx` (NEW)
- Add tabs to Inventory module in Accounting.tsx

---

### PHASE 5: External Integration Hub (4-6 weeks)

**Objective:** Third-party connections and vendor self-service

#### 1. Vendor Portal

Create separate public page:
```
src/pages/VendorPortal.tsx
src/components/vendor-portal/
```
- Vendor login (OTP based)
- View POs and acknowledge
- Submit invoices
- Track payment status

#### 2. Bank Feed Integration

Research and implement bank connection:
- Partner with aggregator (Plaid, Salt Edge)
- Auto-import transactions
- Matching rules configuration

#### 3. API & Webhooks Settings

Create developer interface:
```
src/components/accounting/settings/APIWebhooksSettings.tsx
```
- API key generation
- Webhook endpoint configuration
- Event log viewer

---

## Implementation Priority Matrix

| Priority | Phase | Component | Effort | Business Impact |
|----------|-------|-----------|--------|-----------------|
| P0 | 1B | Stripe Integration | 1 week | Enables online payments |
| P0 | 2B | Recurring Invoice Engine | 1 week | Automates billing |
| P1 | 2B | Payment Reminder Engine | 1 week | Improves collections |
| P1 | 2B | Workflow Rule Engine | 1 week | Enables automation |
| P2 | 3 | Report Builder | 2 weeks | Custom analytics |
| P2 | 3 | Cash Flow Forecast | 1 week | Financial planning |
| P3 | 4 | Warehouse Management | 2 weeks | Multi-location inventory |
| P3 | 4 | Price Lists | 1 week | Customer-specific pricing |
| P4 | 5 | Vendor Portal | 3 weeks | Vendor self-service |

---

## Recommended Next Steps

### Immediate Actions (This Session)

1. **Enable Stripe Integration** - Add secret key connector and create payment gateway settings
2. **Create Recurring Invoice Processor** - Edge function to auto-generate invoices
3. **Create Payment Reminder Processor** - Edge function for AR/AP reminders
4. **Create Workflow Execution Engine** - Edge function for trigger-based actions

### Database Changes Needed

```sql
-- Payment Links for Stripe
CREATE TABLE payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES ar_invoices(id),
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  amount DECIMAL(15,2),
  currency TEXT DEFAULT 'LKR',
  status TEXT DEFAULT 'pending',
  expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow Execution Log
CREATE TABLE workflow_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_rule_id UUID REFERENCES workflow_rules(id),
  trigger_entity_type TEXT,
  trigger_entity_id UUID,
  action_type TEXT,
  action_result JSONB,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN
);

-- Payment Reminder Log
CREATE TABLE payment_reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_rule_id UUID REFERENCES payment_reminder_rules(id),
  invoice_id UUID,
  invoice_type TEXT, -- 'ar' or 'ap'
  sent_to TEXT,
  channel TEXT, -- 'email' or 'sms'
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT
);
```

---

## Technical Architecture for Automation

```
+------------------------------------------------------------------+
|                    AUTOMATION EXECUTION FLOW                      |
+------------------------------------------------------------------+

Daily at 6:00 AM:
  ┌─────────────────────────────────────────────────────────────┐
  │              process-recurring-invoices                      │
  │  1. Query recurring_invoices (next_run <= today, active)    │
  │  2. For each: Create AR Invoice                              │
  │  3. Update next_run_date                                     │
  │  4. If auto_send_email: Send invoice PDF                     │
  └─────────────────────────────────────────────────────────────┘

Daily at 9:00 AM:
  ┌─────────────────────────────────────────────────────────────┐
  │              process-payment-reminders-ar                    │
  │  1. Query payment_reminder_rules (active)                    │
  │  2. Find invoices matching trigger conditions               │
  │  3. Send email/SMS notifications                            │
  │  4. Log in payment_reminder_log                              │
  └─────────────────────────────────────────────────────────────┘

On Event Trigger (via database trigger or API):
  ┌─────────────────────────────────────────────────────────────┐
  │              execute-workflow-rules                          │
  │  Input: { event: 'invoice_created', entity_id: '...' }      │
  │  1. Query workflow_rules matching event                      │
  │  2. Evaluate conditions against entity                       │
  │  3. Execute actions (email, field_update, webhook)           │
  │  4. Log in workflow_execution_log                            │
  └─────────────────────────────────────────────────────────────┘

Hourly:
  ┌─────────────────────────────────────────────────────────────┐
  │              run-scheduled-tasks                             │
  │  1. Query scheduled_tasks (next_run <= now)                  │
  │  2. Execute based on task_type                               │
  │  3. Update last_run/next_run timestamps                      │
  │  4. Handle failures and retries                              │
  └─────────────────────────────────────────────────────────────┘
```

---

## Summary

The Phase 1 & 2 UI components are complete, but the execution layer (edge functions) that actually runs the automation is missing. The immediate priority should be:

1. **Stripe Integration** - Enable real online payments
2. **Automation Edge Functions** - Make recurring invoices, reminders, and workflows actually execute
3. **Advanced Reporting** - Report builder and forecasting
4. **Inventory Enhancements** - Warehouses and price lists

After implementing these, NCG FleetFlow will achieve approximately **85-90% feature parity** with Zoho Books.
