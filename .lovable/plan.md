
# Complete ERPNext Feature Parity - Full System Integration

## Overview

Based on the codebase analysis, the database schema, hooks, and main view components are already created. The remaining work is to:

1. **Add Selling module tabs** - Wire up sales orders and delivery notes in Accounting.tsx
2. **Add RFQ/Supplier Quotes tabs** - Add to Procurement module
3. **Add Quality module tabs** - Wire up quality inspections and templates
4. **Add Inventory enhancements** - Pick lists, Landed Cost, UoM tabs
5. **Create Asset Maintenance views** - New components for fixed asset maintenance
6. **Add Payment Terms settings** - New settings tab
7. **Create Inspection Templates view** - Missing Quality component

---

## Implementation Summary

### Files to Create (7 new components)

| # | File | Purpose |
|---|------|---------|
| 1 | `src/components/accounting/inventory/PickListView.tsx` | Pick lists management |
| 2 | `src/components/accounting/inventory/LandedCostView.tsx` | Landed cost vouchers |
| 3 | `src/components/accounting/inventory/UoMView.tsx` | Unit of measure management |
| 4 | `src/components/accounting/assets/AssetMaintenanceView.tsx` | Asset maintenance scheduling |
| 5 | `src/components/accounting/assets/MaintenanceTeamView.tsx` | Maintenance teams |
| 6 | `src/components/accounting/settings/PaymentTermsView.tsx` | Payment terms templates |
| 7 | `src/components/accounting/quality/InspectionTemplateView.tsx` | Quality inspection templates |

### Files to Modify (1 file)

| # | File | Changes |
|---|------|---------|
| 1 | `src/pages/Accounting.tsx` | Add all new tabs and module content |

---

## Detailed Implementation

### 1. PickListView Component

Create warehouse picking workflow UI with:
- Summary cards (Total, Pending, In Progress, Completed)
- Filterable/searchable pick list table
- Status badges and action menu
- Pick completion dialog

### 2. LandedCostView Component

Create landed cost voucher management with:
- Voucher list with GRN reference
- Status tracking (Draft, Posted, Cancelled)
- Total additional cost display
- Allocation method indicator

### 3. UoMView Component

Create unit of measure management with:
- UoM master list
- UoM conversion rules
- Conversion factor calculator
- Item-specific conversion support

### 4. AssetMaintenanceView Component

Create fixed asset maintenance scheduling with:
- Upcoming maintenance dashboard
- Maintenance log table with filters
- Status tracking (Scheduled, In Progress, Completed)
- Complete/Cancel actions with notes

### 5. MaintenanceTeamView Component

Create maintenance team management with:
- Team list with member count
- Team lead assignment
- Team code generation

### 6. PaymentTermsView Component

Create payment terms template management with:
- Terms list with due days and discount info
- Default term indicator
- Create/Edit dialog

### 7. InspectionTemplateView Component

Create quality inspection template management with:
- Template list by inspection type
- Criteria management
- Template activation/deactivation

---

## Accounting.tsx Tab Integration

### Add to Selling Module (NEW)

```typescript
{activeModule === "selling" && (
  <Tabs defaultValue="sales-orders" className="space-y-6">
    <TabsList>
      <TabsTrigger value="sales-orders">Sales Orders</TabsTrigger>
      <TabsTrigger value="delivery-notes">Delivery Notes</TabsTrigger>
      <TabsTrigger value="pick-lists">Pick Lists</TabsTrigger>
    </TabsList>
    
    <TabsContent value="sales-orders">
      <SalesOrderView />
    </TabsContent>
    <TabsContent value="delivery-notes">
      <DeliveryNoteView />
    </TabsContent>
    <TabsContent value="pick-lists">
      <PickListView />
    </TabsContent>
  </Tabs>
)}
```

### Update Procurement Module

Add RFQ and Supplier Quotations tabs:
- `<TabsTrigger value="rfq">RFQ</TabsTrigger>`
- `<TabsTrigger value="supplier-quotes">Supplier Quotations</TabsTrigger>`

### Add Quality Module (NEW)

