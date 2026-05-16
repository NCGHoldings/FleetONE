import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="(.*)"$/);
  if (match) envVars[match[1]] = match[2];
});

const url = envVars.VITE_SUPABASE_URL;
const key = envVars.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(url, key);

async function run() {
  const orderNo = 'YTO-2026-0043';
  console.log(`Searching for order: ${orderNo}`);
  
  const { data: order } = await supabase.from('yutong_orders').select('id, ar_invoice_id').eq('order_no', orderNo).single();
  
  if (!order) {
    console.error('Order not found.');
    return process.exit(1);
  }

  console.log(`Found order ID: ${order.id}`);

  if (order.ar_invoice_id) {
    const { data: ar } = await supabase.from('ar_invoices').select('journal_entry_id').eq('id', order.ar_invoice_id).single();
    if (ar && ar.journal_entry_id) {
      await supabase.from('journal_entries').delete().eq('id', ar.journal_entry_id);
      console.log('Deleted unbalanced journal entry.');
    }
    await supabase.from('ar_invoices').update({ journal_entry_id: null, status: 'draft' }).eq('id', order.ar_invoice_id);
    console.log('Reset AR Invoice status to draft.');
  }
  
  const { data: invs } = await supabase.from('yutong_invoice_records').select('id').eq('order_id', order.id);
  if (invs) {
    for (const inv of invs) {
      await supabase.from('yutong_invoice_records').update({ status: 'draft', approved_by: null }).eq('id', inv.id);
      await supabase.from('yutong_invoice_documents').update({ document_status: 'draft' }).eq('invoice_record_id', inv.id);
      console.log(`Reset invoice record ${inv.id} to draft.`);
    }
  }
  
  console.log('✅ Invoices successfully reset to DRAFT!');
}

run().catch(console.error);
