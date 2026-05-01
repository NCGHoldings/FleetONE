import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('id, account_code, account_name, parent_account_id, level1, level2, account_level')
    .or('parent_account_id.is.null,level1.in.(asset,OPENING BALANCE,assets)');
    
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

run();
