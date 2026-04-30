require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false },
  global: { fetch: (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args)) }
});

async function run() {
  const { error } = await supabase.rpc('execute_sql_query', {
    sql: `ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS shared_business_units TEXT[] DEFAULT '{}';`
  });
  if (error) {
    console.error("Error running rpc:", error);
  } else {
    console.log("Migration executed successfully via rpc!");
  }
}
run();
