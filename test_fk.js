import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envText = fs.readFileSync('.env', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';
for (const line of envText.split('\n')) {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_PUBLISHABLE_KEY=')) supabaseKey = line.split('=')[1].trim();
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('id, created_by, profiles!journal_entries_created_by_fkey(first_name, last_name)')
    .limit(1);
    
  console.log("TEST WITH PROFILES:", error || data);
}
run();