```typescript
{activeModule === "quality" && (
  <Tabs defaultValue="inspections" className="space-y-6">
    <TabsList>
      <TabsTrigger value="inspections">Quality Inspections</TabsTrigger>
      <TabsTrigger value="templates">Inspection Templates</TabsTrigger>
    </TabsList>
    
    <TabsContent value="inspections">
      <QualityInspectionView />
    </TabsContent>
    <TabsContent value="templates">
      <InspectionTemplateView />
    </TabsContent>
  </Tabs>
)}
```

### Update Inventory Module

Add new tabs:
- `<TabsTrigger value="pick-lists">Pick Lists</TabsTrigger>`
- `<TabsTrigger value="landed-cost">Landed Cost</TabsTrigger>`
- `<TabsTrigger value="uom">Units of Measure</TabsTrigger>`

### Update Fixed Assets Module

Add maintenance tab:
- `<TabsTrigger value="maintenance">Maintenance</TabsTrigger>`
- `<TabsTrigger value="teams">Maintenance Teams</TabsTrigger>`

### Update Settings Module

Add payment terms tab:
- `<TabsTrigger value="payment-terms">Payment Terms</TabsTrigger>`

---

## Component Specifications

### PickListView Features
- Display pick list number, sales order reference, customer name
- Show warehouse, status, picked by, picked at
- Action menu: Start Picking, Complete, View Details
- Filter by status (All, Draft, In Progress, Completed)

### LandedCostView Features
- Display voucher number, GRN reference, posting date
- Show allocation method, total charges, status
- Action menu: Post, View Details, Cancel
- Filter by status

### UoMView Features  
- Two tabs: "Units of Measure" and "Conversions"
- UoM list with symbol
- Conversion rules with from/to UoM and factor
- Item-specific conversions

### AssetMaintenanceView Features
- Dashboard with upcoming maintenance alerts
- Maintenance log with asset name, type, date, team
- Priority badges (Low, Medium, High, Critical)
- Status workflow: Scheduled → In Progress → Completed

### MaintenanceTeamView Features
- Team grid/list view
- Team member count
- Team lead display
- Create/Edit team dialog

### PaymentTermsView Features
- Terms table with due days
- Early payment discount configuration
- Default term marker
- Active/Inactive status

### InspectionTemplateView Features
- Template list by type (Incoming, Outgoing, In-Process)
- Criteria count per template
- Active status toggle
- Expand to view/edit criteria

---

## Technical Specifications

### Imports to Add to Accounting.tsx

```typescript
// Inventory enhancements
import { PickListView } from "@/components/accounting/inventory/PickListView";
import { LandedCostView } from "@/components/accounting/inventory/LandedCostView";
import { UoMView } from "@/components/accounting/inventory/UoMView";

// Asset maintenance
import { AssetMaintenanceView } from "@/components/accounting/assets/AssetMaintenanceView";
import { MaintenanceTeamView } from "@/components/accounting/assets/MaintenanceTeamView";

// Settings
import { PaymentTermsView } from "@/components/accounting/settings/PaymentTermsView";

// Quality
import { InspectionTemplateView } from "@/components/accounting/quality/InspectionTemplateView";
```

---

## Expected Outcome

After implementation:

| Module | Before | After |
|--------|--------|-------|
| Selling | No tabs | Sales Orders, Delivery Notes, Pick Lists |
| Procurement | 4 tabs | 6 tabs (+RFQ, +Supplier Quotes) |
| Inventory | 9 tabs | 12 tabs (+Pick Lists, +Landed Cost, +UoM) |
| Assets | 5 tabs | 7 tabs (+Maintenance, +Teams) |
| Quality | Not visible | Inspections, Templates |
| Settings | 10 tabs | 11 tabs (+Payment Terms) |

**ERPNext Parity: ~45% → ~72%**

---

## Component Dependencies

All new components will use:
- Existing hooks from `useInventoryEnhanced.ts`, `useAssetMaintenance.ts`, `useSalesOrders.ts`, `useQualityInspection.ts`
- Existing UI patterns from similar components (Card, Table, Dialog, Badge)
- React Hook Form + Zod for forms
- Tanstack Query for data fetching
