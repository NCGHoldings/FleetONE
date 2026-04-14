-- Create import batches table to track imports
CREATE TABLE yutong_old_sales_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  total_records INTEGER DEFAULT 0,
  imported_by UUID REFERENCES auth.users(id),
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'completed'
);

-- Create old sales table to store imported historical data
CREATE TABLE yutong_old_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  row_number INTEGER,
  quotation_no TEXT,
  quoted_date DATE,
  entered_by TEXT,
  customer_name TEXT NOT NULL,
  company_name TEXT,
  customer_address TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  bus_model TEXT,
  optional_specifications TEXT,
  quantity INTEGER DEFAULT 1,
  base_price NUMERIC DEFAULT 0,
  total_before_discount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  subtotal_price NUMERIC DEFAULT 0,
  vat_amount NUMERIC DEFAULT 0,
  advance_payment NUMERIC DEFAULT 0,
  final_price NUMERIC DEFAULT 0,
  sales_person TEXT,
  quotation_status TEXT,
  import_batch_id UUID REFERENCES yutong_old_sales_imports(id) ON DELETE CASCADE,
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  converted_to_quotation_id UUID REFERENCES yutong_quotations(id),
  converted_to_order_id UUID REFERENCES yutong_orders(id),
  notes TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE yutong_old_sales_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE yutong_old_sales ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for yutong_old_sales_imports
CREATE POLICY "Users can view all old sales imports"
ON yutong_old_sales_imports FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert old sales imports"
ON yutong_old_sales_imports FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update old sales imports"
ON yutong_old_sales_imports FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete old sales imports"
ON yutong_old_sales_imports FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create RLS policies for yutong_old_sales
CREATE POLICY "Users can view all old sales"
ON yutong_old_sales FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert old sales"
ON yutong_old_sales FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update old sales"
ON yutong_old_sales FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete old sales"
ON yutong_old_sales FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX idx_yutong_old_sales_quotation_no ON yutong_old_sales(quotation_no);
CREATE INDEX idx_yutong_old_sales_customer_name ON yutong_old_sales(customer_name);
CREATE INDEX idx_yutong_old_sales_quoted_date ON yutong_old_sales(quoted_date);
CREATE INDEX idx_yutong_old_sales_status ON yutong_old_sales(quotation_status);
CREATE INDEX idx_yutong_old_sales_import_batch ON yutong_old_sales(import_batch_id);

-- Create trigger for updated_at
CREATE TRIGGER update_yutong_old_sales_updated_at
BEFORE UPDATE ON yutong_old_sales
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();