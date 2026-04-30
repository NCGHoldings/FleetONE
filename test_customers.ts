import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
async function run() {
  const { data: yutongQuotations } = await supabase.from('yutong_quotations').select('company_name, customer_name, customer_phone')
  let corporateCount = 0;
  yutongQuotations?.forEach(q => {
     if (q.company_name) corporateCount++;
  })
  console.log(`Total Yutong quotations: ${yutongQuotations?.length}, with company name: ${corporateCount}`);
}
run()
