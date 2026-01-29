
# Fix Light Vehicle Sales Flow - Order Creation from Quotations

## Problem Identified

The Light Vehicle module currently shows "No orders found. Orders are created from confirmed quotations." but there is no mechanism to actually create orders from confirmed quotations. The flow is broken because:

1. When a quotation status is changed to "confirmed", no order is automatically created
2. There is no "Create Order" button or modal to manually create orders from confirmed quotations
3. The module is missing the `useLightVehicleOrderManagement` hook that handles the quotation-to-order conversion

This is different from the Yutong and Sinotruck modules which have:
- A "Create Order" button in their Orders list
- A `CreateOrderModal` that shows confirmed quotations and allows order creation
- A dedicated order management hook with `createOrderFromQuotation()` function

---

## Solution

Replicate the Yutong/Sinotruck order creation pattern for Light Vehicle:

### Phase 1: Create Order Management Hook

Create `src/hooks/useLightVehicleOrderManagement.ts` with:
- `createOrderFromQuotation()` function
- `createPaymentSchedule()` function  
- `getOrdersWithDetails()` function
- `updateOrderPhase()` function

The hook will:
1. Fetch quotation details when creating an order
2. Generate order number (using pattern LVO-YYYY-NNNN)
3. Create order record in `lightvehicle_orders` table
4. Create payment schedule in `lightvehicle_payment_schedules` table
5. Update quotation status to `converted_to_order`

### Phase 2: Create Order Modal

Create `src/components/lightvehicle/LightVehicleCreateOrderModal.tsx`:
- Dropdown to select from confirmed quotations (excluding those already converted)
- Display selected quotation details (customer, vehicle, price)
- Payment mode selection (cash/lease)
- Expected delivery date input
- Order notes field
- Create Order button

### Phase 3: Update Orders List

Update `src/components/lightvehicle/LightVehicleOrdersList.tsx`:
- Add "Create Order" button in the header
- Add state for controlling the create order modal
- Import and render `LightVehicleCreateOrderModal`
- Add view mode toggle (table/card) like Yutong
- Display order details with progress tracking

### Phase 4: Database Trigger (if needed)

Check if `lightvehicle_orders` has an auto-numbering trigger. If not, create one:
- Function: `generate_lightvehicle_order_number()`
- Trigger: Auto-populate `order_number` on insert

---

## Files to Create

| File | Description |
|------|-------------|
| `src/hooks/useLightVehicleOrderManagement.ts` | Order creation, payment schedules, phase updates |
| `src/components/lightvehicle/LightVehicleCreateOrderModal.tsx` | Modal for creating orders from quotations |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/lightvehicle/LightVehicleOrdersList.tsx` | Add Create Order button, modal integration |
| `supabase/migrations/...` | Add order number generation trigger if missing |

---

## Technical Details

### Order Creation Flow

```text
User clicks "Create Order"
         │
         ▼
┌─────────────────────────┐
│  LightVehicleCreate     │
│  OrderModal opens       │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Load confirmed          │
│ quotations (not yet     │
│ converted to orders)    │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│ User selects quotation  │
│ + payment mode + notes  │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│ createOrderFromQuotation│
│ 1. Fetch quotation      │
│ 2. Insert order record  │
│ 3. Create pay schedule  │
│ 4. Update quotation     │
│    status to converted  │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Order appears in        │
│ Orders list             │
└─────────────────────────┘
```

### Payment Structure

**Cash Payment Mode:**
- 10% Advance (due immediately)
- 40% Interim (30 days)
- 50% Balance (on delivery)

**Lease Payment Mode:**
- 20% Down payment
- 80% Bank financing

### Hook Interface

```typescript
interface CreateOrderData {
  quotation_id: string;
  payment_mode: 'cash' | 'lease';
  expected_delivery_date?: string;
  notes?: string;
}

interface UseLightVehicleOrderManagement {
  isLoading: boolean;
  createOrderFromQuotation: (data: CreateOrderData) => Promise<{ success: boolean; order?: any; error?: any }>;
  getOrdersWithDetails: () => Promise<{ success: boolean; orders?: any[] }>;
  updateOrderPhase: (orderId: string, phase: string, progress: number) => Promise<{ success: boolean }>;
}
```

---

## Testing Checklist

After implementation:

1. **Create Order Flow**
   - Confirm a quotation (change status to "confirmed")
   - Go to Orders tab
   - Click "Create Order" button
   - Verify confirmed quotation appears in dropdown
   - Select quotation, choose payment mode
   - Click Create Order
   - Verify order appears in orders list

2. **Order Details**
   - Click View on a created order
   - Verify order shows customer details
   - Verify Financial tab shows payment schedule
   - Verify Documents tab works

3. **Quotation Status**
   - After creating order, verify quotation status changes to "converted_to_order"
   - Verify converted quotation no longer appears in Create Order dropdown

4. **Payment Schedule**
   - Verify payment milestones are created correctly
   - Check amounts match the percentages for selected payment mode
