const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vymcddtpmrnhkavudxku.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('buses').select('bus_no').ilike('bus_no', '%NE%2521%');
  console.log('Buses:', data, error);
}
run();
