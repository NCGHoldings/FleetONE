import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wwjpdszkmtnzshbulkon.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3anBkc3prbXRuenNoYnVsa29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTQxMjAsImV4cCI6MjA3MTUzMDEyMH0.EiNNdtKsKSmiBxnpMrLjiQ45jYuJWqijjK-hCkpw_y4";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function test() {
  const { data, error } = await supabase
    .from('ar_invoices')
    .select(`
      invoice_number,
      status,
      total_amount,
      customers!inner (
        customer_name
      )
    `)
    .ilike('customers.customer_name', '%rathnapura%')
    .limit(10);
    
  if (error) console.error("Error searching by customer name:", error);
  else console.log("By Customer Name:", data);
  
  const { data: data2, error: error2 } = await supabase
    .from('ar_invoices')
    .select(`
      invoice_number,
      status,
      total_amount
    `)
    .ilike('invoice_number', '%rathnapura%')
    .limit(10);
    
  if (error2) console.error("Error searching by invoice number:", error2);
  else console.log("By Invoice Number:", data2);
  
  const { data: data3, error: error3 } = await supabase
    .from('ar_invoices')
    .select(`
      invoice_number,
      status,
      total_amount,
      notes
    `)
    .ilike('notes', '%rathnapura%')
    .limit(10);
    
  if (error3) console.error("Error searching by notes:", error3);
  else console.log("By Notes:", data3);
}
test();
