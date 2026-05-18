import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' }); // try .env first

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('id, reference, description')
    .ilike('reference', 'PC-%')
    .limit(5);

  if (error) {
    console.error(error);
  } else {
    console.table(data);
  }
}

check();
