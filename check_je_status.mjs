import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function check() {
  const { data, error } = await supabase
    .from('petty_cash_transactions')
    .select('id, amount, status, voucher_number, transaction_type, journal_entry_id, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error(error);
  } else {
    console.table(data);
  }
}

check();
