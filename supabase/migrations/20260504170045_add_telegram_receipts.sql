-- Create the telegram_receipts table
CREATE TABLE IF NOT EXISTS public.telegram_receipts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    sender_name TEXT,
    image_url TEXT NOT NULL,
    storage_path TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add index for performance on status filtering
CREATE INDEX IF NOT EXISTS idx_telegram_receipts_status ON public.telegram_receipts(status);
CREATE INDEX IF NOT EXISTS idx_telegram_receipts_chat_id ON public.telegram_receipts(chat_id);

-- Drop existing policies if they exist so the script can be rerun safely
DROP POLICY IF EXISTS "Allow read access for all authenticated users" ON public.telegram_receipts;
DROP POLICY IF EXISTS "Allow update access for all authenticated users" ON public.telegram_receipts;
DROP POLICY IF EXISTS "Allow insert access" ON public.telegram_receipts;
DROP POLICY IF EXISTS "Allow insert access for service role" ON public.telegram_receipts;

-- Enable RLS
ALTER TABLE public.telegram_receipts ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users
CREATE POLICY "Allow read access for all authenticated users" ON public.telegram_receipts
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow update access for authenticated users (to change status)
CREATE POLICY "Allow update access for all authenticated users" ON public.telegram_receipts
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow insert access for service role and anon
CREATE POLICY "Allow insert access" ON public.telegram_receipts
    FOR INSERT WITH CHECK (true);

-- Insert the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('telegram-images', 'telegram-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the new bucket
DROP POLICY IF EXISTS "Give users read access to telegram-images" ON storage.objects;
DROP POLICY IF EXISTS "Give users upload access to telegram-images" ON storage.objects;
DROP POLICY IF EXISTS "Give users delete access to telegram-images" ON storage.objects;

CREATE POLICY "Give users read access to telegram-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'telegram-images');

CREATE POLICY "Give users upload access to telegram-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'telegram-images');

CREATE POLICY "Give users delete access to telegram-images"
ON storage.objects FOR DELETE
USING (bucket_id = 'telegram-images');
