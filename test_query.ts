import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

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
      journal_entry_id,
      journal_entries (
        id,
        entry_number,
        journal_entry_lines (
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
    .eq('is_direct_payment', true)
    .not('journal_entry_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error(error);
    return;
  }

  for (const payment of data) {
    const jeLines = payment.journal_entries?.journal_entry_lines || [];
    const directLines = payment.ap_payment_lines || [];
    
    // Check if the JE debits "TRADE PAYABLE - INTERNAL" but AP Payment Line is something else
    const hasTradePayable = jeLines.some((l: any) => l.debit > 0 && l.chart_of_accounts?.account_name === 'TRADE PAYABLE - INTERNAL');
    
    if (hasTradePayable && directLines.length > 0) {
      console.log(`Found issue in Payment: ${payment.payment_number} (ID: ${payment.id})`);
      console.log(`  JE ID: ${payment.journal_entry_id}`);
      console.log(`  Direct Lines wanted:`);
      directLines.forEach((line: any) => console.log(`    ${line.chart_of_accounts?.account_name}`));
      console.log('---');
    }
  }
}

run();
