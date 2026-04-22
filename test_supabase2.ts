import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wwjpdszkmtnzshbulkon.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3anBkc3prbXRuenNoYnVsa29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTQxMjAsImV4cCI6MjA3MTUzMDEyMH0.EiNNdtKsKSmiBxnpMrLjiQ45jYuJWqijjK-hCkpw_y4";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function test() {
  const query = supabase.from('ar_invoices').select('id').limit(10);
  console.log("Original query url", (query as any).url?.toString());
  
  let allData: any[] = [];
  let from = 0;
  const step = 5;
  while (true) {
    const { data, error } = await query.range(from, from + step - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData = [...allData, ...data];
    console.log(`Fetched ${data.length} records. Range ${from} - ${from + step - 1}`);
    if (data.length < step) break;
    from += step;
    if (from > 15) break; // safety
  }
  console.log("Total length:", allData.length);
}
test();
