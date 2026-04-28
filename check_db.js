import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
async function run() {
  const { error: e1 } = await sb.from('ap_payments').select('id').limit(1);
  const { error: e2 } = await sb.from('ap_payment_vouchers').select('id').limit(1);
  console.log("ap_payments error:", e1?.message || "SUCCESS");
  console.log("ap_payment_vouchers error:", e2?.message || "SUCCESS");
}
run();
