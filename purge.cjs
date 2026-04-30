require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false },
  global: { fetch: (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args)) }
});

async function run() {
  const branchId = '1d8c5ca6-a9bd-4641-b1d6-a48d9803b106'; // Kurunegala
  
  const { data, error } = await supabase
    .from('school_students')
    .delete()
    .eq('branch_id', branchId)
    .eq('is_active', false)
    .select('id');
    
  if (error) {
    console.error("Error:", error);
    return;
  }
  console.log("Deleted students count:", data ? data.length : 0);
}
run();
