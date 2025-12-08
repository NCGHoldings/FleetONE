-- Fix search_path for the new functions
CREATE OR REPLACE FUNCTION public.update_inquiry_customer_class_on_quotation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.inquiry_id IS NOT NULL THEN
    UPDATE public.vehicle_inquiries 
    SET customer_class = 'C1',
        converted_to_quotation_id = NEW.id,
        converted_at = NOW(),
        status = 'converted'
    WHERE id = NEW.inquiry_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_inquiry_customer_class_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_inquiry_id UUID;
BEGIN
  SELECT q.inquiry_id INTO v_inquiry_id
  FROM public.yutong_quotations q
  WHERE q.id = NEW.quotation_id;
  
  IF v_inquiry_id IS NOT NULL THEN
    IF NEW.payment_type = 'advance' OR NEW.payment_type = 'deposit' THEN
      UPDATE public.vehicle_inquiries 
      SET customer_class = 'C2'
      WHERE id = v_inquiry_id AND customer_class IN ('C0', 'C1');
    ELSIF NEW.payment_type IN ('balance', 'final', 'invoice') THEN
      UPDATE public.vehicle_inquiries 
      SET customer_class = 'C3'
      WHERE id = v_inquiry_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;