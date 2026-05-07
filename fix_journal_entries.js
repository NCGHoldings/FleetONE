import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envPath = '.env';
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [key, ...values] = line.split('=');
    let value = values.join('=').trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    envVars[key.trim()] = value;
  }
});

const supabaseUrl = envVars['VITE_SUPABASE_URL'] || '';
const supabaseKey = envVars['VITE_SUPABASE_PUBLISHABLE_KEY'] || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('ap_payments')
    .select(`
      id,
      payment_number,
      is_direct_payment,
      journal_entry_id,
      journal_entries (
        id,
        entry_number,
        journal_entry_lines (
          id,
          account_id,
          debit,
          credit,
          chart_of_accounts ( account_code, account_name )
        )
      ),
      ap_payment_lines (
        account_id,
        chart_of_accounts ( account_code, account_name )
      )
    `)
    .eq('payment_number', 'PAY-2026-20295')
    .single();

  if (error) {
    console.error(error);
    return;
  }
  
  console.log(JSON.stringify(data, null, 2));
}

run();
