import { supabase } from './src/integrations/supabase/client';

async function run() {
  const { data } = await supabase
    .from('chart_of_accounts')
    .select('account_type')
    .limit(100);
    
  const types = [...new Set(data?.map(a => a.account_type))];
  console.log('Account Types in DB:', types);
}

run().catch(console.error);
