const dotenv = require('dotenv');
dotenv.config();

const url = process.env.VITE_SUPABASE_URL + '/rest/v1/';
const key = process.env.VITE_SUPABASE_ANON_KEY;

async function check() {
  const res1 = await fetch(url + 'school_bus_finance_settings?select=*', {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  console.log("Settings:", await res1.json());

  const res2 = await fetch(url + 'chart_of_accounts?select=id,account_name,account_type&account_name=ilike.*fuel*', {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  console.log("Fuel Accounts:", await res2.json());
}

check().catch(console.error);
