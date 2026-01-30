-- NCG Express Finance Settings table
CREATE TABLE IF NOT EXISTS public.ncg_express_finance_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  
  -- Revenue Accounts
  ticket_revenue_account_id UUID REFERENCES public.chart_of_accounts(id),
  route_revenue_account_id UUID REFERENCES public.chart_of_accounts(id),
  cash_account_id UUID REFERENCES public.chart_of_accounts(id),
  
  -- Expense Accounts (21 categories mapped to GL)
  fuel_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
  repair_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
  tyre_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
  salary_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
  police_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
  food_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
  emission_fitness_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
  permits_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
  staff_accommodation_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
  highway_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
  accident_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
  parking_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
  log_sheet_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
  vehicle_hire_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
  ntc_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
  runner_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
  short_misc_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
  temporary_permit_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
  body_wash_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
  legal_court_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
  other_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
  expense_cash_account_id UUID REFERENCES public.chart_of_accounts(id),
  
  -- Auto-posting Settings
  auto_post_revenue BOOLEAN DEFAULT false,
  auto_post_expenses BOOLEAN DEFAULT false,
  revenue_prefix TEXT DEFAULT 'NCGE-REV',
  expense_prefix TEXT DEFAULT 'NCGE-EXP',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(company_id)
);

-- Add GL posting columns to daily_trips
ALTER TABLE public.daily_trips 
ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES public.journal_entries(id),
ADD COLUMN IF NOT EXISTS gl_posted BOOLEAN DEFAULT false;

-- Add GL posting columns to daily_bus_expenses
ALTER TABLE public.daily_bus_expenses
ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES public.journal_entries(id),
ADD COLUMN IF NOT EXISTS gl_posted BOOLEAN DEFAULT false;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_daily_trips_gl_posted ON public.daily_trips(gl_posted) WHERE gl_posted = false OR gl_posted IS NULL;
CREATE INDEX IF NOT EXISTS idx_daily_bus_expenses_gl_posted ON public.daily_bus_expenses(gl_posted) WHERE gl_posted = false OR gl_posted IS NULL;
CREATE INDEX IF NOT EXISTS idx_ncg_express_finance_settings_company ON public.ncg_express_finance_settings(company_id);

-- Enable RLS
ALTER TABLE public.ncg_express_finance_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ncg_express_finance_settings
CREATE POLICY "Users can view ncg express finance settings" 
ON public.ncg_express_finance_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert ncg express finance settings" 
ON public.ncg_express_finance_settings 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update ncg express finance settings" 
ON public.ncg_express_finance_settings 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);