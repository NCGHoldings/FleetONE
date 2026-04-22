import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wwjpdszkmtnzshbulkon.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3anBkc3prbXRuenNoYnVsa29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTQxMjAsImV4cCI6MjA3MTUzMDEyMH0.EiNNdtKsKSmiBxnpMrLjiQ45jYuJWqijjK-hCkpw_y4";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function check() {
  const { data, error } = await supabase.rpc('get_table_schema', { table_name: 'journal_entry_lines' });
  if (error) {
    // try selecting one row to see keys
    const { data: row } = await supabase.from('journal_entry_lines').select('*').limit(1);
    if (row && row.length) console.log(Object.keys(row[0]));
    else console.log("error", error);
  } else {
    console.log(data);
  }
}
check();
