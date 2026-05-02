const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: busSettings, error: e1 } = await supabase.from('school_bus_settings').select('*').limit(2);
  const { data: finSettings, error: e2 } = await supabase.from('school_bus_finance_settings').select('*').limit(2);
  console.log("school_bus_settings", busSettings, e1);
  console.log("school_bus_finance_settings", finSettings, e2);
}
check();
