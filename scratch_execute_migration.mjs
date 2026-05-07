import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  console.log("Found keys:", Object.keys(process.env).filter(k => k.includes("SUPABASE")));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const migrationPath = 'supabase/migrations/20260507100000_consolidate_legacy_gl_records.sql';
  console.log(`Reading SQL file from ${migrationPath}...`);
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`Migration file not found: ${migrationPath}`);
    process.exit(1);
  }
  
  const sql = fs.readFileSync(migrationPath, 'utf8');
  console.log("Executing SQL migration via RPC 'execute_sql_query'...");
  
  const { data, error } = await supabase.rpc('execute_sql_query', { sql_query: sql });
  
  if (error) {
    console.error("Migration Failed:", error);
    console.log("Retrying with 'sql' parameter...");
    const { data: data2, error: error2 } = await supabase.rpc('execute_sql_query', { sql });
    if (error2) {
      console.error("Retry Failed:", error2);
    } else {
      console.log("Migration Succeeded on Retry!");
    }
  } else {
    console.log("Migration Succeeded!");
  }
}

run();
