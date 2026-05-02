require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data: std } = await supabase.from('school_students').select('id, student_name').ilike('student_name', '%Jithesh%').single();
  console.log('Student:', std.student_name);
  
  const { data: invs } = await supabase.from('school_ar_invoices').select('id, amount, paid_amount, status, invoice_month, created_at, ar_invoice_id').eq('student_id', std.id);
  console.log('School AR Invoices:', invs);

  if (invs && invs.length > 0 && invs[0].ar_invoice_id) {
    const { data: globalAr } = await supabase.from('ar_invoices').select('id, status, paid_amount, balance').eq('id', invs[0].ar_invoice_id).single();
    console.log('Global AR Invoice:', globalAr);
  }

  const { data: pays } = await supabase.from('school_payment_transactions').select('id, amount_paid, payment_date, created_at').eq('student_id', std.id);
  console.log('Payments:', pays);
}
run();
