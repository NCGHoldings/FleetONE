import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data: bus } = await supabase.from('buses').select('id, bus_no').eq('bus_no', 'NG 8242').single();
  console.log("Bus:", bus);
  if (bus) {
    const { data: trips } = await supabase.from('daily_trips').select('trip_date, trip_no').eq('bus_id', bus.id).gte('trip_date', '2026-05-01').lte('trip_date', '2026-05-31');
    console.log(`Found ${trips?.length} trips for bus ${bus.bus_no} in May 2026`);
    if (trips && trips.length > 0) {
      console.log(trips.slice(0, 5));
    }
  }
}
run();
