import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL as string, process.env.VITE_SUPABASE_ANON_KEY as string);
async function run() {
  const { data: je, error: e1 } = await supabase.from('journal_entries').select('id').eq('entry_number', 'SBS-PAY-20260502-AZJN').single();
  if (e1) { console.error('JE error:', e1); return; }
  
  const { data: lines, error: e2 } = await supabase.from('journal_entry_lines').select('*').eq('journal_entry_id', je.id);
  if (e2) console.error('Lines error:', e2); else console.log('Lines:', JSON.stringify(lines, null, 2));
}
run();
