-- ===========================================
-- Phase 1: Automation Engine Database Tables
-- ===========================================

-- Recurring Invoices
CREATE TABLE public.recurring_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id),
    customer_id UUID REFERENCES public.customers(id) NOT NULL,
    template_name TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(15,2) NOT NULL,
    tax_rate NUMERIC(5,2) DEFAULT 0,
    tax_amount NUMERIC(15,2) DEFAULT 0,
    total_amount NUMERIC(15,2) NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    day_of_month INTEGER,
    day_of_week INTEGER,
    next_run_date DATE NOT NULL,
    last_run_date DATE,
    start_date DATE NOT NULL,
    end_date DATE,
    auto_send_email BOOLEAN DEFAULT false,
    email_template TEXT,
    payment_terms_days INTEGER DEFAULT 30,
    account_id UUID REFERENCES public.chart_of_accounts(id),
    is_active BOOLEAN DEFAULT true,
    invoices_generated INTEGER DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Payment Reminder Rules
CREATE TABLE public.payment_reminder_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id),
    rule_name TEXT NOT NULL,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('before_due', 'on_due', 'after_due')),
    days_offset INTEGER NOT NULL DEFAULT 0,
    reminder_channel TEXT NOT NULL CHECK (reminder_channel IN ('email', 'sms', 'both')),
    email_subject TEXT,
    email_template TEXT,
    sms_template TEXT,
    is_active BOOLEAN DEFAULT true,
    applies_to_ar BOOLEAN DEFAULT true,
    applies_to_ap BOOLEAN DEFAULT false,
    min_amount NUMERIC(15,2),
    max_amount NUMERIC(15,2),
    priority INTEGER DEFAULT 1,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Workflow Rules (General automation)
CREATE TABLE public.workflow_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id),
    rule_name TEXT NOT NULL,
    description TEXT,
    trigger_module TEXT NOT NULL,
    trigger_event TEXT NOT NULL CHECK (trigger_event IN ('create', 'update', 'delete', 'status_change', 'approval', 'payment')),
    trigger_conditions JSONB DEFAULT '{}',
    action_type TEXT NOT NULL CHECK (action_type IN ('email', 'field_update', 'webhook', 'create_record', 'notification')),
    action_config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    execution_order INTEGER DEFAULT 1,
    last_triggered_at TIMESTAMPTZ,
    trigger_count INTEGER DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Scheduled Tasks
CREATE TABLE public.scheduled_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id),
    task_name TEXT NOT NULL,
    task_type TEXT NOT NULL CHECK (task_type IN ('report_generation', 'data_cleanup', 'auto_posting', 'reminder_batch', 'recurring_invoice', 'backup')),
    schedule_cron TEXT,
    schedule_type TEXT CHECK (schedule_type IN ('daily', 'weekly', 'monthly', 'custom')),
    schedule_time TIME,
    schedule_day INTEGER,
    task_config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    last_run_status TEXT CHECK (last_run_status IN ('success', 'failed', 'running', 'skipped')),
    last_run_error TEXT,
    run_count INTEGER DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Workflow Execution Log
CREATE TABLE public.workflow_execution_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_rule_id UUID REFERENCES public.workflow_rules(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id),
    trigger_record_id TEXT,
    trigger_record_type TEXT,
    execution_status TEXT CHECK (execution_status IN ('success', 'failed', 'skipped')),
    action_result JSONB,
    error_message TEXT,
    executed_at TIMESTAMPTZ DEFAULT now()
);

-- Payment Reminders Sent Log
CREATE TABLE public.payment_reminders_sent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reminder_rule_id UUID REFERENCES public.payment_reminder_rules(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.companies(id),
    invoice_id UUID,
    invoice_type TEXT CHECK (invoice_type IN ('ar', 'ap')),
    customer_id UUID REFERENCES public.customers(id),
    vendor_id UUID REFERENCES public.vendors(id),
    channel TEXT CHECK (channel IN ('email', 'sms')),
    recipient_email TEXT,
    recipient_phone TEXT,
    subject TEXT,
    message_content TEXT,
    sent_status TEXT CHECK (sent_status IN ('sent', 'failed', 'pending')),
    error_message TEXT,
    sent_at TIMESTAMPTZ DEFAULT now()
);

-- Generated Invoices from Recurring
CREATE TABLE public.recurring_invoice_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recurring_invoice_id UUID REFERENCES public.recurring_invoices(id) ON DELETE CASCADE,
    ar_invoice_id UUID REFERENCES public.ar_invoices(id),
    generated_at TIMESTAMPTZ DEFAULT now(),
    invoice_amount NUMERIC(15,2),
    status TEXT CHECK (status IN ('generated', 'sent', 'paid', 'failed'))
);

-- Enable RLS
ALTER TABLE public.recurring_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_reminder_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_execution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_reminders_sent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_invoice_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recurring_invoices
CREATE POLICY "Users can view recurring invoices" ON public.recurring_invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert recurring invoices" ON public.recurring_invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update recurring invoices" ON public.recurring_invoices FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete recurring invoices" ON public.recurring_invoices FOR DELETE TO authenticated USING (true);

-- RLS Policies for payment_reminder_rules
CREATE POLICY "Users can view reminder rules" ON public.payment_reminder_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert reminder rules" ON public.payment_reminder_rules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update reminder rules" ON public.payment_reminder_rules FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete reminder rules" ON public.payment_reminder_rules FOR DELETE TO authenticated USING (true);

-- RLS Policies for workflow_rules
CREATE POLICY "Users can view workflow rules" ON public.workflow_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert workflow rules" ON public.workflow_rules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update workflow rules" ON public.workflow_rules FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete workflow rules" ON public.workflow_rules FOR DELETE TO authenticated USING (true);

-- RLS Policies for scheduled_tasks
CREATE POLICY "Users can view scheduled tasks" ON public.scheduled_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert scheduled tasks" ON public.scheduled_tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update scheduled tasks" ON public.scheduled_tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete scheduled tasks" ON public.scheduled_tasks FOR DELETE TO authenticated USING (true);

-- RLS Policies for logs
CREATE POLICY "Users can view workflow logs" ON public.workflow_execution_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert workflow logs" ON public.workflow_execution_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can view reminder logs" ON public.payment_reminders_sent FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert reminder logs" ON public.payment_reminders_sent FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can view recurring history" ON public.recurring_invoice_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert recurring history" ON public.recurring_invoice_history FOR INSERT TO authenticated WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_recurring_invoices_company ON public.recurring_invoices(company_id);
CREATE INDEX idx_recurring_invoices_customer ON public.recurring_invoices(customer_id);
CREATE INDEX idx_recurring_invoices_next_run ON public.recurring_invoices(next_run_date) WHERE is_active = true;

CREATE INDEX idx_payment_reminder_rules_company ON public.payment_reminder_rules(company_id);
CREATE INDEX idx_workflow_rules_company ON public.workflow_rules(company_id);
CREATE INDEX idx_workflow_rules_module ON public.workflow_rules(trigger_module);

CREATE INDEX idx_scheduled_tasks_company ON public.scheduled_tasks(company_id);
CREATE INDEX idx_scheduled_tasks_next_run ON public.scheduled_tasks(next_run_at) WHERE is_active = true;

CREATE INDEX idx_workflow_log_rule ON public.workflow_execution_log(workflow_rule_id);
CREATE INDEX idx_reminders_sent_invoice ON public.payment_reminders_sent(invoice_id);