-- Phase 1: Enhance inquiry_follow_ups table with future planning fields
ALTER TABLE inquiry_follow_ups 
ADD COLUMN IF NOT EXISTS planned_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS planned_duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS completion_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS outcome TEXT,
ADD COLUMN IF NOT EXISTS outcome_notes TEXT,
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_date TIMESTAMPTZ;

-- Add check constraint for completion_status
ALTER TABLE inquiry_follow_ups 
DROP CONSTRAINT IF EXISTS inquiry_follow_ups_completion_status_check;

ALTER TABLE inquiry_follow_ups 
ADD CONSTRAINT inquiry_follow_ups_completion_status_check 
CHECK (completion_status IN ('pending', 'completed', 'cancelled', 'rescheduled'));

-- Add check constraint for outcome
ALTER TABLE inquiry_follow_ups 
DROP CONSTRAINT IF EXISTS inquiry_follow_ups_outcome_check;

ALTER TABLE inquiry_follow_ups 
ADD CONSTRAINT inquiry_follow_ups_outcome_check 
CHECK (outcome IN ('positive', 'neutral', 'negative', 'no_response') OR outcome IS NULL);

-- Phase 2: Add inquiry_id to quotation tables for bidirectional linking
ALTER TABLE yutong_quotations 
ADD COLUMN IF NOT EXISTS inquiry_id UUID REFERENCES vehicle_inquiries(id) ON DELETE SET NULL;

ALTER TABLE sinotruck_quotations 
ADD COLUMN IF NOT EXISTS inquiry_id UUID REFERENCES vehicle_inquiries(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_yutong_quotations_inquiry_id ON yutong_quotations(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_sinotruck_quotations_inquiry_id ON sinotruck_quotations(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_follow_ups_planned_date ON inquiry_follow_ups(planned_date);
CREATE INDEX IF NOT EXISTS idx_inquiry_follow_ups_completion_status ON inquiry_follow_ups(completion_status);

-- Phase 3: Create inquiry_activity_log table for complete audit trail
CREATE TABLE IF NOT EXISTS inquiry_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES vehicle_inquiries(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add check constraint for activity_type
ALTER TABLE inquiry_activity_log 
DROP CONSTRAINT IF EXISTS inquiry_activity_log_activity_type_check;

ALTER TABLE inquiry_activity_log 
ADD CONSTRAINT inquiry_activity_log_activity_type_check 
CHECK (activity_type IN (
  'status_change', 
  'follow_up_added', 
  'follow_up_completed',
  'meeting_scheduled',
  'meeting_completed',
  'quotation_created', 
  'assigned', 
  'notes_updated',
  'converted'
));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inquiry_activity_log_inquiry_id ON inquiry_activity_log(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_activity_log_created_at ON inquiry_activity_log(created_at DESC);

-- Enable RLS
ALTER TABLE inquiry_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inquiry_activity_log
CREATE POLICY "Authenticated users can view activity logs"
  ON inquiry_activity_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert activity logs"
  ON inquiry_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE inquiry_activity_log IS 'Tracks all activity on vehicle inquiries for audit trail and timeline visualization';
COMMENT ON COLUMN inquiry_follow_ups.planned_date IS 'Scheduled date/time for future meeting or call';
COMMENT ON COLUMN inquiry_follow_ups.completion_status IS 'Status of the follow-up action: pending, completed, cancelled, or rescheduled';
COMMENT ON COLUMN inquiry_follow_ups.outcome IS 'Outcome of completed interaction: positive (interested), neutral, negative (not interested), or no_response';