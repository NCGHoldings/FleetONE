-- Add customer_address column to yutong_quotations table
ALTER TABLE public.yutong_quotations 
ADD COLUMN customer_address TEXT;