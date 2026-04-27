const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL="(.*)"/)[1];
const supabaseKey = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/)[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('school_payment_transactions')
    .select('id, student_id, amount_paid, payment_month, reference_no, created_at')
    .like('reference_no', 'IMPORT-%');
    
  console.log(JSON.stringify(data, null, 2));
}

run();
