import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY)

async function run() {
  // Check AP Payments
  const { data: bankTxnsAP } = await supabase
    .from('bank_transactions')
    .select('id, source_id, description')
    .eq('source_type', 'ap_payment')
    .not('source_id', 'is', null)
    
  let orphanedAP = 0;
  for (const txn of bankTxnsAP || []) {
    const { data: ap, error } = await supabase.from('ap_payments').select('id').eq('id', txn.source_id).maybeSingle();
    if (!ap && !error) {
       console.log("Orphaned AP Bank Txn:", txn.id, txn.description);
       await supabase.from('bank_transactions').delete().eq('id', txn.id);
       orphanedAP++;
    }
  }

  // Check AR Receipts
  const { data: bankTxnsAR } = await supabase
    .from('bank_transactions')
    .select('id, source_id, description')
    .eq('source_type', 'ar_receipt')
    .not('source_id', 'is', null)
    
  let orphanedAR = 0;
  for (const txn of bankTxnsAR || []) {
    const { data: ar, error } = await supabase.from('ar_receipts').select('id').eq('id', txn.source_id).maybeSingle();
    if (!ar && !error) {
       console.log("Orphaned AR Bank Txn:", txn.id, txn.description);
       await supabase.from('bank_transactions').delete().eq('id', txn.id);
       orphanedAR++;
    }
  }

  console.log(`Cleaned up ${orphanedAP} orphaned AP transactions and ${orphanedAR} orphaned AR transactions.`);
}
run()
