
# Fix Light Vehicle RLS Policy Issues

## Problem

When creating an order from a confirmed quotation, the system fails with:
```
"new row violates row-level security policy for table 'lightvehicle_orders'"
```

This happens because several Light Vehicle tables are missing RLS policies for authenticated users. They only have `service_role` policies, which means only backend services can access them - not logged-in users from the app.

## Affected Tables

The following tables need RLS policies added for authenticated users:

| Table | Current State | Needed |
|-------|--------------|--------|
| `lightvehicle_orders` | service_role only | Add authenticated policies |
| `lightvehicle_order_tasks` | service_role only | Add authenticated policies |
| `lightvehicle_payment_schedules` | service_role only | Add authenticated policies |
| `lightvehicle_quotation_addons` | service_role only | Add authenticated policies |
| `lightvehicle_invoice_records` | service_role only | Add authenticated policies |
| `lightvehicle_invoice_documents` | service_role only | Add authenticated policies |
| `lightvehicle_invoice_signatures` | service_role only | Add authenticated policies |

## Solution

Create a database migration that adds proper RLS policies allowing authenticated users to perform CRUD operations on these tables.

### Migration File

Create `supabase/migrations/XXXX_fix_lightvehicle_rls_policies.sql`:

```sql
-- Fix missing RLS policies for Light Vehicle tables
-- These tables currently only have service_role policies

-- 1. lightvehicle_orders
CREATE POLICY "Authenticated users can view lightvehicle_orders" 
  ON public.lightvehicle_orders 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Authenticated users can insert lightvehicle_orders" 
  ON public.lightvehicle_orders 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update lightvehicle_orders" 
  ON public.lightvehicle_orders 
  FOR UPDATE 
  TO authenticated 
  USING (true);

CREATE POLICY "Authenticated users can delete lightvehicle_orders" 
  ON public.lightvehicle_orders 
  FOR DELETE 
  TO authenticated 
  USING (true);

-- 2. lightvehicle_order_tasks
CREATE POLICY "Authenticated users can manage lightvehicle_order_tasks" 
  ON public.lightvehicle_order_tasks 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- 3. lightvehicle_payment_schedules
CREATE POLICY "Authenticated users can manage lightvehicle_payment_schedules" 
  ON public.lightvehicle_payment_schedules 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- 4. lightvehicle_quotation_addons
CREATE POLICY "Authenticated users can manage lightvehicle_quotation_addons" 
  ON public.lightvehicle_quotation_addons 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- 5. lightvehicle_invoice_records
CREATE POLICY "Authenticated users can manage lightvehicle_invoice_records" 
  ON public.lightvehicle_invoice_records 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- 6. lightvehicle_invoice_documents
CREATE POLICY "Authenticated users can manage lightvehicle_invoice_documents" 
  ON public.lightvehicle_invoice_documents 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- 7. lightvehicle_invoice_signatures
CREATE POLICY "Authenticated users can manage lightvehicle_invoice_signatures" 
  ON public.lightvehicle_invoice_signatures 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);
```

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/XXXX_fix_lightvehicle_rls_policies.sql` | Add missing RLS policies |

## Expected Outcome

After this migration:
1. Authenticated users can create orders from quotations
2. Payment schedules can be created automatically
3. Invoice generation and signatures will work
4. Cash receipts can be created and managed
5. The complete Light Vehicle sales flow will function end-to-end

## Testing

After deployment:
1. Go to Light Vehicle Quotations
2. Click "Create Order" button
3. Select a confirmed quotation
4. Choose payment mode and set delivery date
5. Click "Create Order"
6. Verify order appears in the Orders list
7. Open order details and verify all tabs work
