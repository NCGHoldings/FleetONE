const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const branchId = 'dd387300-dc45-4c1e-ae24-933750c78a8e';
  const { data, error } = await supabase
    .from('school_payment_transactions')
    .select('*, school_students!inner(branch_id, student_name)')
    .eq('school_students.branch_id', branchId);
  console.log("ERROR:", error);
  console.log("DATA:", data);
}
run();
