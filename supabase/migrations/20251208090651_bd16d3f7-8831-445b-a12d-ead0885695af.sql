-- Add customer_class column to vehicle_inquiries table
ALTER TABLE public.vehicle_inquiries 
ADD COLUMN IF NOT EXISTS customer_class TEXT DEFAULT 'C0' 
CHECK (customer_class IN ('C0', 'C1', 'C2', 'C3'));

COMMENT ON COLUMN public.vehicle_inquiries.customer_class IS 'Customer Classification: C0=Inquiry Only, C1=Quotation Generated, C2=Advance Paid, C3=Invoice Paid';

-- Create function to auto-update customer_class when quotation is created
CREATE OR REPLACE FUNCTION public.update_inquiry_customer_class_on_quotation()
RETURNS TRIGGER AS $$
BEGIN
  -- When a quotation is created with an inquiry_id, update the inquiry's customer_class to C1
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for yutong_quotations
DROP TRIGGER IF EXISTS update_inquiry_class_on_yutong_quotation ON public.yutong_quotations;
CREATE TRIGGER update_inquiry_class_on_yutong_quotation
  AFTER INSERT ON public.yutong_quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inquiry_customer_class_on_quotation();

-- Create trigger for sinotruck_quotations
DROP TRIGGER IF EXISTS update_inquiry_class_on_sinotruck_quotation ON public.sinotruck_quotations;
CREATE TRIGGER update_inquiry_class_on_sinotruck_quotation
  AFTER INSERT ON public.sinotruck_quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inquiry_customer_class_on_quotation();

-- Create function to auto-update customer_class when payment is made (C2 for advance, C3 for invoice/balance)
CREATE OR REPLACE FUNCTION public.update_inquiry_customer_class_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_inquiry_id UUID;
BEGIN
  -- Find the inquiry_id from the quotation
  SELECT q.inquiry_id INTO v_inquiry_id
  FROM public.yutong_quotations q
  WHERE q.id = NEW.quotation_id;
  
  IF v_inquiry_id IS NOT NULL THEN
    -- Check payment type and update class accordingly
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for yutong_customer_payments
DROP TRIGGER IF EXISTS update_inquiry_class_on_yutong_payment ON public.yutong_customer_payments;
CREATE TRIGGER update_inquiry_class_on_yutong_payment
  AFTER INSERT ON public.yutong_customer_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inquiry_customer_class_on_payment();