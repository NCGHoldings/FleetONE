import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wwjpdszkmtnzshbulkon.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3anBkc3prbXRuenNoYnVsa29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTQxMjAsImV4cCI6MjA3MTUzMDEyMH0.EiNNdtKsKSmiBxnpMrLjiQ45jYuJWqijjK-hCkpw_y4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: expenses } = await supabase
    .from('route_expenses')
    .select('id, bus_id, amount, expense_date')
    .gte('expense_date', '2026-04-01')
    .lte('expense_date', '2026-04-30');
    
  console.log("Total April Route Expenses:", expenses?.length || 0);

  const { data: buses } = await supabase.from('buses').select('id, bus_no');
  
  if (expenses && expenses.length > 0) {
     expenses.forEach(e => {
        const bus = buses?.find(b => b.id === e.bus_id);
        console.log(`Expense: ${e.amount} | Date: ${e.expense_date} | Bus: ${bus ? bus.bus_no : 'Unknown'} (${e.bus_id})`);
     });
  }
}
check();
