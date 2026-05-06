import { loadEnv } from 'vite';
import { createClient } from '@supabase/supabase-js';

const env = loadEnv('development', process.cwd(), '');
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('buses').select('*').limit(5);
  console.log('Buses:', error || data);
  const { data: trips, error: tripsErr } = await supabase.from('daily_trips').select('*, buses(bus_no)').limit(5);
  console.log('Trips:', tripsErr || trips);
}

check();
