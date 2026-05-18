import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY)

async function run() {
  const { data: arInvoices } = await supabase
    .from('ar_invoices')
    .select('id, total_amount, tax_amount, subtotal')
    .eq('customer_id', 'a0f9175a-5264-44ed-9811-9a4f48b10f84') // Assuming we can just get the first few
    .limit(5)
  console.log("ar_invoices:", arInvoices)

  const { data: sbsInvoices } = await supabase
    .from('school_ar_invoices')
    .select('amount, paid_amount, ar_invoice_id')
    .not('ar_invoice_id', 'is', null)
    .limit(5)
  console.log("sbs_invoices:", sbsInvoices)
}
run()
