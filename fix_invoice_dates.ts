/**
 * Fix backdated invoice date propagation for YTO-2026-0035
 * Invoice NCGH-YT-CI-260095 was backdated to 2026-04-10 but posted with 2026-05-12
 * This script corrects the AR Invoice date AND its linked Journal Entry date
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://wwjpdszkmtnzshbulkon.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixInvoiceDates() {
  console.log('=== Fixing Invoice Date Propagation ===\n');

  // Step 1: Find the correct date from yutong_invoice_records
  const { data: invoiceRecord, error: irErr } = await supabase
    .from('yutong_invoice_records')
    .select('id, invoice_no, invoice_date, order_id')
    .eq('invoice_no', 'NCGH-YT-CI-260095')
    .maybeSingle();

  if (irErr) {
    console.error('Error looking up invoice record:', irErr.message);
    return;
  }

  if (!invoiceRecord) {
    console.log('Invoice record NCGH-YT-CI-260095 not found, trying fallback...');
    // Try searching by pattern
    const { data: records } = await supabase
      .from('yutong_invoice_records')
      .select('id, invoice_no, invoice_date, order_id')
      .ilike('invoice_no', '%260095%')
      .limit(1);
    
    if (!records || records.length === 0) {
      console.error('No invoice records found matching 260095');
      return;
    }
    console.log('Found by pattern:', records[0]);
  }

  const correctDate = invoiceRecord?.invoice_date;
  console.log(`✓ Correct date from yutong_invoice_records: ${correctDate}`);

  // Step 2: Find the AR invoice
  const { data: arInvoices, error: arErr } = await supabase
    .from('ar_invoices')
    .select('id, invoice_number, invoice_date, journal_entry_id')
    .or('invoice_number.ilike.%260095%,reference.ilike.%260095%');

  if (arErr) {
    console.error('Error looking up AR invoice:', arErr.message);
    return;
  }

  if (!arInvoices || arInvoices.length === 0) {
    console.log('No AR invoices found matching 260095');
    return;
  }

  for (const ar of arInvoices) {
    console.log(`\nFound AR Invoice: ${ar.invoice_number}`);
    console.log(`  Current date: ${ar.invoice_date}`);
    console.log(`  Correct date: ${correctDate}`);
    console.log(`  Linked JE ID: ${ar.journal_entry_id || 'none'}`);

    if (ar.invoice_date === correctDate) {
      console.log('  ✓ Already correct, skipping.');
      continue;
    }

    // Update AR Invoice date
    const { error: updateArErr } = await supabase
      .from('ar_invoices')
      .update({ invoice_date: correctDate })
      .eq('id', ar.id);

    if (updateArErr) {
      console.error(`  ✗ Failed to update AR invoice: ${updateArErr.message}`);
    } else {
      console.log(`  ✓ AR Invoice date updated: ${ar.invoice_date} → ${correctDate}`);
    }

    // Update linked Journal Entry
    if (ar.journal_entry_id) {
      const { data: je } = await supabase
        .from('journal_entries')
        .select('id, entry_number, entry_date')
        .eq('id', ar.journal_entry_id)
        .single();

      if (je) {
        console.log(`  Linked JE: ${je.entry_number} (current: ${je.entry_date})`);
        
        const { error: updateJeErr } = await supabase
          .from('journal_entries')
          .update({ entry_date: correctDate })
          .eq('id', je.id);

        if (updateJeErr) {
          console.error(`  ✗ Failed to update JE: ${updateJeErr.message}`);
        } else {
          console.log(`  ✓ JE date updated: ${je.entry_date} → ${correctDate}`);
        }
      }
    }
  }

  // Step 3: Also fix any other JEs referencing this order with wrong dates
  const { data: relatedJEs } = await supabase
    .from('journal_entries')
    .select('id, entry_number, entry_date, description')
    .or('reference.ilike.%YTO-2026-0035%,description.ilike.%YTO-2026-0035%')
    .eq('entry_date', '2026-05-12');

  if (relatedJEs && relatedJEs.length > 0) {
    console.log(`\nFound ${relatedJEs.length} related JEs with wrong date (2026-05-12):`);
    for (const je of relatedJEs) {
      console.log(`  - ${je.entry_number}: ${je.description?.substring(0, 60)}`);
      
      const { error } = await supabase
        .from('journal_entries')
        .update({ entry_date: correctDate })
        .eq('id', je.id);

      if (error) {
        console.error(`    ✗ Failed: ${error.message}`);
      } else {
        console.log(`    ✓ Fixed: ${je.entry_date} → ${correctDate}`);
      }
    }
  } else {
    console.log('\nNo additional related JEs with wrong date found.');
  }

  console.log('\n=== Fix Complete ===');
}

fixInvoiceDates().catch(console.error);
