-- Set up a daily cron job at 18:00 (6 PM) to trigger the ncg-fleetflow-eod-report Edge Function
-- Note: pg_cron uses UTC time. 18:00 IST (UTC+5:30) is 12:30 UTC.
-- We will schedule it for 12:30 UTC every day.

SELECT cron.schedule(
    'invoke-telegram-eod-report',
    '30 12 * * *',
    $$
    SELECT net.http_post(
        url:='https://[PROJECT_REF].supabase.co/functions/v1/ncg-fleetflow-eod-report',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer [ANON_KEY]"}'::jsonb,
        body:='{}'::jsonb,
        timeout_milliseconds:=10000
    );
    $$
);
