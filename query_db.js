import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase
    .from('school_bus_payments')
    .select('id, payment_date, amount_paid')
    .gte('payment_date', '2026-01-01')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) console.error(error);
  else console.table(data);
}
run();
