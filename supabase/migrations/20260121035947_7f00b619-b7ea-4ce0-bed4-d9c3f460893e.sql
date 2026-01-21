-- Add missing columns to item_categories
ALTER TABLE public.item_categories ADD COLUMN IF NOT EXISTS valuation_method TEXT DEFAULT 'weighted_average';

-- Create recurring_journal_entries table
CREATE TABLE IF NOT EXISTS public.recurring_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL DEFAULT 'monthly', -- daily, weekly, monthly, quarterly, yearly
  next_run_date DATE NOT NULL,
  last_run_date DATE,
  is_active BOOLEAN DEFAULT true,
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  debit_account_id UUID REFERENCES public.chart_of_accounts(id),
  credit_account_id UUID REFERENCES public.chart_of_accounts(id),
  template_data JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create purchase_order_lines table
CREATE TABLE IF NOT EXISTS public.purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id),
  description TEXT NOT NULL,
  quantity NUMERIC(18,4) NOT NULL DEFAULT 1,
  unit_price NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(18,2) DEFAULT 0,
  line_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  received_quantity NUMERIC(18,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create stock_adjustments table
CREATE TABLE IF NOT EXISTS public.stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_number TEXT NOT NULL,
  adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  item_id UUID NOT NULL REFERENCES public.items(id),
  warehouse_id UUID REFERENCES public.warehouses(id),
  adjustment_type TEXT NOT NULL, -- increase, decrease, write_off
  quantity_before NUMERIC(18,4) NOT NULL DEFAULT 0,
  quantity_adjusted NUMERIC(18,4) NOT NULL,
  quantity_after NUMERIC(18,4) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(18,2) DEFAULT 0,
  total_value NUMERIC(18,2) DEFAULT 0,
  reason TEXT,
  reference TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create goods_receipt_lines table for GRN line items
CREATE TABLE IF NOT EXISTS public.goods_receipt_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id UUID NOT NULL REFERENCES public.goods_receipt_notes(id) ON DELETE CASCADE,
  po_line_id UUID REFERENCES public.purchase_order_lines(id),
  item_id UUID REFERENCES public.items(id),
  description TEXT,
  ordered_quantity NUMERIC(18,4) DEFAULT 0,
  received_quantity NUMERIC(18,4) NOT NULL,
  unit_price NUMERIC(18,2) DEFAULT 0,
  line_total NUMERIC(18,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.recurring_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipt_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recurring_journal_entries
CREATE POLICY "Finance users can manage recurring entries" ON public.recurring_journal_entries
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('finance', 'admin', 'super_admin'))
  );

-- RLS Policies for purchase_order_lines
CREATE POLICY "Finance users can manage PO lines" ON public.purchase_order_lines
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('finance', 'admin', 'super_admin'))
  );

-- RLS Policies for stock_adjustments
CREATE POLICY "Finance users can manage stock adjustments" ON public.stock_adjustments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('finance', 'admin', 'super_admin'))
  );

-- RLS Policies for goods_receipt_lines
CREATE POLICY "Finance users can manage GRN lines" ON public.goods_receipt_lines
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('finance', 'admin', 'super_admin'))
  );

-- Create sequence for stock adjustment numbers
CREATE SEQUENCE IF NOT EXISTS public.stock_adjustment_seq START 1;

-- Function to generate stock adjustment number
CREATE OR REPLACE FUNCTION public.generate_stock_adjustment_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  seq_val := nextval('public.stock_adjustment_seq');
  RETURN 'ADJ-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(seq_val::TEXT, 5, '0');
END;
$$;

-- Trigger to set stock adjustment number
CREATE OR REPLACE FUNCTION public.set_stock_adjustment_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.adjustment_number IS NULL OR NEW.adjustment_number = '' THEN
    NEW.adjustment_number = public.generate_stock_adjustment_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_set_stock_adjustment_number
  BEFORE INSERT ON public.stock_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_stock_adjustment_number();