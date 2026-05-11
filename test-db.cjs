require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Connecting to Supabase...");
  const start = Date.now();
  const { data, error } = await supabase.from('user_roles').select('*').limit(5);
  console.log(`Query took ${Date.now() - start}ms`);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Data:", data);
  }
}
test();
