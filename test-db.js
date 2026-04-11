import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
async function run() {
  const { data, count, error } = await supabase.from("buses").select("*", { count: 'exact' })
  console.log("Total buses in DB:", count)
}
run()
