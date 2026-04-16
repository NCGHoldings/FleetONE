-- 1. Add source_module column to journal_entries
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS source_module TEXT;

-- 2. Create payment-proofs storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS policies for payment-proofs bucket
CREATE POLICY "Authenticated users can upload payment proofs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Authenticated users can view payment proofs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'payment-proofs');

CREATE POLICY "Authenticated users can update payment proofs"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'payment-proofs');

CREATE POLICY "Authenticated users can delete payment proofs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'payment-proofs');

-- 4. Fix yutong order financials trigger to count 'verified' status
CREATE OR REPLACE FUNCTION public.update_yutong_order_financials()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.yutong_orders 
  SET 
    total_paid = (
      SELECT COALESCE(SUM(payment_amount), 0)
      FROM public.yutong_customer_payments 
      WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
      AND status IN ('received', 'verified')
    ),
    balance_due = total_amount - (
      SELECT COALESCE(SUM(payment_amount), 0)
      FROM public.yutong_customer_payments 
      WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
      AND status IN ('received', 'verified')
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 5. Backfill customer_category_id on yutong_orders from linked quotations
UPDATE public.yutong_orders o
SET customer_category_id = q.customer_category_id
FROM public.yutong_quotations q
WHERE o.quotation_id = q.id
  AND o.customer_category_id IS NULL
  AND q.customer_category_id IS NOT NULL;

-- 6. Backfill customer_category_id on sinotruck_orders
UPDATE public.sinotruck_orders o
SET customer_category_id = q.customer_category_id
FROM public.sinotruck_quotations q
WHERE o.quotation_id = q.id
  AND o.customer_category_id IS NULL
  AND q.customer_category_id IS NOT NULL;

-- 7. Backfill customer_category_id on lightvehicle_orders
UPDATE public.lightvehicle_orders o
SET customer_category_id = q.customer_category_id
FROM public.lightvehicle_quotations q
WHERE o.quotation_id = q.id
  AND o.customer_category_id IS NULL
  AND q.customer_category_id IS NOT NULL;