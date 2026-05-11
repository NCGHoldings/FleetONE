import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function run() {
  // 1. Get all school_payment_transactions that have a journal_entry_id
  const { data: txs, error: txError } = await supabase
    .from('school_payment_transactions')
    .select('payment_date, journal_entry_id, ar_receipt_id')
    .not('journal_entry_id', 'is', null);

  if (txError) {
    console.error("Error fetching txs", txError);
    return;
  }

  console.log(`Found ${txs.length} school payment transactions with JEs`);
  
  let fixCount = 0;
  
  // 2. Map them to bank_transactions update
  for (const tx of txs) {
    const sourceIds = [tx.journal_entry_id];
    if (tx.ar_receipt_id) sourceIds.push(tx.ar_receipt_id);
    
    // Get the bank transaction(s) for this source_id
    const { data: bts, error: btErr } = await supabase
      .from('bank_transactions')
      .select('id, transaction_date')
      .in('source_id', sourceIds);
      
    if (btErr) {
      console.error("Error fetching bts", btErr);
      continue;
    }
    
    for (const bt of bts || []) {
      if (bt.transaction_date !== tx.payment_date) {
        console.log(`Fixing bank transaction ${bt.id} from ${bt.transaction_date} to ${tx.payment_date}`);
        const { error: updErr } = await supabase
          .from('bank_transactions')
          .update({ transaction_date: tx.payment_date })
          .eq('id', bt.id);
          
        if (updErr) console.error("Error updating bt", updErr);
        else fixCount++;
      }
    }
  }
  
  console.log(`Fixed ${fixCount} bank transactions!`);
}
run();
