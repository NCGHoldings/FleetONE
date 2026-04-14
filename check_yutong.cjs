require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: companies } = await supabase.from('companies').select('id, name').ilike('name', '%Yutong%');
  const yutongId = companies[0]?.id;
  
  const { data: glSettings } = await supabase.from('gl_settings').select('trade_payable_account_id').eq('company_id', yutongId).maybeSingle();
  console.log('GL Settings (Yutong) Trade Payable ID:', glSettings?.trade_payable_account_id || 'MISSING');

  const { data: ap_invoice } = await supabase.from('ap_invoices').select('id, invoice_number, status, approval_status, journal_entry_id').eq('invoice_number', 'INV-2026-0020').maybeSingle();
  console.log('AP Invoice INV-2026-0020:', ap_invoice);
}
check();
