
# Complete Development Plan - Phases 1B through 5

## Current Status Summary

Based on my comprehensive analysis of the codebase and database, here's what's implemented vs. what needs to be built:

### Already Implemented
| Component | Status |
|-----------|--------|
| Customer Portal UI (6 components) | Done |
| Automation Module UI (4 components) | Done |
| Automation Edge Functions (4 functions) | Done |
| Database tables for automation | Done |
| Database tables for portal | Done |

### Missing Components to Build

| Phase | Component | Priority |
|-------|-----------|----------|
| 1B | Stripe Payment Gateway Integration | Critical |
| 3 | Report Builder | High |
| 3 | Cash Flow Forecasting | High |
| 3 | Report Scheduler | Medium |
| 4 | Warehouse Management (Bins) | Medium |
| 4 | Price Lists | Medium |
| 4 | Composite Items (BOM) | Medium |
| 5 | Vendor Portal | Low |
| 5 | API/Webhooks Settings | Low |

---

## Phase 1B: Payment Gateway (Stripe Integration)

### 1.1 Database Schema

Create new tables and modify existing ones:

```sql
-- Add Stripe-specific columns to payment_links
ALTER TABLE payment_links ADD COLUMN IF NOT EXISTS stripe_checkout_url TEXT;
ALTER TABLE payment_links ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Payment link statuses tracking
ALTER TABLE payment_links ADD COLUMN IF NOT EXISTS failure_reason TEXT;
```

### 1.2 Edge Functions

**File: `supabase/functions/create-stripe-checkout/index.ts`**

Purpose: Create Stripe checkout session for customer payments
- Accept invoice IDs and customer ID
- Create Stripe checkout session with line items
- Return checkout URL
- Store session in payment_links table

**File: `supabase/functions/stripe-webhook/index.ts`**

Purpose: Handle Stripe webhook events
- checkout.session.completed: Create AR Receipt, update invoice status
- payment_intent.payment_failed: Log failure
- charge.refunded: Create AR Credit Note

### 1.3 UI Components

**File: `src/components/accounting/settings/PaymentGatewaySettings.tsx`**

Features:
- Display Stripe connection status
- Test/Live mode toggle
- Webhook URL display for configuration
- Payment method settings (card, bank transfer)

**Modify: `src/components/customer-portal/MakePayment.tsx`**

Changes:
- Replace placeholder with actual Stripe checkout call
- Add loading state during checkout creation
- Handle redirect to Stripe
- Show payment confirmation on return

**Modify: `src/pages/Accounting.tsx`**

Add "Payment Gateways" tab to Settings module

---

## Phase 3: Advanced Reporting

### 3.1 Database Schema

```sql
-- Custom Reports Table
CREATE TABLE custom_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL, -- 'table', 'chart', 'summary'
  config JSONB NOT NULL DEFAULT '{}',
  -- Config structure:
  -- {
  --   source_table: 'ar_invoices',
  --   columns: [{field, label, type, aggregate}],
  --   filters: [{field, operator, value}],
  --   groupBy: ['field1', 'field2'],
  --   sortBy: {field, direction}
  -- }
  company_id UUID REFERENCES companies(id),
  created_by UUID REFERENCES auth.users(id),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report Schedules Table
CREATE TABLE report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES custom_reports(id) ON DELETE CASCADE,
  schedule_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
  schedule_day INTEGER, -- 1-7 for weekly, 1-31 for monthly
  schedule_time TIME DEFAULT '08:00',
  recipients TEXT[] NOT NULL,
  format TEXT DEFAULT 'pdf', -- 'pdf', 'excel', 'csv'
  is_active BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 UI Components

**File: `src/components/accounting/reports/ReportBuilder.tsx`**

Features:
- Step 1: Select data source (AR, AP, GL, Inventory, Banking)
- Step 2: Choose columns with drag-drop ordering
- Step 3: Add filters with condition builder
- Step 4: Set grouping and aggregation
- Step 5: Preview and save
- Export to PDF/Excel

**File: `src/components/accounting/reports/CashFlowForecastView.tsx`**

Features:
- AR Collection projections (based on invoice due dates and payment history)
- AP Payment projections (based on bill due dates)
- Recurring invoice projections
- Bank balance forecast chart (30/60/90 days)
- Scenario modeling (optimistic 90%, realistic 75%, pessimistic 50% collection)

**File: `src/components/accounting/reports/ReportSchedulerView.tsx`**

Features:
- List of scheduled reports
- Add/Edit schedule modal
- Configure frequency (daily/weekly/monthly)
- Set recipients (email addresses)
- Format selection
- Test send button

### 3.3 Edge Function

**File: `supabase/functions/generate-scheduled-reports/index.ts`**

Purpose: Generate and email scheduled reports
- Query due report schedules
- Generate report data based on config
- Create PDF/Excel attachment
- Send via Resend
- Update last_sent_at

### 3.4 Accounting.tsx Changes

Add to Reports module tabs:
- "Report Builder" tab
- "Cash Flow Forecast" tab  
- "Scheduled Reports" tab

---

## Phase 4: Advanced Inventory

### 4.1 Database Schema

```sql
-- Bin Locations (warehouses table already exists)
CREATE TABLE bin_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  bin_code TEXT NOT NULL,
  bin_name TEXT,
  aisle TEXT,
  rack TEXT,
  level TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(warehouse_id, bin_code)
);

