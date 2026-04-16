
ALTER TABLE public.ap_payments
ADD CONSTRAINT ap_payments_bank_account_id_fkey
FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id);
