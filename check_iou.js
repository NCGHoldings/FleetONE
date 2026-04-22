import { createClient } from '@supabase/supabase-js';
const supabase = createClient("https://wwjpdszkmtnzshbulkon.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3anBkc3prbXRuenNoYnVsa29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTQxMjAsImV4cCI6MjA3MTUzMDEyMH0.EiNNdtKsKSmiBxnpMrLjiQ45jYuJWqijjK-hCkpw_y4");

async function run() {
  const { data, error } = await supabase.from('iou_records').select('*').limit(1);
  if (error) console.log(error);
  else console.log(Object.keys(data[0] || {}));
}
run();
