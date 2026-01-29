
# Fix Missing Columns in lightvehicle_payment_schedules

## Problem

The error "Could not find the 'milestone_name' column of 'lightvehicle_payment_schedules' in the schema cache" occurs because the `lightvehicle_payment_schedules` table is missing several columns that the order creation code requires.

**Current Table Structure:**
- `id`, `order_id`, `payment_type`, `amount`, `due_date`, `status`, `notes`, `created_at`, `updated_at`

**Columns Being Inserted by Code:**
- `milestone_name` (missing)
- `sequence_order` (missing)

**Additional Columns for Parity with Yutong:**
- `payment_date` (missing)
- `payment_reference` (missing)
- `payment_method` (missing)

---

## Solution

Create a database migration to add the missing columns to `lightvehicle_payment_schedules`.

### Migration Details

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `milestone_name` | TEXT NOT NULL | 'Payment' | Name of the payment milestone (e.g., "Order Confirmation Advance") |
| `sequence_order` | INTEGER | 1 | Order in which payments should be made |
| `payment_date` | DATE | NULL | Actual date payment was received |
| `payment_reference` | TEXT | NULL | Reference number for the payment |
| `payment_method` | TEXT | NULL | Method of payment (cash, cheque, bank transfer) |

### SQL Migration

```sql
-- Add missing columns to lightvehicle_payment_schedules
ALTER TABLE public.lightvehicle_payment_schedules 
ADD COLUMN IF NOT EXISTS milestone_name TEXT NOT NULL DEFAULT 'Payment';

ALTER TABLE public.lightvehicle_payment_schedules 
ADD COLUMN IF NOT EXISTS sequence_order INTEGER DEFAULT 1;

ALTER TABLE public.lightvehicle_payment_schedules 
ADD COLUMN IF NOT EXISTS payment_date DATE;

ALTER TABLE public.lightvehicle_payment_schedules 
ADD COLUMN IF NOT EXISTS payment_reference TEXT;

ALTER TABLE public.lightvehicle_payment_schedules 
ADD COLUMN IF NOT EXISTS payment_method TEXT;
```

---

## Files

| File | Action |
|------|--------|
| `supabase/migrations/XXXX_add_lightvehicle_payment_schedule_columns.sql` | Create |
| `src/integrations/supabase/types.ts` | Auto-regenerated after migration |

---

## Expected Outcome

After this migration:
1. Order creation from quotation will succeed
2. Payment schedules will be created with proper milestone names
3. The Light Vehicle module will have full payment tracking like Yutong/Sinotruck

---

## Testing

After deployment:
1. Go to Light Vehicle Orders tab
2. Click "Create Order"
3. Select a confirmed quotation
4. Choose payment mode (Cash or Lease)
5. Click "Create Order"
6. Verify order is created successfully
7. Open order details and verify payment schedule shows milestones
