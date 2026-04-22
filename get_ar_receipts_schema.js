import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function run() {
  const { data, error } = await supabase.rpc('query_db', { query: "SELECT pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conname = 'ar_receipts_customer_id_fkey';" });
  if (error) console.error("Error via rpc:", error);
  else console.log("Constraint:", data);
}
run();
