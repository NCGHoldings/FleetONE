import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function run() {
  const { data, error } = await supabase.rpc('get_policies');
  if (error) {
    console.error("RPC failed, falling back to SQL query if we had admin keys");
  } else {
    console.log(data);
  }
}
run();
