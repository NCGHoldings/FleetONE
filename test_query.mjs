import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase
    .from("school_ar_invoices")
    .select(`
      amount, 
      invoice_month,
      school_students!inner(bus_reg_no, route, branch_id)
    `)
    .limit(1);

  console.log("Error:", error);
  console.log("Data:", data);
}

test();
