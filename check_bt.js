import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('bank_transactions')
    .select('id, transaction_date, source_type, source_id, debit_amount, credit_amount, description')
    .eq('debit_amount', 10350)
    .ilike('description', '%Naveen%');
  
  if (error) console.error(error);
  else console.log(data);
}
run();
