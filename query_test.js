const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function test() {
  const { data, error, count } = await supabase
    .from('school_students')
    .select('id', { count: 'exact' });
  console.log('Total DB count:', count);
  console.log('Fetched rows without pagination:', data?.length);
}
test();
