
# Light Vehicle Complete Sales Flow - Full Development Plan

## Executive Summary

This plan will bring the Light Vehicle Sales module to full feature parity with the Yutong module, ensuring a complete end-to-end sales workflow from quotation to delivery with proper payment tracking, document generation, and signature management.

---

## Current State Analysis

### What Light Vehicle Has (Partially Working)
| Component | Status | Issues |
|-----------|--------|--------|
| Order Details Modal | Partial | Missing payment tracking integration |
| Cash Receipt System | Exists | Not integrated with payment verification flow |
| Invoice Generator | Exists | Working but limited view/download functions |
| Payment Tracking | Exists | Not integrated into Order Details modal |
| Progress Tab | Basic | Static timeline, missing journey tracking |

### What Yutong Has (Light Vehicle Needs)
| Feature | Yutong Component | Light Vehicle Status |
|---------|-----------------|---------------------|
| Order Journey Tracker | YutongOrderJourney | Missing |
| Integrated Payment Tracking | YutongPaymentTracking in Financial tab | Missing integration |
| Cash Receipt from Payment | Generate Receipt button per payment | Exists but broken |
| Invoice View/Approve | YutongOrderInvoiceViewModal with signatures | Exists but limited |
| Process Management | ProcessManagement for multi-stage operations | Missing |
| Operations Tab | Supplier, Logistics, Customs, etc. | Missing |

---

## Implementation Plan

### Phase 1: Fix Order Details Modal Integration

The `EnhancedLightVehicleOrderDetailsModal` needs to properly integrate the `LightVehiclePaymentTracking` component in the Financial tab instead of the current inline implementation.

**Current Problem**: Financial tab has custom inline payment display that doesn't match the full-featured `LightVehiclePaymentTracking` component.

**Solution**: Replace the inline Financial tab content with the proper `LightVehiclePaymentTracking` component that includes:
- Payment schedule display with milestones
- Record payment functionality
- Verify payment with GL posting
- Generate receipt per payment
- Complete payment history

### Phase 2: Create Order Journey Component

Create `LightVehicleOrderJourney.tsx` modeled on `YutongOrderJourney.tsx` with stages appropriate for light vehicle sales:

**Proposed Light Vehicle Journey Stages**:
1. Order Confirmation
2. Payment Collection (Advance)
3. Vehicle Preparation
4. Documentation
5. Vehicle Inspection
6. RMV Registration (if applicable)
7. Final Inspection
8. Delivery

### Phase 3: Enhance Financial Tab

Replace current Financial tab with integrated payment tracking:

```text
Financial Tab Structure:
+----------------------------------+
| Payment Summary Cards            |
| [Total] [Paid] [Pending] [Due]   |
+----------------------------------+
| Payment Schedule                 |
| - Milestone 1: Advance (10%)     |
| - Milestone 2: Interim (40%)     |
| - Milestone 3: Balance (50%)     |
+----------------------------------+
| Payment History                  |
| [Date] [Ref] [Amount] [Status]   |
| Actions: Verify | Generate Receipt|
+----------------------------------+
| Cash Receipts                    |
| View/Download generated receipts |
+----------------------------------+
```

### Phase 4: Add Journey/Operations Tab

Add new tabs to match Yutong structure:
- **Journey Tab**: Visual order progress tracker
- **Operations Tab**: Process management for vehicle preparation

### Phase 5: Ensure Receipt Integration Works

Fix the cash receipt generation flow:
1. When payment is verified, enable "Generate Receipt" button
2. Receipt modal opens with signature collection
3. PDF download with customer and finance signatures
4. Status update to "finalized"

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/lightvehicle/EnhancedLightVehicleOrderDetailsModal.tsx` | Add Journey tab, integrate LightVehiclePaymentTracking in Financial tab, add Operations tab |

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/lightvehicle/LightVehicleOrderJourney.tsx` | Visual order progress tracker with stages |
| `src/components/lightvehicle/LightVehicleProcessManagement.tsx` | Process management for vehicle operations |

---

## Technical Details

### EnhancedLightVehicleOrderDetailsModal Changes

**Current Tabs**: Overview, Financial, Documents, Progress

**New Tabs**: Overview, Journey, Financial, Documents, Operations

```typescript
// Add import for new components
import { LightVehiclePaymentTracking } from './LightVehiclePaymentTracking';
import { LightVehicleOrderJourney } from './LightVehicleOrderJourney';

// Update TabsList to include new tabs
<TabsList className="grid w-full grid-cols-5">
  <TabsTrigger value="overview">Overview</TabsTrigger>
  <TabsTrigger value="journey">Journey</TabsTrigger>
  <TabsTrigger value="financial">Financial</TabsTrigger>
  <TabsTrigger value="documents">Documents</TabsTrigger>
  <TabsTrigger value="operations">Operations</TabsTrigger>
</TabsList>

// Journey Tab - NEW
<TabsContent value="journey">
  <LightVehicleOrderJourney order={order} onRefresh={loadOrder} />
</TabsContent>

// Financial Tab - REPLACE current content
<TabsContent value="financial">
  <LightVehiclePaymentTracking 
    orderId={order.id} 
    onRefresh={loadOrder} 
  />
</TabsContent>
```

### LightVehicleOrderJourney Component Structure

```typescript
// Light vehicle specific journey stages
const journeySteps = [
  { key: 'order_confirmation', label: 'Order Confirmation', days: 1 },
  { key: 'payment_collection', label: 'Payment Collection', days: 3 },
  { key: 'vehicle_preparation', label: 'Vehicle Preparation', days: 5 },
  { key: 'documentation', label: 'Documentation', days: 2 },
  { key: 'vehicle_inspection', label: 'Vehicle Inspection', days: 1 },
  { key: 'registration', label: 'RMV Registration', days: 5 },
  { key: 'final_check', label: 'Final Check', days: 1 },
  { key: 'delivery', label: 'Delivery', days: 1 }
];
```

### LightVehiclePaymentTracking Integration

The existing component already has:
- Payment recording
- Payment verification with GL posting
- Payment schedule display
- Milestone tracking

Needs to add:
- Cash receipt generation button per verified payment
- Integration with `useLightVehicleCashReceipts` hook
- View receipt modal trigger

---

## Expected Outcome

After implementation:

1. **Complete Order View**: Modal shows all order details with proper data from quotation join
2. **Visual Journey Tracking**: Users can see order progress through defined stages
3. **Full Payment Workflow**: Record payment -> Verify -> GL Post -> Generate Receipt -> Sign -> Finalize
4. **Invoice Management**: Generate Direct/Proforma invoices with signatures
5. **Operations Tracking**: Track vehicle preparation, inspection, and delivery stages
6. **Cash Receipts**: Professional receipts with customer and finance signatures

---

## Testing Checklist

After implementation:

1. **Order List**
   - View button opens modal correctly
   - Edit button allows status updates
   - Orders display correct customer/vehicle info

2. **Journey Tab**
   - Shows current phase highlighted
   - Progress percentage matches phase
   - Can advance to next phase

3. **Financial Tab**
   - Payment summary shows correct totals
   - Payment schedules display with milestones
   - Record Payment works
   - Verify Payment posts to GL
   - Generate Receipt creates cash receipt
   - View Receipt opens modal with signatures

4. **Documents Tab**
   - Generate Invoice (Direct/Proforma) works
   - View Invoice shows preview
   - Download Invoice works
   - Invoice signatures can be added

5. **Operations Tab**
   - Vehicle preparation stages tracked
   - Inspection checklist available
   - Delivery confirmation works
