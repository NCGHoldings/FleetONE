-- Add tyre_entries column to nsp_daily_sales table to support multiple tyre entries
ALTER TABLE nsp_daily_sales ADD COLUMN IF NOT EXISTS tyre_entries jsonb DEFAULT '[]'::jsonb;