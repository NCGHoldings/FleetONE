const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env'));
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_PUBLISHABLE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .ilike('account_name', '%UNIDENTIFIED%');
  
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}
run();
