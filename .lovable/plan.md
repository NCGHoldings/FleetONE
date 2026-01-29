
# Fix Light Vehicle Order Buttons - View and Edit Functionality

## Problems Identified

### 1. View Button Issues
The "View" button opens `EnhancedLightVehicleOrderDetailsModal`, but this modal expects data fields that don't exist in the `lightvehicle_orders` table:

| Modal Expects | Order Table Has |
|--------------|-----------------|
| `order_no` | `order_number` |
| `quotation_no` | `quotation_id` (UUID only) |
| `order_date` | `created_at` |
| `vehicle_make`, `vehicle_model` | `vehicle_name` only |
| `customer_address`, `customer_phone`, `customer_email` | Not stored |
| `total_price` | `total_amount` |
| Technical specs (engine, chassis, etc.) | Not stored |

The modal crashes or shows empty data because it can't find the expected fields.

### 2. Edit Button Issues
The "Edit" button has no `onClick` handler - it does nothing when clicked.

---

## Solution

### Fix 1: Update EnhancedLightVehicleOrderDetailsModal

Modify the modal to:
1. Fetch order data WITH related quotation data using a join query
2. Map the actual database fields to display fields correctly
3. Handle missing data gracefully

The SQL query should join orders with quotations:
```sql
lightvehicle_orders (*, lightvehicle_quotations!quotation_id (*))
```

### Fix 2: Create Edit Order Modal

Create `LightVehicleEditOrderModal.tsx` to allow editing:
- Order status
- Expected delivery date
- Actual delivery date  
- Notes
- Current phase/progress

### Fix 3: Update Orders List

Wire the Edit button to open the new edit modal.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/lightvehicle/EnhancedLightVehicleOrderDetailsModal.tsx` | Fix data loading to join with quotations, map correct field names |
| `src/components/lightvehicle/LightVehicleOrdersList.tsx` | Add Edit modal state and wire Edit button |

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/lightvehicle/LightVehicleEditOrderModal.tsx` | Modal for editing order details |

---

## Technical Details

### Data Mapping Fix

The modal needs to handle both scenarios:
1. Orders created with full data (legacy)
2. Orders created from quotations (current)

For quotation-based orders, pull customer and vehicle details from the linked quotation:

```typescript
// Load order with quotation data
const { data } = await supabase
  .from('lightvehicle_orders')
  .select(`
    *,
    quotation:lightvehicle_quotations!quotation_id (
      quotation_number,
      customer_address,
      customer_phone,
      customer_email,
      engine_cc,
      transmission,
      fuel_type,
      color,
      year
    )
  `)
  .eq('id', orderId)
  .single();

// Map to display format
const displayOrder = {
  order_no: data.order_number,
  quotation_no: data.quotation?.quotation_number,
  customer_name: data.customer_name,
  customer_address: data.quotation?.customer_address,
  customer_phone: data.quotation?.customer_phone,
  // ... etc
};
```

### Edit Modal Fields

The edit modal will allow modifying:
- **Status**: pending, processing, shipped, delivered, cancelled
- **Expected Delivery Date**: Date picker
- **Actual Delivery Date**: Date picker (for completed orders)
- **Current Phase**: Dropdown with phases
- **Progress Percentage**: Slider or input
- **Notes**: Text area

---

## Testing Checklist

After implementation:

1. **View Button Test**
   - Click "View" on any order
   - Verify modal opens and shows order details
   - Verify customer info displays (from quotation)
   - Verify vehicle info displays
   - Verify financial summary shows correct amounts
   - Check all tabs work (Overview, Financial, Documents, Progress)

2. **Edit Button Test**
   - Click "Edit" on any order
   - Verify edit modal opens
   - Change status and save
   - Verify order list reflects changes
   - Test editing delivery dates
   - Test updating notes
