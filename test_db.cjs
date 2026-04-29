const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: branches } = await supabase.from('school_branches').select('id, branch_name');
  console.log("Branches:", branches);
  
  const branchId = 'dd387300-dc45-4c1e-ae24-933750c78a8e';
  const { data: students } = await supabase.from('school_students').select('is_active, payment_status, current_amount_due, payment_balance').eq('branch_id', branchId);
  
  if (students) {
     console.log(`Branch ${branchId} total students:`, students.length);
     console.log(`Active:`, students.filter(s => s.is_active === true).length);
     console.log(`Paid Status:`, students.filter(s => s.payment_status === 'paid').length);
  }
}
run();
