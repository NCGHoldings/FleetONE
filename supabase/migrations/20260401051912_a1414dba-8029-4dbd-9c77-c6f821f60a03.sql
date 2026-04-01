
-- 1. Add new SHS bank account to LIVE COA
INSERT INTO public.chart_of_accounts (
  company_id, account_code, account_name, account_type, 
  is_header, is_active, account_level, current_balance
)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '13001011',
  'COMMERCIAL BANK C/A - 1001077213 (SHS)',
  'asset',
  false,
  true,
  5,
  0
);

-- 2. Insert LIVE company special hire finance settings
INSERT INTO public.special_hire_finance_settings (
  company_id,
  revenue_internal_account_id,
  revenue_external_account_id,
  trade_receivable_account_id,
  customer_advance_account_id,
  default_bank_account_id,
  vat_output_account_id,
  wht_payable_account_id,
  commission_expense_account_id,
  auto_post_invoices,
  auto_post_advance_payments,
  auto_post_balance_payments,
  invoice_prefix,
  advance_receipt_prefix,
  quotation_bank_name,
  quotation_account_name,
  quotation_account_no
)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '51f1c30d-1bb8-4056-b423-82ced47ba3b0',
  'd28e31b7-52b9-45ad-85aa-e75e7661bad9',
  'a1678110-362a-4e45-8014-350e49620b8f',
  'ffe5f2b1-c2ad-4598-874d-153852a55646',
  (SELECT id FROM public.chart_of_accounts WHERE company_id = 'a0000000-0000-0000-0000-000000000001' AND account_code = '13001011' LIMIT 1),
  '7f4b14be-19ba-453d-ae83-c93f394f60c9',
  '6fdfcd2d-714e-49cc-9c23-35308247bc79',
  '54f07249-a254-4d12-8d1d-7f68c6a76230',
  true,
  true,
  true,
  'SPH-INV',
  'SPH-ADV',
  'Commercial Bank - Nugegoda',
  'NCG EXPRESS (PVT) LTD',
  '1001077213'
);

-- 3. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