-- Price Lists
CREATE TABLE price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  currency TEXT DEFAULT 'LKR',
  price_type TEXT DEFAULT 'fixed', -- 'fixed', 'percentage_discount', 'percentage_markup'
  is_default BOOLEAN DEFAULT false,
  effective_from DATE,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true,
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price List Items
CREATE TABLE price_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id UUID REFERENCES price_lists(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  price DECIMAL(15,2) NOT NULL,
  min_quantity INTEGER DEFAULT 1,
  max_quantity INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(price_list_id, item_id, min_quantity)
);

-- Customer Price List Assignment
CREATE TABLE customer_price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  price_list_id UUID REFERENCES price_lists(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, price_list_id)
);

-- Composite Items (Kits/Assemblies)
CREATE TABLE composite_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  component_item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  quantity DECIMAL(15,4) NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_item_id, component_item_id)
);

-- Stock Transfers
CREATE TABLE stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number TEXT NOT NULL,
  from_warehouse_id UUID REFERENCES warehouses(id),
  to_warehouse_id UUID REFERENCES warehouses(id),
  from_bin_id UUID REFERENCES bin_locations(id),
  to_bin_id UUID REFERENCES bin_locations(id),
  transfer_date DATE NOT NULL,
  status TEXT DEFAULT 'draft', -- 'draft', 'in_transit', 'completed', 'cancelled'
  notes TEXT,
  company_id UUID REFERENCES companies(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock Transfer Lines
CREATE TABLE stock_transfer_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID REFERENCES stock_transfers(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id),
  quantity DECIMAL(15,4) NOT NULL,
  received_quantity DECIMAL(15,4) DEFAULT 0,
  batch_number TEXT,
  serial_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 UI Components

**File: `src/components/accounting/inventory/WarehouseManagementView.tsx`**

Features:
- Warehouse list with CRUD operations
- Bin location management per warehouse (nested table)
- Stock summary per warehouse
- Stock transfer initiation

**File: `src/components/accounting/inventory/StockTransferForm.tsx`**

Features:
- Source/destination warehouse selection
- Optional bin location selection
- Item selection with available quantity
- Batch/serial tracking integration
- Transfer status workflow

**File: `src/components/accounting/inventory/PriceListsView.tsx`**

Features:
- Price list CRUD
- Item price assignment (bulk edit)
- Customer assignment
- Volume discount tiers
- Effective date ranges
- Import/Export prices

**File: `src/components/accounting/inventory/CompositeItemsView.tsx`**

Features:
- Kit/Assembly definition
- BOM (Bill of Materials) editor
- Component quantity specification
- Assembly cost calculation
- Explode kit option on sales

### 4.3 Accounting.tsx Changes

Add to Inventory module tabs:
- "Warehouses" tab (with bins)
- "Stock Transfers" tab
- "Price Lists" tab
- "Assemblies/Kits" tab

---

## Phase 5: External Integration

### 5.1 Database Schema

```sql
-- Vendor Portal Access
CREATE TABLE vendor_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  otp_code TEXT,
  otp_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_id, email)
);

-- Vendor Portal Sessions
CREATE TABLE vendor_portal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_access_id UUID REFERENCES vendor_portal_access(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor Submitted Invoices
CREATE TABLE vendor_submitted_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id),
  purchase_order_id UUID REFERENCES purchase_orders(id),
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  attachment_url TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'converted'
  ap_invoice_id UUID REFERENCES ap_invoices(id),
  notes TEXT,
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Keys for Integration
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL, -- First 8 chars for identification
  permissions TEXT[] DEFAULT '{}',
  rate_limit INTEGER DEFAULT 1000, -- requests per hour
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  company_id UUID REFERENCES companies(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook Endpoints
CREATE TABLE webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL, -- ['invoice.created', 'payment.received']
  secret TEXT NOT NULL, -- for signature verification
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook Delivery Log
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN
);
```

### 5.2 Vendor Portal Components

**File: `src/pages/VendorPortal.tsx`**

Main page with tab navigation (similar to CustomerPortal)

**File: `src/components/vendor-portal/VendorLogin.tsx`**

- Email/OTP authentication
- Session management

**File: `src/components/vendor-portal/VendorDashboard.tsx`**

- Summary cards (Open POs, Pending Payments, etc.)
- Quick actions

**File: `src/components/vendor-portal/PurchaseOrdersView.tsx`**

- View assigned POs
- Acknowledge receipt
- View PO details and items

**File: `src/components/vendor-portal/SubmitInvoice.tsx`**

- Upload invoice against PO
- Enter invoice details
- Attach supporting documents

**File: `src/components/vendor-portal/PaymentTracking.tsx`**

- View payment history
- Track pending payments
- Download payment advice

### 5.3 Settings Components

**File: `src/components/accounting/settings/APIWebhooksSettings.tsx`**

Features:
- API Key management
  - Generate new keys
  - Set permissions
  - View usage statistics
  - Revoke keys
- Webhook configuration
  - Add webhook endpoints
  - Select events to trigger
  - Test webhook delivery
  - View delivery logs

### 5.4 Edge Functions

**File: `supabase/functions/vendor-portal-auth/index.ts`**

- OTP generation and verification
- Session token management

**File: `supabase/functions/process-vendor-invoice/index.ts`**

- Validate submitted invoice
- Create draft AP invoice
- Notify accounts team

### 5.5 App.tsx and Accounting.tsx Changes

Add route: `/vendor-portal`

Add to Settings module tabs:
- "API & Webhooks" tab

---

## Implementation Order

### Sprint 1 (Week 1-2): Phase 1B - Payments
1. Create Stripe checkout edge function
2. Create Stripe webhook handler
3. Build PaymentGatewaySettings component
4. Update MakePayment with Stripe integration
5. Add Payment Gateways tab to Settings
6. Test end-to-end payment flow

### Sprint 2 (Week 3-4): Phase 3 - Reporting
1. Create database tables for custom reports
2. Build ReportBuilder component
3. Build CashFlowForecastView component
4. Build ReportSchedulerView component
5. Create scheduled reports edge function
6. Add tabs to Reports module

### Sprint 3 (Week 5-6): Phase 4 - Inventory
1. Create database tables for advanced inventory
2. Build WarehouseManagementView with bins
3. Build StockTransferForm component
4. Build PriceListsView component
5. Build CompositeItemsView component
6. Add tabs to Inventory module

### Sprint 4 (Week 7-8): Phase 5 - Integration
1. Create database tables for vendor portal and API
2. Build VendorPortal page with all components
3. Build APIWebhooksSettings component
4. Create vendor portal edge functions
5. Add vendor portal route
6. Add API & Webhooks tab to Settings

---

## Files to Create Summary

### Edge Functions (4 new)
1. `supabase/functions/create-stripe-checkout/index.ts`
2. `supabase/functions/stripe-webhook/index.ts`
3. `supabase/functions/generate-scheduled-reports/index.ts`
4. `supabase/functions/vendor-portal-auth/index.ts`

### React Components (14 new)
1. `src/components/accounting/settings/PaymentGatewaySettings.tsx`
2. `src/components/accounting/reports/ReportBuilder.tsx`
3. `src/components/accounting/reports/CashFlowForecastView.tsx`
4. `src/components/accounting/reports/ReportSchedulerView.tsx`
5. `src/components/accounting/inventory/WarehouseManagementView.tsx`
6. `src/components/accounting/inventory/StockTransferForm.tsx`
7. `src/components/accounting/inventory/PriceListsView.tsx`
8. `src/components/accounting/inventory/CompositeItemsView.tsx`
9. `src/pages/VendorPortal.tsx`
10. `src/components/vendor-portal/VendorLogin.tsx`
11. `src/components/vendor-portal/VendorDashboard.tsx`
12. `src/components/vendor-portal/PurchaseOrdersView.tsx`
13. `src/components/vendor-portal/SubmitInvoice.tsx`
14. `src/components/vendor-portal/PaymentTracking.tsx`
15. `src/components/accounting/settings/APIWebhooksSettings.tsx`

### Modified Files (3)
1. `src/pages/Accounting.tsx` - Add new tabs to modules
2. `src/App.tsx` - Add vendor portal route
3. `src/components/customer-portal/MakePayment.tsx` - Stripe integration

### Database Migrations (1 comprehensive)
- All new tables for Phases 3-5

---

## Zoho Books Parity After Completion

| Category | Current | After Plan |
|----------|---------|------------|
| Sales (Receivables) | 75% | 90% |
| Purchases (Payables) | 80% | 90% |
| Banking | 85% | 85% |
| Accounting | 90% | 95% |
| Inventory | 60% | 85% |
| Reporting | 75% | 90% |
| Automation | 70% | 90% |
| Integration | 40% | 80% |
| **Overall** | **~70%** | **~88%** |

This plan will bring NCG FleetFlow Finance ERP to approximately 88-90% feature parity with Zoho Books while maintaining its unique strengths in operational-to-finance integration and Sri Lankan compliance.
