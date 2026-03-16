import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkflowRule {
  id: string;
  name: string;
  trigger_module: string;
  trigger_event: string;
  conditions: Record<string, any>;
  actions: WorkflowAction[];
  is_active: boolean;
  company_id: string;
}

interface WorkflowAction {
  type: 'email_alert' | 'field_update' | 'webhook';
  config: Record<string, any>;
}

interface TriggerPayload {
  event: string;
  module: string;
  entity_id: string;
  entity_data: Record<string, any>;
  company_id?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: TriggerPayload = await req.json();
    console.log('Workflow trigger received:', JSON.stringify(payload));

    if (!payload.event || !payload.module || !payload.entity_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: event, module, entity_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all active workflow rules matching the trigger
    const { data: rules, error: rulesError } = await supabase
      .from('workflow_rules')
      .select('*')
      .eq('is_active', true)
      .eq('trigger_module', payload.module)
      .eq('trigger_event', payload.event);

    if (rulesError) {
      console.error('Error fetching workflow rules:', rulesError);
      throw rulesError;
    }

    console.log(`Found ${rules?.length || 0} matching workflow rules`);

    const results = {
      rulesEvaluated: 0,
      rulesExecuted: 0,
      actionsExecuted: 0,
      errors: [] as string[]
    };

    for (const rule of (rules || []) as WorkflowRule[]) {
      try {
        results.rulesEvaluated++;
        console.log(`Evaluating rule: ${rule.name}`);

        // Check if conditions match
        const conditionsMatch = evaluateConditions(rule.conditions, payload.entity_data);
        
        if (!conditionsMatch) {
          console.log(`Conditions not met for rule: ${rule.name}`);
          continue;
        }

        console.log(`Conditions met, executing rule: ${rule.name}`);
        results.rulesExecuted++;

        // Execute each action
        for (const action of rule.actions || []) {
          try {
            const actionResult = await executeAction(action, payload, supabase);
            
            // Log the execution
            await supabase.from('workflow_execution_log').insert({
              workflow_rule_id: rule.id,
              trigger_entity_type: payload.module,
              trigger_entity_id: payload.entity_id,
              action_type: action.type,
              action_result: actionResult,
              success: true,
              company_id: rule.company_id
            });

            results.actionsExecuted++;
            console.log(`Action ${action.type} executed successfully`);

          } catch (actionErr) {
            console.error(`Error executing action ${action.type}:`, actionErr);
            results.errors.push(`Action ${action.type}: ${(actionErr as Error).message}`);

            // Log the failure
            await supabase.from('workflow_execution_log').insert({
              workflow_rule_id: rule.id,
              trigger_entity_type: payload.module,
              trigger_entity_id: payload.entity_id,
              action_type: action.type,
              action_result: { error: (actionErr as Error).message },
              success: false,
              error_message: (actionErr as Error).message,
              company_id: rule.company_id
            });
          }
        }

      } catch (ruleErr) {
        console.error(`Error processing rule ${rule.id}:`, ruleErr);
        results.errors.push(`Rule ${rule.id}: ${(ruleErr as Error).message}`);
      }
    }

    console.log(`Workflow execution complete. Rules evaluated: ${results.rulesEvaluated}, executed: ${results.rulesExecuted}, actions: ${results.actionsExecuted}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Executed ${results.rulesExecuted} rules with ${results.actionsExecuted} actions`,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in execute-workflow-rules:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function evaluateConditions(conditions: Record<string, any>, entityData: Record<string, any>): boolean {
  if (!conditions || Object.keys(conditions).length === 0) {
    return true; // No conditions means always match
  }

  for (const [field, condition] of Object.entries(conditions)) {
    const entityValue = entityData[field];

    if (typeof condition === 'object' && condition !== null) {
      // Complex condition with operator
      const { operator, value } = condition;
      
      switch (operator) {
        case 'equals':
        case '=':
          if (entityValue !== value) return false;
          break;
        case 'not_equals':
        case '!=':
          if (entityValue === value) return false;
          break;
        case 'greater_than':
        case '>':
          if (entityValue <= value) return false;
          break;
        case 'less_than':
        case '<':
          if (entityValue >= value) return false;
          break;
        case 'contains':
          if (!String(entityValue).includes(value)) return false;
          break;
        case 'in':
          if (!Array.isArray(value) || !value.includes(entityValue)) return false;
          break;
        default:
          if (entityValue !== value) return false;
      }
    } else {
      // Simple equality check
      if (entityValue !== condition) return false;
    }
  }

  return true;
}

async function executeAction(
  action: WorkflowAction,
  payload: TriggerPayload,
  supabase: any
): Promise<Record<string, any>> {
  const { type, config } = action;

  switch (type) {
    case 'email_alert':
      return await executeEmailAlert(config, payload);
    
    case 'field_update':
      return await executeFieldUpdate(config, payload, supabase);
    
    case 'webhook':
      return await executeWebhook(config, payload);
    
    default:
      throw new Error(`Unknown action type: ${type}`);
  }
}

async function executeEmailAlert(
  config: Record<string, any>,
  payload: TriggerPayload
): Promise<Record<string, any>> {
  const { to, subject, body } = config;
  
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  
  if (!resendApiKey) {
    console.log('RESEND_API_KEY not configured, email alert skipped');
    return { sent: false, reason: 'Email service not configured' };
  }

  // Replace placeholders in subject and body
  const formattedSubject = formatTemplate(subject, payload.entity_data);
  const formattedBody = formatTemplate(body, payload.entity_data);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'NCG FleetFlow <noreply@ncgfleetflow.com>',
      to: Array.isArray(to) ? to : [to],
      subject: formattedSubject,
      html: formattedBody,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Email send failed: ${error}`);
  }

  return { sent: true, to, subject: formattedSubject };
}

async function executeFieldUpdate(
  config: Record<string, any>,
  payload: TriggerPayload,
  supabase: any
): Promise<Record<string, any>> {
  const { table, field, value } = config;
  
  const targetTable = table || getTableForModule(payload.module);
  
  const { error } = await supabase
    .from(targetTable)
    .update({ [field]: value })
    .eq('id', payload.entity_id);

  if (error) {
    throw new Error(`Field update failed: ${error.message}`);
  }

  return { updated: true, table: targetTable, field, value };
}

async function executeWebhook(
  config: Record<string, any>,
  payload: TriggerPayload
): Promise<Record<string, any>> {
  const { url, method = 'POST', headers = {} } = config;
  
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      event: payload.event,
      module: payload.module,
      entity_id: payload.entity_id,
      entity_data: payload.entity_data,
      timestamp: new Date().toISOString()
    }),
  });

  return {
    sent: true,
    url,
    status: response.status,
    statusText: response.statusText
  };
}

function formatTemplate(template: string, data: Record<string, any>): string {
  let result = template;
  
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value ?? ''));
  }
  
  return result;
}

function getTableForModule(module: string): string {
  const moduleToTable: Record<string, string> = {
    'ar_invoices': 'ar_invoices',
    'ap_invoices': 'ap_invoices',
    'ar_receipts': 'ar_receipts',
    'ap_payments': 'ap_payments',
    'customers': 'customers',
    'vendors': 'vendors',
    'journal_entries': 'journal_entries',
    'purchase_orders': 'purchase_orders',
  };
  
  return moduleToTable[module] || module;
}
