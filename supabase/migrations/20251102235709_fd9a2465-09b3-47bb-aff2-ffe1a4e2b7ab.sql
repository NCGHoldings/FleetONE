-- Drop the trigger that causes infinite recursion
DROP TRIGGER IF EXISTS trigger_update_active_themes ON seasonal_themes;

-- We no longer need the automatic trigger since the edge function 
-- handles theme activation manually via the "Refresh Active Status" button