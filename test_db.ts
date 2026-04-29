import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function run() {
  const { data, error } = await supabase.from('ar_invoices').select('id, invoice_number, reference, customer_id, customers(customer_name)').ilike('invoice_number', 'SBS-INV-%').limit(5);
  console.log("DATA:");
  console.log(JSON.stringify(data, null, 2));
  console.log("ERROR:", error);
}
run();
