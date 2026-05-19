const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function check() {
  const { data, error } = await supabase
    .from('school_payment_transactions')
    .select('id, payment_date, payment_month, journal_entry_id, ar_receipt_id')
    .not('payment_date', 'is', null)
    .not('payment_month', 'is', null);
    
  if (error) { console.error(error); return; }
  
  let mismatches = 0;
  for (const p of data) {
    const dDate = new Date(p.payment_date);
    const mDate = new Date(p.payment_month);
    
    if (dDate.getMonth() !== mDate.getMonth()) {
      mismatches++;
      if (mismatches <= 5) {
        console.log(`Mismatch: Date=${p.payment_date}, Month=${p.payment_month}, ID=${p.id}`);
      }
    }
  }
  console.log(`Total mismatches: ${mismatches}`);
}
check();
