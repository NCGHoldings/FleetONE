import { createClient } from '@supabase/supabase-js'
import https from 'https';

const agent = new https.Agent({ rejectUnauthorized: false });

const supabaseUrl = 'https://wwjpdszkmtnzshbulkon.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3anBkc3prbXRuenNoYnVsa29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTQxMjAsImV4cCI6MjA3MTUzMDEyMH0.EiNNdtKsKSmiBxnpMrLjiQ45jYuJWqijjK-hCkpw_y4'

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: { fetch: (...args) => fetch(args[0], { ...args[1], dispatcher: new Proxy({}, { get: () => agent }) }) }
})

async function run() {
  const { data: accounts, error: err2 } = await supabase.from('chart_of_accounts').select('id, account_name, company_id, account_type').limit(5)
  console.log("Bank Accounts:", accounts, err2)
}
run()
