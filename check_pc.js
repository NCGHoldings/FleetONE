import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
if (!process.env.VITE_SUPABASE_PUBLISHABLE_KEY && process.env.VITE_SUPABASE_ANON_KEY) {
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
}
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await sb.rpc('execute_sql', { query: `
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (table_name LIKE '%petty_cash%' OR table_name LIKE '%iou%');
  `});
  console.log(data || error);
}
run();
