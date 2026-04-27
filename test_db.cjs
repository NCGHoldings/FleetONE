const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL="(.*)"/)[1];
const supabaseKey = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/)[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('school_students')
    .select('id, student_name, current_amount_due, payment_balance, fixed_monthly_amount')
    .eq('branch_id', 'dd387300-dc45-4c1e-ae24-933750c78a8e')
    .limit(20);
    
  console.log(JSON.stringify(data, null, 2));
}

run();
