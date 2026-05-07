import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [key, ...values] = line.split('=');
    let value = values.join('=').trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    envVars[key.trim()] = value;
  }
});

const supabaseUrl = envVars['VITE_SUPABASE_URL'] || '';
const supabaseKey = envVars['VITE_SUPABASE_PUBLISHABLE_KEY'] || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('ap_payments')
    .select(`
      id,
      payment_number,
      is_direct_payment,
      journal_entry_id,
      amount,
      company_id,
      journal_entries (
        id,
        entry_number,
        journal_entry_lines (
          id,
          account_id,
          debit,
          credit,
          chart_of_accounts ( account_code, account_name )
        )
      ),
      ap_payment_lines (
        account_id,
        line_total,
        description,
        chart_of_accounts ( account_code, account_name )
      )
    `)
    .eq('is_direct_payment', true)
    .not('journal_entry_id', 'is', null);

  if (error) {
    console.error(error);
    return;
  }

  for (const payment of data) {
    const jeLines = payment.journal_entries?.journal_entry_lines || [];
    const directLines = payment.ap_payment_lines || [];
    
    // Check if the JE debits "TRADE PAYABLE - INTERNAL" but AP Payment Line is something else
    const tradePayableLine = jeLines.find(l => l.debit > 0 && l.chart_of_accounts?.account_name === 'TRADE PAYABLE - INTERNAL');
    
    if (tradePayableLine && directLines.length > 0) {
      console.log(`Found issue in Payment: ${payment.payment_number} (ID: ${payment.id})`);
      console.log(`  Fixing JE ID: ${payment.journal_entry_id}`);
      
      const correctAccount = directLines[0].account_id;
      const correctAccountName = directLines[0].chart_of_accounts?.account_name;
      
      console.log(`  Updating JE Line ${tradePayableLine.id} from TRADE PAYABLE to ${correctAccountName}`);
      
      const { error: updateError } = await supabase
        .from('journal_entry_lines')
        .update({ account_id: correctAccount, description: directLines[0].description || 'Direct Payment Line' })
        .eq('id', tradePayableLine.id);
        
      if (updateError) {
        console.error('  Failed to update:', updateError);
      } else {
        console.log('  Successfully updated GL line.');
      }
      console.log('---');
    }
  }
}

run().then(() => console.log('Done'));
