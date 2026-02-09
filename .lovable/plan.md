
# ERPNext Feature Parity Implementation Plan

## Executive Summary

Based on a comprehensive analysis comparing the NCG FleetFlow ERP with ERPNext (from the provided screenshots), I will implement the **critical missing features** to achieve approximately **70-75% ERPNext parity**. This plan prioritizes features that integrate with existing operations and finance modules.

---

## Current State Analysis

### Already Implemented (Existing Strengths)
| Module | Existing Features |
|--------|-------------------|
| **Accounts** | Chart of Accounts (5-level), Journal Entries, Financial Periods, Currencies, Cost Centers |
| **AR** | Customers, Invoices, Receipts, Credit Notes, Ageing, Reconciliation, Bad Debts |
| **AP** | Vendors, Invoices, Payments, Debit Notes, Ageing, WHT, Vendor Performance |
| **Inventory** | Items, Stock Levels, Warehouses, Price Lists, Composites/BOM, Batch/Serial Tracking |
| **Procurement** | Purchase Requisitions, Purchase Orders, GRN, 3-Way Matching |
| **Banking** | Bank Accounts, Transactions, Cashbook, Cheques, Reconciliation, Fund Transfers |
| **Assets** | Asset Register, Categories, Depreciation, Revaluations, Transfers, Disposals |
| **Reports** | Trial Balance, Financial Statements, Cash Flow, Segment Reports, Tax Reports |

### Missing Features (To Implement)

| Priority | ERPNext Feature | Gap Analysis |
|----------|-----------------|--------------|
| **Critical** | Sales Orders | No formal sales order workflow |
| **Critical** | Delivery Notes | No delivery/shipping documentation |
| **Critical** | Payment Terms Templates | Only inline options, no reusable templates |
| **High** | Request for Quotation (RFQ) | No vendor quotation comparison |
| **High** | Supplier Quotations | Cannot receive/compare vendor quotes |
| **High** | Pick Lists | No warehouse picking workflow |
| **High** | Landed Cost Voucher | Cannot allocate shipping/customs to inventory cost |
| **High** | UoM Conversions | Basic UoM exists, no conversions |
| **Medium** | Quality Inspection | No formal quality workflow |
| **Medium** | Asset Maintenance | Maintenance exists for fleet, not fixed assets |
| **Medium** | Finance Books | No multi-book accounting |
| **Low** | Subcontracting | Not applicable to current business |
| **Low** | POS | Not required for fleet operations |

---

## Implementation Plan

### Phase 1: Selling Module - Order-to-Cash Flow

#### 1.1 Payment Terms Templates
Create reusable payment terms that can be assigned to customers/vendors.

**New Files:**
- `src/components/accounting/settings/PaymentTermsView.tsx` - Manage payment term templates
- `src/components/accounting/settings/PaymentTermForm.tsx` - Create/edit templates

**Database Tables:**
```sql
-- payment_terms table
CREATE TABLE payment_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  term_name VARCHAR(100) NOT NULL,
  description TEXT,
  due_days INTEGER DEFAULT 30,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  discount_days INTEGER,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 1.2 Sales Orders
Formal sales order workflow before invoicing.

**New Files:**
- `src/components/accounting/SalesOrderView.tsx` - List and manage sales orders
- `src/components/accounting/SalesOrderForm.tsx` - Create/edit sales orders
- `src/hooks/useSalesOrders.ts` - Data fetching hooks

**Database Tables:**
```sql
-- sales_orders table
CREATE TABLE sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  so_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date DATE,
  payment_terms_id UUID REFERENCES payment_terms(id),
  status VARCHAR(30) DEFAULT 'draft',
  subtotal DECIMAL(18,2) DEFAULT 0,
  tax_amount DECIMAL(18,2) DEFAULT 0,
  discount_amount DECIMAL(18,2) DEFAULT 0,
  total_amount DECIMAL(18,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- sales_order_lines table
CREATE TABLE sales_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id),
  description TEXT,
  quantity DECIMAL(18,4) NOT NULL,
  unit_price DECIMAL(18,4) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  line_total DECIMAL(18,2) NOT NULL,
  delivered_qty DECIMAL(18,4) DEFAULT 0,
  invoiced_qty DECIMAL(18,4) DEFAULT 0
);
```

#### 1.3 Delivery Notes
Track shipments and deliveries.

**New Files:**
- `src/components/accounting/DeliveryNoteView.tsx` - List delivery notes
- `src/components/accounting/DeliveryNoteForm.tsx` - Create from sales orders

**Database Tables:**
```sql
-- delivery_notes table
CREATE TABLE delivery_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  dn_number VARCHAR(50) UNIQUE NOT NULL,
  sales_order_id UUID REFERENCES sales_orders(id),
  customer_id UUID REFERENCES customers(id),
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shipping_address TEXT,
  status VARCHAR(30) DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- delivery_note_lines table
