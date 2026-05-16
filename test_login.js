import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.rpc('login_crew_member', { p_nic_number: '12345678' });
  console.log('Login result:', data);
  console.log('Error:', error);
  
  const { data: all_staff } = await supabase.from('staff_registry').select('*');
  console.log('All staff with 1234 in NIC:');
  console.log(all_staff.filter(s => s.nic_number && s.nic_number.includes('1234')));
}

test();
