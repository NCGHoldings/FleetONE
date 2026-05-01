import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function run() {
  const { data: accounts, error } = await supabase.from('bank_accounts').select('id, account_name, gl_account_id');
  if (error) console.error(error);
  
  const map = {};
  for (const acc of (accounts || [])) {
    if (!acc.gl_account_id) continue;
    if (!map[acc.gl_account_id]) map[acc.gl_account_id] = [];
    map[acc.gl_account_id].push(acc);
  }
  
  for (const [glId, banks] of Object.entries(map)) {
    if (banks.length > 1) {
      console.log(`GL Account ${glId} has MULTIPLE bank accounts linked:`, banks.map(b => b.account_name));
    }
  }
  console.log("Done checking.");
}
run();
