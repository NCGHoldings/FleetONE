import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('No Supabase credentials found.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: buses, error } = await supabase.from('buses').select('*').limit(5);
  if (error) {
    console.error('Error fetching buses:', error);
  } else {
    console.log(`Found ${buses.length} buses.`);
    console.log(buses);
  }
}
main();
