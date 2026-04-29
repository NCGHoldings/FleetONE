const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env'));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const branchId = 'dd387300-dc45-4c1e-ae24-933750c78a8e';
  const { data, error } = await supabase
    .from('school_students')
    .select('*')
    .eq('branch_id', branchId)
    .eq('is_active', true);
    
  if (error) {
    console.error("ERROR:", error);
  } else {
    console.log("SUCCESS:", data?.length);
  }
}
run();
