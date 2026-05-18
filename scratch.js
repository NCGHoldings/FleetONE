import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY)

async function run() {
  const { data: sbsInvoices } = await supabase
    .from('school_ar_invoices')
    .select('amount, status, school_students!inner(branch_id, student_name)')
    .gte('invoice_month', '2026-04-01')
    .lte('invoice_month', '2026-04-30')
    .not('status', 'in', '("void","cancelled")')
    
  let sbsTotal = 0
  let sbsCount = 0
  const branchMap = {}
  
  sbsInvoices?.forEach(inv => {
    const branch = inv.school_students?.branch_id
    if (!branchMap[branch]) branchMap[branch] = { count: 0, total: 0 }
    branchMap[branch].total += Number(inv.amount || 0)
    branchMap[branch].count++
    sbsTotal += Number(inv.amount || 0)
    sbsCount++
  })
  
  console.log("School AR Invoices total:", sbsCount, "Amount:", sbsTotal)
  console.log("Branch Map:", JSON.stringify(branchMap, null, 2))
  
  const { data: customers } = await supabase
    .from('customers')
    .select('id, customer_name, customer_code')
    .eq('business_unit_code', 'SBO')
    
  console.log("SBO Customers:", customers?.map(c => c.customer_code).join(', '))
  
  for (const customer of customers || []) {
     const { data: arInvoices } = await supabase
       .from('ar_invoices')
       .select('total_amount, balance, tax_amount, status')
       .eq('customer_id', customer.id)
       
     let arTotal = 0
     let arCount = 0
     let arBalance = 0
     let arVat = 0
     
     arInvoices?.forEach(inv => {
       arTotal += Number(inv.total_amount || 0)
       arBalance += Number(inv.balance || 0)
       arVat += Number(inv.tax_amount || 0)
       arCount++
     })
     
     if (arCount > 0) {
       console.log(`AR Invoices for ${customer.customer_code}: Count: ${arCount}, Total Amount: ${arTotal}, Balance: ${arBalance}, VAT: ${arVat}`)
     }
  }
}
run()
