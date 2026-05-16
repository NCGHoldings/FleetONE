import { supabase } from './src/integrations/supabase/client';

async function run() {
  const { data: settings } = await supabase
    .from('yutong_finance_settings')
    .select('vat_output_account_id')
    .limit(1);
    
  console.log('Finance Settings:', settings);
}

run().catch(console.error);
