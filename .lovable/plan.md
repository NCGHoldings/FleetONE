
# Special Hire Quotation Duplicate Feature

## Overview
Add a "Duplicate/Repeat" option for Special Hire quotations, mirroring the existing Yutong quotation duplicate functionality. This allows users to quickly create new quotations based on existing ones with the same customer, route, and pricing details.

## Implementation Approach

### File 1: Create New Modal Component
**File:** `src/components/special-hire/SpecialHireQuotationRepeatModal.tsx`

Create a new modal component similar to `YutongQuotationRepeatModal.tsx` with:
- Number of copies input (1-20)
- Display original quotation summary (quotation no, customer, route, total)
- Generate unique quotation numbers with format `QUO-YYYY-MMDD-XXXX-v1.0`
- Copy all relevant fields while resetting:
  - Status to "draft"
  - Version to "1.0"
  - Clear trip_id, approval fields, payment fields
  - Generate new quotation_no

### Fields to Duplicate

| Field Category | Fields to Copy |
|----------------|----------------|
| Customer Info | customer_name, customer_phone, customer_email, company_name |
| Route Details | pickup_location, pickup_lat, pickup_lng, drop_location, drop_lat, drop_lng, intermediate_stops, parking_location_id, uses_multi_parking |
| Trip Details | hire_type, number_of_buses, number_of_passengers, bus_type_id, bus_fleet_details |
| Dates | pickup_datetime, drop_datetime, valid_until |
| Pricing | km_parking_to_pickup, km_trip, km_drop_to_parking, fuel_cost_fuel_only, hire_charge, extra_charges, gross_revenue, driver_charge, other_expenses, total_expenses, net_profit, percentage_adjustment |
| Commission | commission_pct, commission_amount, commission_pass_through_pct, commission_pass_through_amount, referral_agent_id, referral_commission_pct, referral_commission_amount |
| Discounts | discount_percentage, discount_type, discount_amount_lkr |
| Additional | additional_charges, total_additional_charges, customer_total_with_fuel, special_request, overtime_charge, overnight_charge, fixed_rate, exceeding_distance_charge |

### Fields NOT to Duplicate (Reset/Skip)

| Field | Reason |
|-------|--------|
| id | New UUID generated |
| quotation_no | New unique number generated |
| status | Reset to "draft" |
| version_number | Reset to "1.0" |
| is_active_version | Set to true |
| parent_quotation_id | Set to null (new quotation) |
| trip_id | Clear (no trip linked yet) |
| approval_status | Reset to "pending" |
| approved_by, approval_date, approval_comments | Clear |
| advance_paid, balance_due, total_paid | Reset to 0 |
| assigned_driver_name, assigned_conductor_name, assigned_bus_no | Clear |
| trip_status, cancellation_reason, status_changed_by/at | Clear |
| refund_* fields | Clear |
| submission_id | Clear |
| sent_via_whatsapp, whatsapp_sent_at | Clear |
| finance_customer_id, ar_invoice_id | Clear |
| audit_log | New audit log |
| created_by | Current user |
| created_at, updated_at | Auto-generated |

### File 2: Update QuotationsList.tsx

Add to the actions column:
1. Import the new modal component
2. Add state for repeat modal and selected quotation
3. Add a "Duplicate" button with Copy icon in the actions row
4. Render the modal at the bottom of the component

### UI Design

The duplicate button will be placed in the actions column after the Document Flow button:
```
[Eye] [GitBranch] [Copy] [Calculator] [Edit] [Delete] [Send] [Mail] [Download]
```

### Modal Features
- Shows original quotation details (number, customer, route, total revenue)
- Input for number of copies (1-20)
- Summary of what will be duplicated
- Loading state during creation
- Success toast with count of created quotations
- Auto-refresh list after success

## Technical Details

### Quotation Number Generation
```typescript
const generateQuotationNo = async (index: number): Promise<string> => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  // Count existing quotations for today
  const { count } = await supabase
    .from('special_hire_quotations')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${year}-${month}-${day}`);
  
  const nextNum = (count || 0) + index + 1;
  return `QUO-${year}-${month}${day}-v1.${String(nextNum).padStart(1, '0')}`;
};
```

### Data Flow
```
1. User clicks "Duplicate" button on quotation row
2. Modal opens showing original quotation details
3. User sets number of copies (default: 1)
4. User clicks "Create X Quotation(s)"
5. For each copy:
   a. Generate unique quotation number
   b. Fetch full quotation data from DB
   c. Create new record with copied fields
   d. Reset status/version/payment fields
6. Success toast and list refresh
```

## Files Summary

| File | Action |
|------|--------|
| `src/components/special-hire/SpecialHireQuotationRepeatModal.tsx` | CREATE |
| `src/components/special-hire/QuotationsList.tsx` | MODIFY (add duplicate button + modal) |
