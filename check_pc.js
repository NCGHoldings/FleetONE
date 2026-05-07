import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '/Users/staff/Downloads/ncg new one/ncg-fleetflow/.env' });
if (!process.env.VITE_SUPABASE_PUBLISHABLE_KEY && process.env.VITE_SUPABASE_ANON_KEY) {
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
}
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data: fund, error: fundErr } = await sb.rpc('execute_sql', { query: `
    SELECT id, fund_name, opening_balance, current_balance, fund_limit 
    FROM petty_cash_funds 
    WHERE fund_name ILIKE '%NUWARA ELIYA%';
  `});
  console.log("Fund:", fund || fundErr);
  
  if (fund && fund.length > 0) {
    const fundId = fund[0].id;
    const { data: txs, error: txsErr } = await sb.rpc('execute_sql', { query: `
      SELECT transaction_date, created_at, transaction_type, amount, balance_after, status, description, reference_number, voucher_number, reimbursement_ap_payment_id
      FROM petty_cash_transactions
      WHERE petty_cash_fund_id = '${fundId}'
      ORDER BY created_at ASC;
    `});
    console.log("Transactions:", txs || txsErr);
  }
}
run();
