import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wwjpdszkmtnzshbulkon.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3anBkc3prbXRuenNoYnVsa29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTQxMjAsImV4cCI6MjA3MTUzMDEyMH0.EiNNdtKsKSmiBxnpMrLjiQ45jYuJWqijjK-hCkpw_y4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: je } = await supabase.from('journal_entries').select('id, entry_number').eq('entry_number', 'SBS-PAY-20260422-AMPS').single();
  if (je) {
    const { data: lines } = await supabase.from('journal_entry_lines').select('id, debit, credit, description, account_id, chart_of_accounts(account_code)').eq('journal_entry_id', je.id);
    console.log("JE Lines for SBS-PAY-20260422-AMPS:");
    console.log(JSON.stringify(lines, null, 2));
  } else {
    console.log("JE not found");
  }
}
main();