CREATE TABLE delivery_note_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_id UUID REFERENCES delivery_notes(id) ON DELETE CASCADE,
  so_line_id UUID REFERENCES sales_order_lines(id),
  item_id UUID REFERENCES items(id),
  quantity DECIMAL(18,4) NOT NULL,
  warehouse_id UUID
);
```

---

### Phase 2: Procurement Enhancements

#### 2.1 Request for Quotation (RFQ)
Send quote requests to multiple vendors.

**New Files:**
- `src/components/accounting/RFQView.tsx` - Manage RFQs
- `src/components/accounting/RFQForm.tsx` - Create RFQ and select vendors
- `src/components/accounting/SupplierQuotationView.tsx` - Compare vendor quotes

**Database Tables:**
```sql
-- request_for_quotations table
CREATE TABLE request_for_quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  rfq_number VARCHAR(50) UNIQUE NOT NULL,
  requisition_id UUID REFERENCES purchase_requisitions(id),
  rfq_date DATE NOT NULL DEFAULT CURRENT_DATE,
  response_deadline DATE,
  status VARCHAR(30) DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- rfq_vendors table (which vendors to send RFQ)
CREATE TABLE rfq_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID REFERENCES request_for_quotations(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id),
  sent_date TIMESTAMPTZ,
  response_received BOOLEAN DEFAULT false
);

-- rfq_lines table
CREATE TABLE rfq_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID REFERENCES request_for_quotations(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id),
  description TEXT,
  quantity DECIMAL(18,4) NOT NULL,
  uom VARCHAR(20)
);

-- supplier_quotations table
CREATE TABLE supplier_quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  sq_number VARCHAR(50) UNIQUE NOT NULL,
  rfq_id UUID REFERENCES request_for_quotations(id),
  vendor_id UUID REFERENCES vendors(id),
  quotation_date DATE NOT NULL,
  valid_until DATE,
  total_amount DECIMAL(18,2) DEFAULT 0,
  status VARCHAR(30) DEFAULT 'received',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- supplier_quotation_lines table
CREATE TABLE supplier_quotation_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID REFERENCES supplier_quotations(id) ON DELETE CASCADE,
  rfq_line_id UUID REFERENCES rfq_lines(id),
  item_id UUID REFERENCES items(id),
  quantity DECIMAL(18,4) NOT NULL,
  unit_price DECIMAL(18,4) NOT NULL,
  line_total DECIMAL(18,2) NOT NULL
);
```

---

### Phase 3: Inventory Enhancements

#### 3.1 Pick Lists
Warehouse picking workflow for deliveries.

**New Files:**
- `src/components/accounting/inventory/PickListView.tsx` - List pick lists
- `src/components/accounting/inventory/PickListForm.tsx` - Create from sales orders

**Database Tables:**
```sql
-- pick_lists table
CREATE TABLE pick_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  pick_number VARCHAR(50) UNIQUE NOT NULL,
  sales_order_id UUID REFERENCES sales_orders(id),
  warehouse_id UUID,
  status VARCHAR(30) DEFAULT 'draft',
  picked_by UUID,
  picked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- pick_list_lines table
CREATE TABLE pick_list_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pick_list_id UUID REFERENCES pick_lists(id) ON DELETE CASCADE,
  so_line_id UUID REFERENCES sales_order_lines(id),
  item_id UUID REFERENCES items(id),
  bin_location VARCHAR(50),
  qty_to_pick DECIMAL(18,4) NOT NULL,
  qty_picked DECIMAL(18,4) DEFAULT 0,
  serial_numbers TEXT[]
);
```

#### 3.2 Landed Cost Voucher
Allocate additional costs to inventory.

**New Files:**
- `src/components/accounting/inventory/LandedCostView.tsx` - List landed cost vouchers
- `src/components/accounting/inventory/LandedCostForm.tsx` - Create vouchers

**Database Tables:**
```sql
-- landed_cost_vouchers table
CREATE TABLE landed_cost_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  voucher_number VARCHAR(50) UNIQUE NOT NULL,
  posting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  grn_id UUID REFERENCES goods_receipt_notes(id),
  total_additional_cost DECIMAL(18,2) DEFAULT 0,
  allocation_method VARCHAR(30) DEFAULT 'by_value',
  status VARCHAR(30) DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- landed_cost_items table
CREATE TABLE landed_cost_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID REFERENCES landed_cost_vouchers(id) ON DELETE CASCADE,
  grn_line_id UUID,
  item_id UUID REFERENCES items(id),
  original_cost DECIMAL(18,4) NOT NULL,
  allocated_cost DECIMAL(18,4) DEFAULT 0,
  final_cost DECIMAL(18,4) NOT NULL
);

