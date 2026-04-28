const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await sb.from('master_expense_records').select('*').limit(1);
  console.log(data ? Object.keys(data[0] || {}) : error);
}
run();
