import { createClient } from '@supabase/supabase-js';

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Fix for dotenv not found: we'll load .env manually if needed, or just rely on the existing vite env.
// Let's use standard fs to read the .env.local file directly to avoid module resolution issues.
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envFile = fs.readFileSync(resolve(__dirname, '.env.local'), 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[match[2].replace(/^['"](.*)['"]$/, '$1')] || match[2];
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Checking AP Payment PAY-2026-20307...");
  const { data: payment, error: pError } = await supabase
    .from('ap_payments')
    .select('*')
    .eq('payment_number', 'PAY-2026-20307')
    .single();

  if (pError) {
    console.error("Error finding payment:", pError);
  } else {
    console.log("Payment found:", payment);
    
    console.log("\nChecking associated Journal Entries...");
    const { data: je, error: jeError } = await supabase
      .from('journal_entries')
      .select('*')
      .or(`reference_id.eq.${payment.id},entry_number.ilike.%PAY-2026-20307%`);
      
    if (jeError) {
      console.error("Error finding JE:", jeError);
    } else {
      console.log(`Found ${je.length} JEs.`);
      for (const entry of je) {
        console.log(`\nJE: ${entry.entry_number} (${entry.status})`);
        const { data: lines } = await supabase
          .from('journal_entry_lines')
          .select('account_id, debit, credit, description, chart_of_accounts(account_code, account_name)')
          .eq('journal_entry_id', entry.id);
        console.log(JSON.stringify(lines, null, 2));
      }
    }
  }
}

main().catch(console.error);
