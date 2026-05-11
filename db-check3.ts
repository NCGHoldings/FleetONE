import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: yutongSettings, error: yError } = await supabase.from('yutong_finance_settings').select('*').eq('company_id', 'a0000000-0000-0000-0000-000000000001').single();
  console.log('yutongSettings error:', yError);
  console.log('yutongSettings:', yutongSettings);

  const { data: arInvoice } = await supabase.from('ar_invoices').select('id, journal_entry_id').eq('invoice_number', 'NCGH-YT-CI-260090').single();
  console.log('arInvoice:', arInvoice);
  
  const res = await supabase.from('journal_entries').insert({
        company_id: 'a0000000-0000-0000-0000-000000000001',
        entry_number: 'TEST-12345',
        entry_date: new Date().toISOString().split('T')[0],
        description: 'Test',
        reference: 'Test',
        source_module: 'yutong_sales',
        status: 'posted',
        total_debit: 100,
        total_credit: 100,
        business_unit_code: 'YUT',
        posted_at: new Date().toISOString()
      }).select();
  console.log('JE insert error:', res.error);
}
run();
