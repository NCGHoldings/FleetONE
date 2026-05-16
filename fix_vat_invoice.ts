import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = readFileSync('.env', 'utf8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="(.*)"$/);
  if (match) envVars[match[1]] = match[2];
});

const url = envVars.VITE_SUPABASE_URL;
const key = envVars.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(url, key);

async function run() {
  const invoiceNo = 'NCGH-YT-TI-260106'; 
  console.log(`Searching for invoice: ${invoiceNo}`);
  
  const { data: inv } = await supabase.from('yutong_invoice_records').select('id, order_id').ilike('invoice_no', `%${invoiceNo}%`).single();
  
  if (!inv) {
    console.error('Invoice not found in yutong_invoice_records. Trying order invoice list...');
    return process.exit(1);
  }

  console.log(`Found invoice record: ${inv.id}`);

  const { data: order } = await supabase.from('yutong_orders').select('ar_invoice_id').eq('id', inv.order_id).single();
  
  if (order?.ar_invoice_id) {
    const { data: ar } = await supabase.from('ar_invoices').select('journal_entry_id').eq('id', order.ar_invoice_id).single();
    if (ar?.journal_entry_id) {
      await supabase.from('journal_entries').delete().eq('id', ar.journal_entry_id);
      console.log('Deleted unbalanced journal entry.');
    }
    await supabase.from('ar_invoices').update({ journal_entry_id: null, status: 'draft' }).eq('id', order.ar_invoice_id);
    console.log('Reset AR Invoice status to draft.');
  }
  
  await supabase.from('yutong_invoice_records').update({ status: 'draft', approved_by: null }).eq('id', inv.id);
  await supabase.from('yutong_invoice_documents').update({ document_status: 'draft' }).eq('invoice_record_id', inv.id);
  
  console.log('✅ Invoice successfully reset to DRAFT!');
  console.log('👉 You can now go back to the UI and click "Approve" again to properly generate the VAT entries.');
  process.exit(0);
}

run().catch(console.error);
