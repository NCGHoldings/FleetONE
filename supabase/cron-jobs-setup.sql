-- ============================================
-- AUTOMATED CRON JOBS SETUP
-- ============================================
-- Run this SQL in Supabase SQL Editor to schedule automated tasks
-- https://supabase.com/dashboard/project/wwjpdszkmtnzshbulkon/sql/new
-- ============================================

-- 1. TYRE CONDITION SYNC - Every 6 hours
-- Updates tyre conditions based on current bus mileage
SELECT cron.schedule(
  'sync-tyre-conditions',
  '0 */6 * * *', -- Every 6 hours
  $$
  SELECT public.update_all_tyre_conditions();
  $$
);

-- 2. SERVICE ALERTS CHECK - Every hour
-- Checks if buses need maintenance based on mileage
SELECT cron.schedule(
  'check-service-alerts-hourly',
  '0 * * * *', -- Every hour
  $$
  SELECT net.http_post(
    url := 'https://wwjpdszkmtnzshbulkon.supabase.co/functions/v1/check-service-alerts',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3anBkc3prbXRuenNoYnVsa29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTQxMjAsImV4cCI6MjA3MTUzMDEyMH0.EiNNdtKsKSmiBxnpMrLjiQ45jYuJWqijjK-hCkpw_y4"}'::jsonb,
    body := jsonb_build_object('scheduled', true)
  ) AS request_id;
  $$
);

-- 3. FUEL ALERTS CHECK - Every hour
-- Monitors fuel levels and detects theft/abnormal consumption
SELECT cron.schedule(
  'check-fuel-alerts-hourly',
  '0 * * * *', -- Every hour
  $$
  SELECT net.http_post(
    url := 'https://wwjpdszkmtnzshbulkon.supabase.co/functions/v1/check-fuel-alerts',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3anBkc3prbXRuenNoYnVsa29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTQxMjAsImV4cCI6MjA3MTUzMDEyMH0.EiNNdtKsKSmiBxnpMrLjiQ45jYuJWqijjK-hCkpw_y4"}'::jsonb,
    body := jsonb_build_object('scheduled', true)
  ) AS request_id;
  $$
);

-- 4. FLEET ANALYTICS AGGREGATION - Daily at 2 AM Sri Lanka time
-- Aggregates daily fleet performance metrics
SELECT cron.schedule(
  'aggregate-fleet-analytics-daily',
  '0 2 * * *', -- Daily at 2 AM
  $$
  SELECT net.http_post(
    url := 'https://wwjpdszkmtnzshbulkon.supabase.co/functions/v1/aggregate-fleet-analytics',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3anBkc3prbXRuenNoYnVsa29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTQxMjAsImV4cCI6MjA3MTUzMDEyMH0.EiNNdtKsKSmiBxnpMrLjiQ45jYuJWqijjK-hCkpw_y4"}'::jsonb,
    body := jsonb_build_object('scheduled', true)
  ) AS request_id;
  $$
);

-- 5. FIOS GPS SYNC - Every 5 minutes
-- Fetches real-time GPS data from FIOS API
SELECT cron.schedule(
  'sync-fios-gps-tracking',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://wwjpdszkmtnzshbulkon.supabase.co/functions/v1/fetch-fios-tracking',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3anBkc3prbXRuenNoYnVsa29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTQxMjAsImV4cCI6MjA3MTUzMDEyMH0.EiNNdtKsKSmiBxnpMrLjiQ45jYuJWqijjK-hCkpw_y4"}'::jsonb,
    body := jsonb_build_object('scheduled', true)
  ) AS request_id;
  $$
);

-- 6. DRIVER EVENTS SYNC - Every 30 minutes
-- Fetches driver behavior events from FIOS
SELECT cron.schedule(
  'sync-driver-events',
  '*/30 * * * *', -- Every 30 minutes
  $$
  SELECT net.http_post(
    url := 'https://wwjpdszkmtnzshbulkon.supabase.co/functions/v1/fetch-driver-events',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3anBkc3prbXRuenNoYnVsa29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTQxMjAsImV4cCI6MjA3MTUzMDEyMH0.EiNNdtKsKSmiBxnpMrLjiQ45jYuJWqijjK-hCkpw_y4"}'::jsonb,
    body := jsonb_build_object('scheduled', true)
  ) AS request_id;
  $$
);

-- ============================================
-- VIEW SCHEDULED JOBS
-- ============================================
-- Run this to see all active cron jobs
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job
ORDER BY jobid;

-- ============================================
-- MANAGE JOBS (if needed)
-- ============================================
-- To disable a job: SELECT cron.unschedule('job-name');
-- To enable a job: Use the schedule command again
-- To delete a job: SELECT cron.unschedule('job-name');
