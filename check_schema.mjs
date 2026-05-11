import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wwjpdszkmtnzshbulkon.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3anBkc3prbXRuenNoYnVsa29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTQxMjAsImV4cCI6MjA3MTUzMDEyMH0.EiNNdtKsKSmiBxnpMrLjiQ45jYuJWqijjK-hCkpw_y4'
);

// Test 1: Query with opening_balance
const { data: d1, error: e1 } = await supabase
  .from('chart_of_accounts')
  .select('id, account_type, opening_balance, current_balance')
  .limit(1);
console.log('TEST 1 (with opening_balance):', e1 ? JSON.stringify(e1) : 'SUCCESS', d1?.length);

// Test 2: Query without opening_balance
const { data: d2, error: e2 } = await supabase
  .from('chart_of_accounts')
  .select('id, account_type, current_balance')
  .limit(1);
console.log('TEST 2 (without opening_balance):', e2 ? JSON.stringify(e2) : 'SUCCESS', d2?.length);

// Test 3: Check columns using information_schema
const { data: cols, error: colErr } = await supabase
  .rpc('execute_sql', { query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'chart_of_accounts' ORDER BY ordinal_position" });
console.log('TEST 3 (columns):', colErr ? JSON.stringify(colErr) : JSON.stringify(cols));
