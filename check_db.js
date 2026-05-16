import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="(.*)"$/);
  if (match) envVars[match[1]] = match[2];
});

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });

async function run() {
  const { data, error } = await supabase.from('ar_invoices').select('*').limit(0);
  console.log('Error:', error);
}
run();
