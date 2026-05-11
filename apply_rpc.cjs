const { createClient } = require('./node_modules/@supabase/supabase-js');
const fs = require('fs');

require('./node_modules/dotenv').config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const query = fs.readFileSync('/tmp/create_rpc.sql', 'utf8');
  const { data, error } = await supabase.rpc('execute_sql', { query });
  console.log('Result:', data, error);
}
run();
