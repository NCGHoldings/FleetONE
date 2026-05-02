import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL as string, process.env.VITE_SUPABASE_ANON_KEY as string);
async function run() {
  const { data: student } = await supabase.from('school_students').select('id, student_name').ilike('student_name', '%Sithuki%').single();
  console.log('Student:', student);
  
  const { data: payments } = await supabase.from('school_payment_transactions').select('*').eq('student_id', student.id);
  console.log('Payments:', payments);
  
  const { data: invoices } = await supabase.from('school_ar_invoices').select('*').eq('student_id', student.id);
  console.log('Invoices:', invoices);
}
run();
