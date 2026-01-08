-- Add WhatsApp tracking columns to special_hire_quotations
ALTER TABLE special_hire_quotations
ADD COLUMN IF NOT EXISTS sent_via_whatsapp BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMP WITH TIME ZONE;