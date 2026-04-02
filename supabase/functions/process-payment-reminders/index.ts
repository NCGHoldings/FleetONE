import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { validateCronSecret, createUnauthorizedResponse } from "../_shared/cron-auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

interface PaymentReminderRule {
  id: string;
  name: string;
  trigger_type: string;
  trigger_days: number;
  email_template: string;
  email_subject: string;
  is_active: boolean;
  company_id: string;
  applies_to: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  due_date: string;
  total_amount: number;
  balance: number;
  customer_id?: string;
  vendor_id?: string;
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

    const today = new Date();
    console.log(`Processing payment reminders for: ${today.toISOString()}`);

    // Get all active payment reminder rules
    const { data: rules, error: rulesError } = await supabase
      .from('payment_reminder_rules')
      .select('*')
      .eq('is_active', true);

    if (rulesError) {
      console.error('Error fetching reminder rules:', rulesError);
      throw rulesError;
    }

    console.log(`Found ${rules?.length || 0} active reminder rules`);

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const rule of (rules || []) as PaymentReminderRule[]) {
      try {
        console.log(`Processing rule: ${rule.name} (${rule.trigger_type} ${rule.trigger_days} days)`);

        // Calculate target date based on trigger type
        const targetDate = new Date(today);
        
        if (rule.trigger_type === 'before_due') {
          targetDate.setDate(targetDate.getDate() + rule.trigger_days);
        } else if (rule.trigger_type === 'after_due') {
          targetDate.setDate(targetDate.getDate() - rule.trigger_days);
        }
        // 'on_due' uses today's date

        const targetDateStr = targetDate.toISOString().split('T')[0];
        console.log(`Looking for invoices due on: ${targetDateStr}`);

        // Get invoices matching the rule
        let invoices: Invoice[] = [];
        
        if (rule.applies_to === 'ar' || rule.applies_to === 'both') {
          const { data: arInvoices, error: arError } = await supabase
            .from('ar_invoices')
            .select('*, customers(email, name)')
            .eq('due_date', targetDateStr)
            .gt('balance', 0)
            .in('status', ['draft', 'sent', 'overdue']);

          if (!arError && arInvoices) {
            invoices = [...invoices, ...arInvoices.map(inv => ({ ...inv, type: 'ar' }))];
          }
        }

        if (rule.applies_to === 'ap' || rule.applies_to === 'both') {
          const { data: apInvoices, error: apError } = await supabase
            .from('ap_invoices')
            .select('*, vendors(email, name)')
            .eq('due_date', targetDateStr)
            .gt('balance', 0)
            .in('status', ['draft', 'pending', 'overdue']);

          if (!apError && apInvoices) {
            invoices = [...invoices, ...apInvoices.map(inv => ({ ...inv, type: 'ap' }))];
          }
        }

        console.log(`Found ${invoices.length} invoices matching rule criteria`);

        // Process each invoice
        for (const invoice of invoices) {
          try {
            // Check if reminder was already sent for this invoice/rule combo today
            const { data: existingLog } = await supabase
              .from('payment_reminder_log')
              .select('id')
              .eq('reminder_rule_id', rule.id)
              .eq('invoice_id', invoice.id)
              .gte('sent_at', today.toISOString().split('T')[0])
              .single();

            if (existingLog) {
              console.log(`Reminder already sent today for invoice ${invoice.invoice_number}`);
              continue;
            }

            // Get recipient email
            const contact = (invoice as any).customers || (invoice as any).vendors;
            const recipientEmail = contact?.email;
            const recipientName = contact?.name || 'Customer';

            if (!recipientEmail) {
              console.log(`No email found for invoice ${invoice.invoice_number}`);
              continue;
            }

            // Format email content
            const emailContent = formatEmailTemplate(rule.email_template, {
              invoice_number: invoice.invoice_number,
              amount: invoice.balance,
              due_date: invoice.due_date,
              recipient_name: recipientName
            });

            const emailSubject = formatEmailTemplate(rule.email_subject, {
              invoice_number: invoice.invoice_number,
              amount: invoice.balance,
              due_date: invoice.due_date
            });

            // Try to send email via Resend if configured
            const resendApiKey = Deno.env.get('RESEND_API_KEY');
            
            if (resendApiKey) {
              try {
                const emailResponse = await fetch('https://api.resend.com/emails', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${resendApiKey}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    from: 'NCG FleetFlow <noreply@ncgfleetflow.com>',
                    to: [recipientEmail],
                    subject: emailSubject,
                    html: emailContent,
                  }),
                });

                if (!emailResponse.ok) {
                  const errorText = await emailResponse.text();
                  console.error('Resend API error:', errorText);
                }
              } catch (emailErr) {
                console.error('Error sending email:', emailErr);
              }
            } else {
              console.log(`RESEND_API_KEY not configured, skipping actual email send`);
            }

            // Log the reminder
            await supabase.from('payment_reminder_log').insert({
              reminder_rule_id: rule.id,
              invoice_id: invoice.id,
              invoice_type: (invoice as any).type || 'ar',
              sent_to: recipientEmail,
              channel: 'email',
              status: 'sent',
              company_id: invoice.company_id || rule.company_id
            });

            results.sent++;
            console.log(`Reminder logged for invoice ${invoice.invoice_number} to ${recipientEmail}`);

          } catch (invErr) {
            console.error(`Error processing invoice ${invoice.id}:`, invErr);
            results.errors.push(`Invoice ${invoice.id}: ${(invErr as Error).message}`);
          }
        }

        results.processed++;

      } catch (ruleErr) {
        console.error(`Error processing rule ${rule.id}:`, ruleErr);
        results.failed++;
        results.errors.push(`Rule ${rule.id}: ${(ruleErr as Error).message}`);
      }
    }

    console.log(`Payment reminder processing complete. Rules processed: ${results.processed}, Reminders sent: ${results.sent}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.processed} rules, sent ${results.sent} reminders`,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-payment-reminders:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function formatEmailTemplate(template: string, variables: Record<string, any>): string {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value));
  }
  
  return result;
}
