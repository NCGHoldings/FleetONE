-- Add 3 new GL account mapping columns to asset_categories
ALTER TABLE public.asset_categories
  ADD COLUMN bank_account_id UUID REFERENCES public.chart_of_accounts(id),
  ADD COLUMN gain_loss_disposal_account_id UUID REFERENCES public.chart_of_accounts(id),
  ADD COLUMN revaluation_surplus_account_id UUID REFERENCES public.chart_of_accounts(id);