import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// Manually parse .env
const envContent = readFileSync('.env', 'utf8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="(.*)"$/);
  if (match) envVars[match[1]] = match[2];
});

const url = envVars.VITE_SUPABASE_URL;
const key = envVars.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  const invoiceNo = 'NCGH-YT-TI-260106'; // From user screenshot YTO-2026-0043 invoice
  
  console.log(`Finding invoice: ${invoiceNo}`);
  
  // Find the invoice record
  const { data: invRecord, error: invError } = await supabase
    .from('yutong_invoice_records')
    .select('id, order_id, invoice_no, status')
    .eq('invoice_no', invoiceNo)
    .single();
    
  if (invError || !invRecord) {
    console.error('Invoice record not found:', invError);
    // Maybe try the other table or prefix?
    const { data: fallback } = await supabase.from('yutong_invoice_records').select('id, invoice_no, order_id').ilike('invoice_no', '%260106%').single();
    if (fallback) {
      console.log('Found fallback invoice:', fallback);
    } else {
      process.exit(1);
    }
  }

  const recordToFix = invRecord || {};
  console.log('Found invoice record:', recordToFix);

  // Find the order
  const { data: order, error: orderErr } = await supabase
    .from('yutong_orders')
    .select('id, ar_invoice_id')
    .eq('id', recordToFix.order_id)
    .single();

  if (orderErr) {
    console.error('Order not found:', orderErr);
    process.exit(1);
  }

  const arInvoiceId = order.ar_invoice_id;
  console.log('Found AR Invoice ID:', arInvoiceId);

  let journalEntryId = null;
  if (arInvoiceId) {
    const { data: arData } = await supabase
      .from('ar_invoices')
      .select('journal_entry_id')
      .eq('id', arInvoiceId)
      .single();
    journalEntryId = arData?.journal_entry_id;
    console.log('Found Journal Entry ID:', journalEntryId);
    
    // Unlink the journal entry and reset AR status
    await supabase
      .from('ar_invoices')
      .update({ journal_entry_id: null, status: 'draft' })
      .eq('id', arInvoiceId);
      
    // Delete the journal entry (will cascade to lines)
    if (journalEntryId) {
      await supabase
        .from('journal_entries')
        .delete()
        .eq('id', journalEntryId);
      console.log('Deleted journal entry:', journalEntryId);
    }
  }

  // Reset invoice record to draft
  await supabase
    .from('yutong_invoice_records')
    .update({ status: 'draft', approved_by: null, approved_at: null })
    .eq('id', recordToFix.id);
    
  // Reset document to draft
  await supabase
    .from('yutong_invoice_documents')
    .update({ document_status: 'draft' })
    .eq('invoice_record_id', recordToFix.id);

  console.log('Done! Invoice has been reset to draft. User can now re-approve it.');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
