import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
if (!process.env.VITE_SUPABASE_PUBLISHABLE_KEY && process.env.VITE_SUPABASE_ANON_KEY) {
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
}
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await sb.from('special_hire_quotations').select('id, quotation_no, status, trip_start_date, trip_end_date').limit(10);
  console.log("Error:", error);
  console.log("Quotations count:", data?.length);
  if (data?.length) {
    console.log("First few statuses:", data.map(d => d.status));
  }
}
run();
