-- Create yutong_cash_receipts table for cash receipt documents
CREATE TABLE public.yutong_cash_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.yutong_orders(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES public.yutong_customer_payments(id) ON DELETE CASCADE,
  receipt_no TEXT NOT NULL,
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL,
  amount_in_words TEXT,
  payment_method TEXT NOT NULL,
  product_description TEXT,
  quotation_no TEXT,
  customer_name TEXT,
  customer_address TEXT,
  customer_contact TEXT,
  customer_signature_data TEXT,
  customer_signature_type TEXT,
  customer_signed_at TIMESTAMPTZ,
  customer_signer_name TEXT,
  finance_signature_data TEXT,
  finance_signature_type TEXT,
  finance_signed_at TIMESTAMPTZ,
  finance_signer_name TEXT,
  pdf_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(payment_id)
);

-- Create index for faster queries
CREATE INDEX idx_yutong_cash_receipts_order_id ON public.yutong_cash_receipts(order_id);
CREATE INDEX idx_yutong_cash_receipts_payment_id ON public.yutong_cash_receipts(payment_id);
CREATE INDEX idx_yutong_cash_receipts_receipt_no ON public.yutong_cash_receipts(receipt_no);

-- Enable RLS
ALTER TABLE public.yutong_cash_receipts ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view all cash receipts"
  ON public.yutong_cash_receipts
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create cash receipts"
  ON public.yutong_cash_receipts
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update cash receipts"
  ON public.yutong_cash_receipts
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete cash receipts"
  ON public.yutong_cash_receipts
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_yutong_cash_receipts_updated_at
  BEFORE UPDATE ON public.yutong_cash_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();