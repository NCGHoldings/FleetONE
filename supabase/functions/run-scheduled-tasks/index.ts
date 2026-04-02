import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { validateCronSecret, createUnauthorizedResponse } from "../_shared/cron-auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

interface ScheduledTask {
  id: string;
  name: string;
  task_type: string;
  schedule: string;
  next_run: string;
  last_run: string | null;
  is_active: boolean;
  config: Record<string, any>;
  company_id: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authResult = validateCronSecret(req);
  if (!authResult.valid) {
    console.warn('Unauthorized cron call attempt');
    return createUnauthorizedResponse(corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    console.log(`Running scheduled tasks check at: ${now.toISOString()}`);

    // Get all active scheduled tasks due to run
    const { data: tasks, error: fetchError } = await supabase
      .from('scheduled_tasks')
      .select('*')
      .eq('is_active', true)
      .lte('next_run', now.toISOString());

    if (fetchError) {
      console.error('Error fetching scheduled tasks:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${tasks?.length || 0} scheduled tasks to execute`);

    const results = {
      executed: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const task of (tasks || []) as ScheduledTask[]) {
      try {
        console.log(`Executing task: ${task.name} (${task.task_type})`);

        // Execute based on task type
        await executeTask(task, supabaseUrl, supabaseServiceKey);

        // Calculate next run time
        const nextRun = calculateNextRun(task.schedule);

        // Update task with last_run and next_run
        const { error: updateError } = await supabase
          .from('scheduled_tasks')
          .update({
            last_run: now.toISOString(),
            next_run: nextRun.toISOString(),
            last_status: 'success'
          })
          .eq('id', task.id);

        if (updateError) {
          console.error(`Error updating task ${task.id}:`, updateError);
        }

        results.executed++;
        console.log(`Task ${task.name} executed successfully, next run: ${nextRun.toISOString()}`);

      } catch (taskErr) {
        console.error(`Error executing task ${task.id}:`, taskErr);
        results.failed++;
        results.errors.push(`${task.name}: ${(taskErr as Error).message}`);

        // Update task with error status
        await supabase
          .from('scheduled_tasks')
          .update({
            last_run: now.toISOString(),
            last_status: 'failed',
            last_error: taskErr.message
          })
          .eq('id', task.id);
      }
    }

    console.log(`Scheduled tasks complete. Executed: ${results.executed}, Failed: ${results.failed}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Executed ${results.executed} tasks`,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in run-scheduled-tasks:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function executeTask(
  task: ScheduledTask,
  supabaseUrl: string,
  serviceKey: string
): Promise<void> {
  const cronSecret = Deno.env.get('CRON_SECRET');
  
  switch (task.task_type) {
    case 'recurring_invoices':
      await callEdgeFunction(supabaseUrl, 'process-recurring-invoices', {}, cronSecret);
      break;
    
    case 'payment_reminders':
      await callEdgeFunction(supabaseUrl, 'process-payment-reminders', {}, cronSecret);
      break;
    
    case 'report_generation':
      // TODO: Implement report generation
      console.log('Report generation task type - not yet implemented');
      break;
    
    case 'data_cleanup':
      await executeDataCleanup(task.config, supabaseUrl, serviceKey);
      break;
    
    case 'aggregate_analytics':
      await callEdgeFunction(supabaseUrl, 'aggregate-fleet-analytics', {}, cronSecret);
      break;
    
    default:
      console.log(`Unknown task type: ${task.task_type}`);
  }
}

async function callEdgeFunction(
  supabaseUrl: string,
  functionName: string,
  body: Record<string, any>,
  cronSecret?: string
): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (cronSecret) {
    headers['x-cron-secret'] = cronSecret;
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/${functionName}`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Edge function ${functionName} failed: ${error}`);
  }
}

async function executeDataCleanup(
  config: Record<string, any>,
  supabaseUrl: string,
  serviceKey: string
): Promise<void> {
  const supabase = createClient(supabaseUrl, serviceKey);
  
  const { table, olderThanDays = 90 } = config;
  
  if (!table) {
    console.log('No table specified for data cleanup');
    return;
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  // Only cleanup log tables for safety
  const allowedTables = [
    'workflow_execution_log',
    'payment_reminder_log',
    'recurring_invoice_log',
    'api_usage_logs'
  ];

  if (!allowedTables.includes(table)) {
    console.log(`Table ${table} not allowed for automatic cleanup`);
    return;
  }

  const dateColumn = table.includes('log') ? 'created_at' : 'executed_at';
  
  const { error } = await supabase
    .from(table)
    .delete()
    .lt(dateColumn, cutoffDate.toISOString());

  if (error) {
    throw new Error(`Cleanup of ${table} failed: ${error.message}`);
  }

  console.log(`Cleaned up records older than ${olderThanDays} days from ${table}`);
}

function calculateNextRun(schedule: string): Date {
  const now = new Date();
  
  // Parse schedule string (simplified cron-like format)
  // Supported formats: hourly, daily, weekly, monthly, or custom interval like "6h", "30m"
  
  switch (schedule.toLowerCase()) {
    case 'hourly':
      now.setHours(now.getHours() + 1, 0, 0, 0);
      break;
    
    case 'daily':
      now.setDate(now.getDate() + 1);
      now.setHours(6, 0, 0, 0); // Default to 6 AM
      break;
    
    case 'weekly':
      now.setDate(now.getDate() + 7);
      now.setHours(6, 0, 0, 0);
      break;
    
    case 'monthly':
      now.setMonth(now.getMonth() + 1);
      now.setDate(1);
      now.setHours(6, 0, 0, 0);
      break;
    
    default:
      // Try to parse custom interval like "6h", "30m", "1d"
      const match = schedule.match(/^(\d+)([mhd])$/);
      if (match) {
        const value = parseInt(match[1]);
        const unit = match[2];
        
        switch (unit) {
          case 'm':
            now.setMinutes(now.getMinutes() + value);
            break;
          case 'h':
            now.setHours(now.getHours() + value);
            break;
          case 'd':
            now.setDate(now.getDate() + value);
            break;
        }
      } else {
        // Default to hourly if can't parse
        now.setHours(now.getHours() + 1);
      }
  }
  
  return now;
}
