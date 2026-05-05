const { createClient } = require('@supabase/supabase-js');
// Need anon key from .env
require('dotenv').config();
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const v = await supabase.from('vendors').select('id, business_unit_code').limit(1);
  console.log("Vendors:", v.error ? v.error.message : "OK");
  
  const b = await supabase.from('bank_accounts').select('id, business_unit_code').limit(1);
  console.log("Bank Accounts:", b.error ? b.error.message : "OK");
}
check();
