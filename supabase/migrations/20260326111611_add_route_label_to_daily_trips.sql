-- Migration to add route_label column to daily_trips
ALTER TABLE public.daily_trips ADD COLUMN IF NOT EXISTS route_label TEXT;
