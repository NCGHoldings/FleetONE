import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('special_hire_quotations')
    .select('status, trip_status, hire_type, pickup_datetime, gross_revenue')
    .gte('pickup_datetime', '2026-04-01T00:00:00.000Z')
    .lte('pickup_datetime', '2026-05-31T23:59:59.999Z')
    .eq('is_active_version', true);

  if (error) {
    console.error(error);
    return;
  }

  console.log(`Total records: ${data.length}`);

  const statuses = {};
  const tripStatuses = {};

  data.forEach(q => {
    const s = q.status || 'NULL';
    const ts = q.trip_status || 'NULL';
    statuses[s] = (statuses[s] || 0) + 1;
    tripStatuses[ts] = (tripStatuses[ts] || 0) + 1;
  });

  console.log('Statuses:', statuses);
  console.log('Trip Statuses:', tripStatuses);
}

main();
