const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env', 'utf8');
const lines = envFile.split('\n');
let url = '', key = '';
for (const line of lines) {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
}

const supabase = createClient(url, key);

async function check() {
  const { data: companies } = await supabase.from('companies').select('id, name, is_active, business_unit_type');
  console.log("COMPANIES IN DB:");
  console.table(companies);
}
check();
