require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data: std } = await supabase.from('school_students').select('id, student_name').ilike('student_name', '%Jithesh%').single();
  console.log('Student:', std.student_name);
  
  const { data: invs } = await supabase.from('school_ar_invoices').select('id, amount, paid_amount, status, invoice_month, created_at, ar_invoice_id, invoice_number').eq('student_id', std.id);
  
  if (invs && invs.length > 0) {
    const inv = invs[0];
    console.log('School AR Invoice:', inv);
    if (inv.ar_invoice_id) {
        const balance = (inv.amount || 0) - (inv.paid_amount || 0);
        const status = balance <= 0 ? "paid" : (inv.paid_amount || 0) > 0 ? "partial" : "unpaid";
        
        await supabase
          .from("ar_invoices")
          .update({
            paid_amount: inv.paid_amount || 0,
            balance: balance,
            status: status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", inv.ar_invoice_id);
          console.log('Fixed AR Invoice!');
    }
  }
}
run();