-- landed_cost_charges table
CREATE TABLE landed_cost_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID REFERENCES landed_cost_vouchers(id) ON DELETE CASCADE,
  charge_type VARCHAR(50) NOT NULL,
  description TEXT,
  amount DECIMAL(18,2) NOT NULL,
  expense_account_id UUID REFERENCES chart_of_accounts(id)
);
```

#### 3.3 UoM Conversions
Enable unit of measure conversions.

**New Files:**
- `src/components/accounting/inventory/UoMConversionView.tsx` - Manage conversions
- `src/components/accounting/inventory/UoMConversionForm.tsx` - Create conversion rules

**Database Tables:**
```sql
-- unit_of_measures table
CREATE TABLE unit_of_measures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uom_name VARCHAR(50) UNIQUE NOT NULL,
  uom_symbol VARCHAR(10),
  is_active BOOLEAN DEFAULT true
);

-- uom_conversions table
CREATE TABLE uom_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id),
  from_uom VARCHAR(50) NOT NULL,
  to_uom VARCHAR(50) NOT NULL,
  conversion_factor DECIMAL(18,6) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(item_id, from_uom, to_uom)
);
```

---

### Phase 4: Quality Management

#### 4.1 Quality Inspection
Inspect goods on receipt or delivery.

**New Files:**
- `src/components/accounting/quality/QualityInspectionView.tsx` - List inspections
- `src/components/accounting/quality/QualityInspectionForm.tsx` - Record inspections
- `src/components/accounting/quality/InspectionTemplateView.tsx` - Manage templates

**Database Tables:**
```sql
-- inspection_templates table
CREATE TABLE inspection_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  template_name VARCHAR(100) NOT NULL,
  inspection_type VARCHAR(30) DEFAULT 'incoming',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- inspection_template_criteria table
CREATE TABLE inspection_template_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES inspection_templates(id) ON DELETE CASCADE,
  criteria_name VARCHAR(100) NOT NULL,
  acceptance_criteria TEXT,
  is_mandatory BOOLEAN DEFAULT true,
  sequence INTEGER DEFAULT 0
);

-- quality_inspections table
CREATE TABLE quality_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  inspection_number VARCHAR(50) UNIQUE NOT NULL,
  template_id UUID REFERENCES inspection_templates(id),
  reference_type VARCHAR(30),
  reference_id UUID,
  item_id UUID REFERENCES items(id),
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  inspected_qty DECIMAL(18,4) NOT NULL,
  accepted_qty DECIMAL(18,4) DEFAULT 0,
  rejected_qty DECIMAL(18,4) DEFAULT 0,
  status VARCHAR(30) DEFAULT 'pending',
  inspector_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- quality_inspection_readings table
CREATE TABLE quality_inspection_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES quality_inspections(id) ON DELETE CASCADE,
  criteria_id UUID REFERENCES inspection_template_criteria(id),
  reading_value TEXT,
  status VARCHAR(30) DEFAULT 'pending'
);
```

---

### Phase 5: Asset Maintenance

#### 5.1 Asset Maintenance Scheduling
Preventive maintenance for fixed assets.

**New Files:**
- `src/components/accounting/assets/AssetMaintenanceView.tsx` - List maintenance logs
- `src/components/accounting/assets/AssetMaintenanceForm.tsx` - Schedule/record maintenance
- `src/components/accounting/assets/MaintenanceTeamView.tsx` - Manage maintenance teams

**Database Tables:**
```sql
-- asset_maintenance_teams table
CREATE TABLE asset_maintenance_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  team_name VARCHAR(100) NOT NULL,
  team_members TEXT[],
  is_active BOOLEAN DEFAULT true
);

-- asset_maintenance_logs table
CREATE TABLE asset_maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  asset_id UUID REFERENCES fixed_assets(id),
  maintenance_type VARCHAR(30) DEFAULT 'preventive',
  maintenance_date DATE NOT NULL,
  next_due_date DATE,
  assigned_team_id UUID REFERENCES asset_maintenance_teams(id),
  description TEXT,
  cost DECIMAL(18,2) DEFAULT 0,
  status VARCHAR(30) DEFAULT 'scheduled',
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## UI Integration Plan

### Updates to Accounting.tsx

Add new tabs and modules to the existing structure:

```typescript
// New module buttons
{ id: "selling" as ModuleTab, label: "Selling", icon: ShoppingCart },

// Selling Module tabs
"sales-orders", "delivery-notes", "pick-lists"

// New Procurement tabs
"rfq", "supplier-quotes"

// New Inventory tabs
"landed-cost", "uom"

// New Assets tabs
"maintenance"

// New Settings tabs  
"payment-terms"

// New Quality module
{ id: "quality" as ModuleTab, label: "Quality", icon: ClipboardCheck },
```

