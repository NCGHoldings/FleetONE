import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wwjpdszkmtnzshbulkon.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3anBkc3prbXRuenNoYnVsa29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTQxMjAsImV4cCI6MjA3MTUzMDEyMH0.EiNNdtKsKSmiBxnpMrLjiQ45jYuJWqijjK-hCkpw_y4";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function test() {
  let allData: any[] = [];
  let from = 0;
  const step = 2000;
  while (true) {
    const { data, error } = await supabase.from('ar_invoices').select('balance, paid_amount, total_amount').range(from, from + step - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData = [...allData, ...data];
    if (data.length < step) break;
    from += step;
  }
  
  const totalBalance = allData.reduce((sum, inv) => sum + (Number(inv.balance) || 0), 0);
  const totalPaid = allData.reduce((sum, inv) => sum + (Number(inv.paid_amount) || 0), 0);
  const totalAmount = allData.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
  console.log(`Total Invoices: ${allData.length}`);
  console.log(`Total Balance: ${totalBalance}`);
  console.log(`Total Paid: ${totalPaid}`);
  console.log(`Total Amount: ${totalAmount}`);
}
test();
