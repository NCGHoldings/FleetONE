import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wwjpdszkmtnzshbulkon.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3anBkc3prbXRuenNoYnVsa29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTQxMjAsImV4cCI6MjA3MTUzMDEyMH0.EiNNdtKsKSmiBxnpMrLjiQ45jYuJWqijjK-hCkpw_y4'
);

async function main() {
  console.log("Fetching...");
  try {
    const { data, error } = await supabase
      .from('bank_transactions')
      .select('*')
      .ilike('reference', '%PRV-2026-33%')
      .order('created_at', { ascending: false });
    if (error) console.error("Error:", error);
    else console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Exception:", e);
  }
}
main();
