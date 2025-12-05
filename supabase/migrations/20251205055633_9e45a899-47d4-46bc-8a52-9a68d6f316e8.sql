-- Remove plain text password storage for security
ALTER TABLE public.temporary_accounts DROP COLUMN IF EXISTS plain_password_display;