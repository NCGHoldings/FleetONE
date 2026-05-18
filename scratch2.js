import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY)

async function run() {
  const { data: sbsInvoices } = await supabase
    .from('school_ar_invoices')
    .select('amount, paid_amount, status, school_students!inner(branch_id)')
    .gte('invoice_month', '2026-04-01')
    .lte('invoice_month', '2026-04-30')
    .eq('school_students.branch_id', '1d8c5ca6-a9bd-4641-b1d6-a48d9803b106')
    
  let totalAmountAll = 0
  let totalAmountPosted = 0
  let totalBalancePosted = 0
  let pendingCount = 0
  let postedCount = 0

  sbsInvoices?.forEach(inv => {
    totalAmountAll += Number(inv.amount || 0)
    if (['posted', 'paid', 'partial'].includes(inv.status)) {
       totalAmountPosted += Number(inv.amount || 0)
       totalBalancePosted += Math.max(0, Number(inv.amount || 0) - Number(inv.paid_amount || 0))
       postedCount++
    } else if (inv.status === 'pending') {
       pendingCount++
    }
  })
  
  console.log(`Total Amount (All): ${totalAmountAll}`)
  console.log(`Total Amount (Posted/Paid/Partial): ${totalAmountPosted}`)
  console.log(`Total Balance (Posted/Paid/Partial): ${totalBalancePosted}`)
  console.log(`Posted Count: ${postedCount}, Pending Count: ${pendingCount}`)
}
run()
