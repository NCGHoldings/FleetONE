-- ==============================================================================
-- Zero-Downtime System Event Queue
-- Allows the frontend to instantly submit tasks (like generating AR Invoices)
-- without waiting for complex GL math. Background workers process the queue.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.system_event_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(255) NOT NULL, -- e.g., 'generate_sph_ar_invoice', 'post_ap_payment'
    payload JSONB NOT NULL DEFAULT '{}'::jsonb, -- All data required to execute the event
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    error_log TEXT,
    company_id UUID REFERENCES public.companies(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Index for fast queue polling
CREATE INDEX IF NOT EXISTS idx_system_event_queue_status ON public.system_event_queue(status, created_at) WHERE status IN ('pending', 'processing');

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_system_event_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_system_event_queue_updated_at ON public.system_event_queue;
CREATE TRIGGER trg_system_event_queue_updated_at
BEFORE UPDATE ON public.system_event_queue
FOR EACH ROW
EXECUTE FUNCTION update_system_event_queue_updated_at();

-- RLS Policies
ALTER TABLE public.system_event_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert events into the queue"
ON public.system_event_queue FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their company's events"
ON public.system_event_queue FOR SELECT
USING (company_id IN (
    SELECT company_id FROM public.user_company_access WHERE user_id = auth.uid()
));

-- (Optional) Policy for edge functions/service role to process all queues
-- Service roles bypass RLS automatically, so no explicit policy is needed for them.

COMMENT ON TABLE public.system_event_queue IS 'Master Event Queue for Zero-Downtime asynchronous processing of heavy financial pipelines.';
