-- Create yutong_order_tasks table for process management
CREATE TABLE public.yutong_order_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES yutong_orders(id) ON DELETE CASCADE,
  process_type TEXT NOT NULL,
  task_id TEXT NOT NULL,
  task_label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  due_date DATE,
  assigned_to UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.yutong_order_tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "All authenticated users can view order tasks"
  ON public.yutong_order_tasks
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage order tasks"
  ON public.yutong_order_tasks
  FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'supervisor'::app_role, 'finance'::app_role]));

-- Create index for faster lookups
CREATE INDEX idx_yutong_order_tasks_order_id ON public.yutong_order_tasks(order_id);
CREATE INDEX idx_yutong_order_tasks_process_type ON public.yutong_order_tasks(process_type);

-- Create trigger to update updated_at
CREATE TRIGGER update_yutong_order_tasks_updated_at
  BEFORE UPDATE ON public.yutong_order_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();