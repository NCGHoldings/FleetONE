import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data: std } = await supabase.from('school_students').select('id').ilike('student_name', '%Jithesh%').single();
  console.log('Student:', std.id);
  
  const { data: invs } = await supabase.from('school_ar_invoices').select('*').eq('student_id', std.id);
  console.log('Invoices:', invs);

  const { data: pays } = await supabase.from('school_payment_transactions').select('*').eq('student_id', std.id);
  console.log('Payments:', pays);
}
run();
