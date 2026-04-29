import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const url = process.env.VITE_SUPABASE_URL || 'https://wwjpdszkmtnzshbulkon.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'ey...';

// The project has a .env, let's load it
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, v] = line.split('=');
  if (k && v) acc[k] = v;
  return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('id, created_by, profiles!journal_entries_created_by_fkey(first_name, last_name)')
    .limit(1);
    
  console.log(error || data);
  
  const { data: d2, error: e2 } = await supabase
    .from('journal_entries')
    .select('id, created_by, profiles(first_name, last_name)')
    .limit(1);
    
  console.log("SECOND QUERY:", e2 || d2);
}
run();
