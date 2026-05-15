-- Add service_checklist JSONB column to yutong_vehicle_records
ALTER TABLE public.yutong_vehicle_records 
ADD COLUMN IF NOT EXISTS service_checklist JSONB DEFAULT '{}'::jsonb;

-- Optional: Create an index for querying vehicles by specific checklist items if needed in the future
CREATE INDEX IF NOT EXISTS idx_yutong_vehicle_records_service_checklist 
ON public.yutong_vehicle_records USING GIN (service_checklist);
