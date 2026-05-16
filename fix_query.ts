import { supabase } from './src/integrations/supabase/client';

async function run() {
  const { data: accounts, error } = await supabase
    .from('chart_of_accounts')
    .select('id, account_code, account_name, account_type')
    .ilike('account_name', '%VAT%');
    
  console.log('VAT Accounts:', JSON.stringify(accounts, null, 2));
  if (error) console.error('Error:', error);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
