const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function run() {
  const { data: txs, error } = await supabase
    .from('school_payment_transactions')
    .select('id, payment_date, payment_month')
    .not('payment_date', 'is', null)
    .not('payment_month', 'is', null);
    
  if (error) { console.error(error); return; }
  
  let mismatches = [];
  for (const p of txs) {
    const dDate = new Date(p.payment_date);
    const mDate = new Date(p.payment_month);
    if (dDate.getMonth() !== mDate.getMonth()) {
      mismatches.push(p);
    }
  }
  console.log(`Found ${mismatches.length} mismatches.`);
  if (mismatches.length > 0) {
    console.log(mismatches[0]);
  }
}
run();
