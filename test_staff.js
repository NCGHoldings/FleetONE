import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://wwjpdszkmtnzshbulkon.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3anBkc3prbXRuenNoYnVsa29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTQxMjAsImV4cCI6MjA3MTUzMDEyMH0.EiNNdtKsKSmiBxnpMrLjiQ45jYuJWqijjK-hCkpw_y4";
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const queries = [
    { name: 'staff_registry', q: supabase.from('staff_registry').select('*').limit(1) },
    { name: 'staff_attendance', q: supabase.from('staff_attendance').select('*').limit(1) },
    { name: 'staff_commissions', q: supabase.from('staff_commissions').select('*').limit(1) },
    { name: 'feedback_complaints', q: supabase.from('feedback_complaints').select('id, related_persons, created_at, title, description').limit(1) },
    { name: 'daily_trips', q: supabase.from('daily_trips').select('id, trip_date, distance_km, income, km_per_liter, status, notes').limit(1) }
  ];

  for (const query of queries) {
    const { error } = await query.q;
    if (error) console.log(`${query.name} failed:`, error.message);
    else console.log(`${query.name} success`);
  }
}

test();
