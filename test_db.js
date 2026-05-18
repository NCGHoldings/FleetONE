import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

async function main() {
  const { data, error } = await supabase
    .from('bank_transactions')
    .select('*')
    .ilike('reference', '%PRV-2026-33%')
    .order('created_at', { ascending: false });
  if (error) console.error(error);
  console.log(JSON.stringify(data, null, 2));
}
main();
