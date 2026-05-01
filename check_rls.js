import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY); // use service role to check policies

async function run() {
  const { data, error } = await supabase.rpc('execute_sql', { sql: "SELECT tablename, policyname, qual, with_check FROM pg_policies WHERE tablename IN ('chart_of_accounts', 'bank_accounts', 'journal_entries');" });
  console.log(data || error);
}
run();
