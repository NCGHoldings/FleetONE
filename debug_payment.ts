import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('ap_payments')
    .select(`
      id,
      payment_number,
      is_direct_payment,
      is_advance,
      journal_entry_id,
      amount,
      payee_type,
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
    console.error("Error:", error);
    return;
  }
  
  console.log(JSON.stringify(data, null, 2));
}

run();
