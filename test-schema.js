import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

for (const file of ['.env', '.env.local']) {
  if (fs.existsSync(file)) dotenv.config({ path: file });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log("No URL/Key found");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('daily_trips').select('income_details').not('income_details', 'is', null).limit(5);
  console.log(JSON.stringify(data, null, 2));
}

run();
