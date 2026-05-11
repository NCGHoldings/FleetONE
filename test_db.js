import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function run() {
  // Login as admin
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@aiv.lk',
    password: 'password123'
  });
  
  if (authErr) {
    console.log("Auth err:", authErr);
    // try another common one
    const { data: auth2, error: err2 } = await supabase.auth.signInWithPassword({
      email: 'team4@atcs.lk',
      password: 'password123'
    });
    if (err2) {
       console.log("Auth2 err:", err2);
       return;
    }
  }
  
  const { data: buses } = await supabase.from('buses').select('id, bus_no').ilike('bus_no', '%8242%');
  console.log("Buses:", buses);
  
  if (buses && buses.length > 0) {
    for (const bus of buses) {
      const { data: trips } = await supabase.from('daily_trips').select('trip_date, trip_no').eq('bus_id', bus.id);
      console.log(`Trips for ${bus.bus_no} (id: ${bus.id}):`, trips?.length);
    }
  }
}
run();
