require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function run() {
  const branchId = '1d8c5ca6-a9bd-4641-b1d6-a48d9803b106'; // Kurunegala
  
  const { data, error } = await supabase
    .from('school_students')
    .select('id, student_name, is_active')
    .eq('branch_id', branchId)
    .limit(10);
    
  if (error) {
    console.error("Error:", error);
    return;
  }
  console.log("Students:", data);
}
run();
