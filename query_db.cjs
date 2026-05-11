const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const lines = envFile.split('\n');
let url = '';
let key = '';
for (const line of lines) {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].replace(/['"]/g, '').trim();
  if (line.startsWith('VITE_SUPABASE_PUBLISHABLE_KEY=')) key = line.split('=')[1].replace(/['"]/g, '').trim();
}

const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase
    .from('gl_journal_lines')
    .select(`
      account_id,
      account_code,
      account_name,
      debit,
      credit,
      journal_entries!inner(entry_date, source_module, business_unit_code)
    `);

  if (error) {
    console.error(error);
    return;
  }
  
  let accounts = {};
  data.forEach(row => {
    const acct = row.account_name + ' (' + row.account_code + ')';
    if (!accounts[acct]) {
       accounts[acct] = { debit: 0, credit: 0, count: 0 };
    }
    accounts[acct].debit += (row.debit || 0);
    accounts[acct].credit += (row.credit || 0);
    accounts[acct].count += 1;
  });
  
  console.log(accounts);
}

run();
