import { supabase } from './src/integrations/supabase/client';

async function run() {
  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('id, account_code, account_name')
    .ilike('account_name', '%VAT%Output%');
    
  console.log('VAT Output Accounts:', accounts);
}

run().catch(console.error);
