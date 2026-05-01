import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function run() {
  const { data: coa } = await supabase.from('chart_of_accounts').select('id, account_code').eq('account_code', '13001011').single();
  if (coa) {
    const { data: ba } = await supabase.from('bank_accounts').select('id, account_name').eq('gl_account_id', coa.id);
    console.log("Bank Accounts for 13001011:", ba);
  } else {
    console.log("COA 13001011 not found");
  }
}
run();