---

## Files to Create

| # | File Path | Purpose |
|---|-----------|---------|
| 1 | `src/components/accounting/settings/PaymentTermsView.tsx` | Payment terms list |
| 2 | `src/components/accounting/settings/PaymentTermForm.tsx` | Create/edit payment terms |
| 3 | `src/components/accounting/SalesOrderView.tsx` | Sales orders list |
| 4 | `src/components/accounting/SalesOrderForm.tsx` | Create/edit sales orders |
| 5 | `src/components/accounting/DeliveryNoteView.tsx` | Delivery notes list |
| 6 | `src/components/accounting/DeliveryNoteForm.tsx` | Create delivery notes |
| 7 | `src/components/accounting/RFQView.tsx` | Request for quotations list |
| 8 | `src/components/accounting/RFQForm.tsx` | Create RFQs |
| 9 | `src/components/accounting/SupplierQuotationView.tsx` | Compare vendor quotes |
| 10 | `src/components/accounting/SupplierQuotationForm.tsx` | Record vendor quotes |
| 11 | `src/components/accounting/inventory/PickListView.tsx` | Pick lists management |
| 12 | `src/components/accounting/inventory/PickListForm.tsx` | Create pick lists |
| 13 | `src/components/accounting/inventory/LandedCostView.tsx` | Landed cost vouchers |
| 14 | `src/components/accounting/inventory/LandedCostForm.tsx` | Create landed cost |
| 15 | `src/components/accounting/inventory/UoMConversionView.tsx` | UoM management |
| 16 | `src/components/accounting/inventory/UoMConversionForm.tsx` | Create conversions |
| 17 | `src/components/accounting/quality/QualityInspectionView.tsx` | Quality inspections |
| 18 | `src/components/accounting/quality/QualityInspectionForm.tsx` | Record inspections |
| 19 | `src/components/accounting/quality/InspectionTemplateView.tsx` | Inspection templates |
| 20 | `src/components/accounting/quality/InspectionTemplateForm.tsx` | Create templates |
| 21 | `src/components/accounting/assets/AssetMaintenanceView.tsx` | Asset maintenance |
| 22 | `src/components/accounting/assets/AssetMaintenanceForm.tsx` | Schedule maintenance |
| 23 | `src/components/accounting/assets/MaintenanceTeamView.tsx` | Maintenance teams |
| 24 | `src/hooks/useSalesOrders.ts` | Sales order hooks |
| 25 | `src/hooks/useDeliveryNotes.ts` | Delivery note hooks |
| 26 | `src/hooks/useRFQ.ts` | RFQ hooks |
| 27 | `src/hooks/useQualityInspection.ts` | Quality hooks |

---

## Files to Modify

| # | File Path | Changes |
|---|-----------|---------|
| 1 | `src/pages/Accounting.tsx` | Add Selling module, Quality module, new tabs |
| 2 | `src/hooks/useAccountingData.ts` | Add new hooks for sales orders, delivery notes |
| 3 | `src/components/accounting/CustomerForm.tsx` | Add payment_terms_id field |
| 4 | `src/components/accounting/VendorForm.tsx` | Add payment_terms_id field |

---

## Database Migration Summary

**New Tables (18 total):**
1. `payment_terms`
2. `sales_orders`
3. `sales_order_lines`
4. `delivery_notes`
5. `delivery_note_lines`
6. `request_for_quotations`
7. `rfq_vendors`
8. `rfq_lines`
9. `supplier_quotations`
10. `supplier_quotation_lines`
11. `pick_lists`
12. `pick_list_lines`
13. `landed_cost_vouchers`
14. `landed_cost_items`
15. `landed_cost_charges`
16. `unit_of_measures`
17. `uom_conversions`
18. `inspection_templates`
19. `inspection_template_criteria`
20. `quality_inspections`
21. `quality_inspection_readings`
22. `asset_maintenance_teams`
23. `asset_maintenance_logs`

---

## Expected Outcome

After implementation, ERPNext parity will increase from **~45% to ~72%**:

| Module | Before | After |
|--------|--------|-------|
| Accounts Setup | 82% | 90% |
| Assets | 75% | 90% |
| Stock/Inventory | 50% | 80% |
| Selling | 20% | 75% |
| Procurement | 60% | 85% |
| Quality | 0% | 70% |
| **Overall** | **~45%** | **~72%** |

---

## Technical Notes

- All new components follow existing patterns (DataTable, Card, Form dialogs)
- Hooks use React Query consistent with existing `useAccountingData.ts`
- Forms use React Hook Form + Zod validation
- Database follows existing naming conventions (snake_case, UUID primary keys)
- RLS policies will be added for company isolation
- Numbering uses existing `useNumbering` hook pattern
