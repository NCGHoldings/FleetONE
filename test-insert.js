import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
async function run() {
  const missingBusesToInsert = [{
    bus_no: "TEST 123",
    type: "Regular",
    model: "Unknown",
    capacity: 50,
    year: 2020,
    status: "active"
  }]
  const { data, error } = await supabase.from("buses").upsert(missingBusesToInsert, { onConflict: "bus_no" })
  console.log("Error:", error)
}
run()
