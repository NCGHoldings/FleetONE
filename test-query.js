import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Try multiple env files
const envFiles = ['.env', '.env.local', '.env.development'];
for (const file of envFiles) {
  if (fs.existsSync(file)) {
    dotenv.config({ path: file });
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Checking AP Invoices...");
  const { data: apData, error: apError } = await supabase
    .from("ap_invoices")
    .select("*, vendors(vendor_name), routes(route_name, route_no), buses(bus_no)")
    .order("invoice_date", { ascending: false })
    .limit(5);

  if (apError) {
    console.error("Error fetching AP invoices:", apError.message);
  } else {
    console.log("Success! Found AP invoices:", apData.length);
  }

  console.log("Checking AR Invoices...");
  const { data, error } = await supabase
    .from("ar_invoices")
    .select("*, customers(customer_name), routes(route_name, route_no), buses(bus_no)")
    .order("invoice_date", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error fetching AR invoices:", error.message);
  } else {
    console.log("Success! Found AR invoices:", data.length);
  }
}

run();
