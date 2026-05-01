import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function run() {
  console.log("Reading SQL file...");
  const sql = fs.readFileSync('supabase/migrations/20260501110000_coa_hierarchy_stabilization.sql', 'utf8');
  console.log("Executing SQL migration via RPC...");
  
  const { data, error } = await supabase.rpc('execute_sql_query', { sql });
  
  if (error) {
    console.error("Migration Failed:", error);
  } else {
    console.log("Migration Succeeded!");
  }
}

run();
