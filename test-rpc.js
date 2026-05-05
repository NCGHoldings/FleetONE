import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRpc() {
  console.log("Testing RPC...");
  // Use a random UUID just to see if the function exists
  const dummyId = '00000000-0000-0000-0000-000000000000';
  const { data, error } = await supabase.rpc('get_school_payment_deletion_breakdown', { p_payment_id: dummyId });
  
  if (error) {
    console.error("RPC Error:", error);
  } else {
    console.log("RPC Success:", data);
  }
}

testRpc();
