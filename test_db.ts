import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data: entries, error } = await supabase
    .from('journal_entry_lines')
    .select(`
      debit, credit, 
      account:chart_of_accounts(account_code, account_name),
      journal_entry:journal_entries!inner(entry_date, business_unit_code, status)
    `)
    .neq('journal_entries.status', 'draft')
    .neq('journal_entries.status', 'void');
    
  if (error) {
    console.error("Error", error);
    return;
  }
  
  let totals: Record<string, number> = {};
  entries?.forEach((e: any) => {
    if (!e.account) return;
    const code = e.account.account_code + ' ' + e.account.account_name;
    if (!totals[code]) totals[code] = 0;
    totals[code] += (e.credit || 0) - (e.debit || 0);
  });
  
  console.log("GL Balances:");
  for (const [k, v] of Object.entries(totals)) {
    if (Math.abs(v) > 0.01) {
      console.log(`${k}: ${v}`);
    }
  }
}
run();
