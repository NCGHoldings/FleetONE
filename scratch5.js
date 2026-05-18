import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY)

async function run() {
  const { data: sbsInvoices } = await supabase
    .from('school_ar_invoices')
    .select('amount, paid_amount, ar_invoice_id, ar_invoices(id)')
    .not('ar_invoice_id', 'is', null)
    .limit(5000)

  let sum = 0;
  let validCount = 0;
  let invalidCount = 0;
  for (const row of sbsInvoices || []) {
      if (!row.ar_invoices) {
          invalidCount++;
      } else {
          validCount++;
          sum += Number(row.amount);
      }
  }
  console.log("Valid linked rows:", validCount, "Invalid/Dead links:", invalidCount)
  console.log("Sum of valid linked rows:", sum)
}
run()
