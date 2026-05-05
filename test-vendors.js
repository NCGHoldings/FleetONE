const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('http://127.0.0.1:54321', process.env.VITE_SUPABASE_ANON_KEY || 'fake');
async function test() {
  const { data, error } = await supabase.from('vendors').select('*').limit(1);
  console.log("Vendors error:", error);
}
test();
