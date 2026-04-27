require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: txs } = await supabase
    .from('school_payment_transactions')
    .select('student_id, amount_paid, payment_date, school_students(student_name, is_active, branch_id)')
    .like('reference_no', 'IMPORT-%');
  
  console.log(JSON.stringify(txs, null, 2));
}
check();
