import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('buses').select('id, bus_no, is_app_active, is_active');
  console.log('Total buses:', data?.length);
  console.log('is_active=true:', data?.filter(b => b.is_active).length);
  console.log('is_app_active=true:', data?.filter(b => b.is_app_active).length);
}

check();
