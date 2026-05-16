import { supabase } from './src/integrations/supabase/client';

async function run() {
  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('id, account_code, account_name, account_type')
    .ilike('account_name', '%VAT%');
    
  console.log('VAT Accounts:', accounts);
}

run().catch(console.error);
