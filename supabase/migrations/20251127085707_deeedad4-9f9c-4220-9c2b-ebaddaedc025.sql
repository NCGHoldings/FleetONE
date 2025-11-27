
-- Create function to fetch cron jobs (read-only)
CREATE OR REPLACE FUNCTION get_cron_jobs()
RETURNS TABLE (
  jobid bigint,
  jobname text,
  schedule text,
  active boolean,
  command text
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    jobid,
    jobname,
    schedule,
    active,
    command
  FROM cron.job
  ORDER BY jobid;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_cron_jobs() TO authenticated;
