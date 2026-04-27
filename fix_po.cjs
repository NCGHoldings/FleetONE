require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: pos, error } = await supabase.from('purchase_orders').select('po_number').order('created_at', { ascending: false }).limit(5);
  console.log('Error:', error);
  console.log('Recent POs:', pos);
}
main();
