import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env', 'utf8');
const env: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [key, ...rest] = line.split('=');
    env[key.trim()] = rest.join('=').trim().replace(/['"]/g, '');
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("Fetching payments...");
  const { data: txs, error } = await supabase
    .from('school_payment_transactions')
    .select('id, payment_date, journal_entry_id');
    
  if (error) { console.error("Error fetching txs", error); return; }
  
  console.log(`Found ${txs.length} payment transactions. Fetching journal entries...`);
  
  const { data: jes, error: jeError } = await supabase
    .from('journal_entries')
    .select('id, entry_date');
    
  if (jeError) { console.error("Error fetching JEs", jeError); return; }
  
  const jeMap = new Map(jes.map(je => [je.id, je.entry_date]));
  
  let mismatches = [];
  for (const tx of txs) {
    if (tx.journal_entry_id) {
      const jeDate = jeMap.get(tx.journal_entry_id);
      if (jeDate && jeDate !== tx.payment_date) {
        mismatches.push({
          tx_id: tx.id,
          je_id: tx.journal_entry_id,
          tx_date: tx.payment_date,
          je_date: jeDate
        });
      }
    }
  }
  
  console.log(`Found ${mismatches.length} records where JE date does not match TX date.`);
  
  if (mismatches.length > 0) {
    console.log("Starting bulk sync...");
    for (let i = 0; i < mismatches.length; i++) {
      const m = mismatches[i];
      process.stdout.write(`Syncing ${i+1}/${mismatches.length} (JE: ${m.je_id} -> ${m.tx_date})... `);
      
      const res = await supabase.from('journal_entries').update({ entry_date: m.tx_date }).eq('id', m.je_id);
      if (res.error) {
        console.log(`Failed! ${res.error.message}`);
        continue;
      }
      
      const res2 = await supabase.from('ar_receipts').update({ receipt_date: m.tx_date }).eq('journal_entry_id', m.je_id);
      if (res2.error) {
        console.log(`Failed AR sync! ${res2.error.message}`);
        continue;
      }
      
      console.log('Success.');
    }
    console.log("Bulk sync complete!");
  } else {
    console.log("Everything is already perfectly synced!");
  }
}

run();
