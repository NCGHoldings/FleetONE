const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env', 'utf8');
const lines = envFile.split('\n');
let url = '', key = '';
for (const line of lines) {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].replace(/"/g, '').trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].replace(/"/g, '').trim();
}

const supabase = createClient(url, key);

async function run() {
  const { data } = await supabase.from('school_bus_finance_settings').select('id, branch_id, trade_receivable_account_id, branch_gl_account_id, bank_account_id');
  console.table(data);
}
run();
