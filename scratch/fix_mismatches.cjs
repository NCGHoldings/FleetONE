const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function run() {
  const { data: txs, error } = await supabase
    .from('school_payment_transactions')
    .select('id, payment_date, payment_month, journal_entry_id, ar_receipt_id')
    .not('payment_date', 'is', null)
    .not('payment_month', 'is', null);
    
  if (error) { console.error(error); return; }
  
  let mismatches = [];
  for (const p of txs) {
    const dDate = new Date(p.payment_date);
    const mDate = new Date(p.payment_month);
    
    // Check if the months don't match
    if (dDate.getMonth() !== mDate.getMonth()) {
      mismatches.push(p);
    }
  }
  
  console.log(`Found ${mismatches.length} mismatches. Fixing...`);
  
  for (const p of mismatches) {
    // 1. Update payment_month in school_payment_transactions
    const dDate = new Date(p.payment_date);
    const newMonth = dDate.toISOString().slice(0, 7) + '-01'; // YYYY-MM-01
    
    await supabase.from('school_payment_transactions').update({ payment_month: newMonth }).eq('id', p.id);
    
    // 2. Sync GL
    if (p.journal_entry_id) {
      await supabase.from('journal_entries').update({ entry_date: p.payment_date }).eq('id', p.journal_entry_id);
      await supabase.from('ar_receipts').update({ receipt_date: p.payment_date }).eq('journal_entry_id', p.journal_entry_id);
      
      const sourceIds = [p.journal_entry_id];
      if (p.ar_receipt_id) sourceIds.push(p.ar_receipt_id);
      await supabase.from('bank_transactions').update({ transaction_date: p.payment_date }).in('source_id', sourceIds);
    }
  }
  console.log("Done fixing mismatches.");
}
run();
