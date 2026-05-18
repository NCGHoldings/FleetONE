import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: settings } = await supabase.from('school_bus_finance_settings').select('branch_id, fuel_expense_account_id, chart_of_accounts!school_bus_finance_settings_fuel_expense_account_id_fkey(account_name, account_type)');
  console.log("Finance Settings:", JSON.stringify(settings, null, 2));

  const { data: account } = await supabase.from('chart_of_accounts').select('id, account_code, account_name, account_type').eq('account_code', '13005002');
  console.log("Account 13005002:", JSON.stringify(account, null, 2));
}

run();
