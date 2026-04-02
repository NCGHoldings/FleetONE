import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { validateCronSecret, createUnauthorizedResponse } from "../_shared/cron-auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

interface RecurringInvoice {
  id: string;
  customer_id: string;
  amount: number;
  description: string;
  frequency: string;
  next_run_date: string;
  company_id: string;
  auto_send_email: boolean;
  is_active: boolean;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Validate cron secret for scheduled calls
  const authResult = validateCronSecret(req);
  if (!authResult.valid) {
    console.warn('Unauthorized cron call attempt');
    return createUnauthorizedResponse(corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split('T')[0];
    console.log(`Processing recurring invoices for date: ${today}`);

    // Get all active recurring invoices due today or earlier
    const { data: recurringInvoices, error: fetchError } = await supabase
      .from('recurring_invoices')
      .select('*')
      .eq('is_active', true)
      .lte('next_run_date', today);

    if (fetchError) {
      console.error('Error fetching recurring invoices:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${recurringInvoices?.length || 0} recurring invoices to process`);

    const results = {
      processed: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const recurring of (recurringInvoices || []) as RecurringInvoice[]) {
      try {
        console.log(`Processing recurring invoice: ${recurring.id}`);

        // Generate invoice number
        const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

        // Calculate due date (30 days from now by default)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);

        // Create AR Invoice
        const { data: newInvoice, error: createError } = await supabase
          .from('ar_invoices')
          .insert({
            customer_id: recurring.customer_id,
            invoice_number: invoiceNumber,
            invoice_date: today,
            due_date: dueDate.toISOString().split('T')[0],
            total_amount: recurring.amount,
            balance: recurring.amount,
            status: 'draft',
            notes: `Auto-generated from recurring invoice: ${recurring.description}`,
            company_id: recurring.company_id
          })
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        // Calculate next run date based on frequency
        const nextRunDate = calculateNextRunDate(recurring.next_run_date, recurring.frequency);

        // Update recurring invoice with next run date
        const { error: updateError } = await supabase
          .from('recurring_invoices')
          .update({ 
            next_run_date: nextRunDate,
            last_generated_at: new Date().toISOString()
          })
          .eq('id', recurring.id);

        if (updateError) {
          console.error(`Error updating recurring invoice ${recurring.id}:`, updateError);
        }

        // Log the execution
        await supabase.from('recurring_invoice_log').insert({
          recurring_invoice_id: recurring.id,
          generated_invoice_id: newInvoice?.id,
          success: true,
          company_id: recurring.company_id
        });

        results.processed++;
        console.log(`Successfully created invoice ${invoiceNumber} for recurring ${recurring.id}`);

      } catch (err) {
        console.error(`Error processing recurring invoice ${recurring.id}:`, err);
        results.failed++;
        results.errors.push(`${recurring.id}: ${(err as Error).message}`);

        // Log the failure
        await supabase.from('recurring_invoice_log').insert({
          recurring_invoice_id: recurring.id,
          success: false,
          error_message: (err as Error).message,
          company_id: recurring.company_id
        });
      }
    }

    console.log(`Recurring invoice processing complete. Processed: ${results.processed}, Failed: ${results.failed}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.processed} recurring invoices`,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-recurring-invoices:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateNextRunDate(currentDate: string, frequency: string): string {
  const date = new Date(currentDate);
  
  switch (frequency.toLowerCase()) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'bi-weekly':
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'semi-annually':
    case 'semiannually':
      date.setMonth(date.getMonth() + 6);
      break;
    case 'annually':
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      date.setMonth(date.getMonth() + 1); // Default to monthly
  }
  
  return date.toISOString().split('T')[0];
}
