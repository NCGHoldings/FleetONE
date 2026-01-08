-- Add responsible_person column to yutong_quotations table
ALTER TABLE yutong_quotations 
ADD COLUMN IF NOT EXISTS responsible_person text;