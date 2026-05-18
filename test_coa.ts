import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: floatAcct } = await supabase.from('chart_of_accounts').select('*').ilike('account_name', '%FLOAT%');
  console.log("FLOAT ACCOUNTS:", JSON.stringify(floatAcct, null, 2));

  const { data: fuelExp } = await supabase.from('chart_of_accounts').select('*').ilike('account_name', '%Fuel%').eq('account_type', 'expense');
  console.log("FUEL EXPENSE ACCOUNTS:", JSON.stringify(fuelExp, null, 2));

  const { data: settings } = await supabase.from('school_bus_finance_settings').select('*');
  console.log("SETTINGS:", JSON.stringify(settings, null, 2));
}

run();
