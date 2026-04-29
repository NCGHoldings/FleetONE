import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('id, account_code, account_name, level1, level2, level3, level4, level5')
    .ilike('account_name', '%SAMPATH BANK%');
    
  if (error) console.error(error);
  else console.table(data);
}

check();
