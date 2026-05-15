/**
 * Diagnostic script: Check why bank transaction linking fails for manual JEs
 * Run: npx tsx scratch_debug_lineage.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

async function debugLineage() {
  console.log('=== DEBUG: Bank Transaction Lineage Match ===\n');

  // 1. Find a recent manual JE (JV- prefix) that touches a bank account (1300x CoA)
  const { data: manualJEs } = await supabase
    .from('journal_entries')
    .select('id, entry_number, entry_date, reference, description, source_module')
    .ilike('entry_number', 'JV-%')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log(`Found ${manualJEs?.length || 0} recent manual JEs:\n`);

  for (const je of (manualJEs || []).slice(0, 5)) {
    console.log(`--- JE: ${je.entry_number} (${je.entry_date}) ---`);
    console.log(`    Reference: "${je.reference || 'NONE'}"`);
    console.log(`    Description: "${je.description}"`);
    console.log(`    Source Module: "${je.source_module || 'NONE'}"`);

    // Get lines with CoA details
    const { data: lines } = await supabase
      .from('journal_entry_lines')
      .select('id, account_id, debit, credit, description, chart_of_accounts(id, account_code, account_name)')
      .eq('journal_entry_id', je.id);

    const bankLines = (lines || []).filter((l: any) => 
      l.chart_of_accounts?.account_code?.startsWith('1300')
    );

    if (bankLines.length === 0) {
      console.log(`    ❌ No bank account lines (1300x) found\n`);
      continue;
    }

    console.log(`    ✅ Bank lines found: ${bankLines.length}`);
    for (const bl of bankLines) {
      const coa = (bl as any).chart_of_accounts;
      console.log(`       CoA: ${coa?.account_code} - ${coa?.account_name}`);
      console.log(`       DR: ${bl.debit}, CR: ${bl.credit}`);
      console.log(`       account_id (UUID): ${bl.account_id}`);
    }

    // Check bank_accounts linked via gl_account_id
    const accountIds = bankLines.map((bl: any) => bl.account_id);
    const { data: bankAccounts, error: baErr } = await supabase
      .from('bank_accounts')
      .select('id, account_name, bank_name, account_number, gl_account_id')
      .in('gl_account_id', accountIds);

    console.log(`    Bank Accounts matched via gl_account_id: ${bankAccounts?.length || 0}`);
    if (baErr) console.log(`    ⚠️ Error: ${baErr.message}`);
    
    for (const ba of (bankAccounts || [])) {
      console.log(`       ${ba.account_name} (${ba.bank_name}) - gl_account_id: ${ba.gl_account_id}`);

      // Strategy 1: reference match
      const searchTerms = [je.reference, je.entry_number].filter(Boolean);
      let refMatches = 0;
      for (const term of searchTerms) {
        const { data: refTxns } = await supabase
          .from('bank_transactions')
          .select('id, transaction_date, transaction_type, description, reference, debit_amount, credit_amount, is_reconciled, source_type')
          .eq('bank_account_id', ba.id)
          .or(`reference.ilike.%${term}%,description.ilike.%${term}%`)
          .limit(3);
        if (refTxns?.length) {
          refMatches += refTxns.length;
          console.log(`       📌 Ref match ("${term}"): ${refTxns.length} txns`);
          for (const tx of refTxns) {
            console.log(`          ${tx.transaction_date} | ${tx.transaction_type} | DR:${tx.debit_amount} CR:${tx.credit_amount} | ref:"${tx.reference}" | desc:"${tx.description?.substring(0, 60)}" | recon:${tx.is_reconciled} | src:${tx.source_type}`);
          }
        } else {
          console.log(`       ❌ No ref match for "${term}"`);
        }
      }

      // Strategy 2: date + amount match
      if (refMatches === 0) {
        for (const bl of bankLines) {
          if ((bl as any).chart_of_accounts?.account_code?.startsWith('1300')) {
            const amount = bl.debit || bl.credit || 0;
            if (amount <= 0) continue;
            
            const { data: dateTxns } = await supabase
              .from('bank_transactions')
              .select('id, transaction_date, transaction_type, description, reference, debit_amount, credit_amount, is_reconciled, source_type')
              .eq('bank_account_id', ba.id)
              .eq('transaction_date', je.entry_date)
              .or(`debit_amount.eq.${amount},credit_amount.eq.${amount}`)
              .limit(3);
            
            if (dateTxns?.length) {
              console.log(`       📌 Date+Amount match (${je.entry_date}, ${amount}): ${dateTxns.length} txns`);
              for (const tx of dateTxns) {
                console.log(`          ${tx.transaction_date} | ${tx.transaction_type} | DR:${tx.debit_amount} CR:${tx.credit_amount} | ref:"${tx.reference}" | recon:${tx.is_reconciled} | src:${tx.source_type}`);
              }
            } else {
              console.log(`       ❌ No date+amount match (date: ${je.entry_date}, amount: ${amount})`);
              
              // Check what transactions DO exist for this date
              const { data: sameDayTxns } = await supabase
                .from('bank_transactions')
                .select('id, transaction_date, debit_amount, credit_amount, reference, description, source_type')
                .eq('bank_account_id', ba.id)
                .eq('transaction_date', je.entry_date)
                .limit(10);
              console.log(`       📋 All txns on ${je.entry_date} for this account: ${sameDayTxns?.length || 0}`);
              for (const tx of (sameDayTxns || []).slice(0, 5)) {
                console.log(`          DR:${tx.debit_amount} CR:${tx.credit_amount} | ref:"${tx.reference}" | desc:"${tx.description?.substring(0, 50)}" | src:${tx.source_type}`);
              }

              // Also check nearby dates (±3 days)
              const dateObj = new Date(je.entry_date);
              const startDate = new Date(dateObj);
              startDate.setDate(startDate.getDate() - 3);
              const endDate = new Date(dateObj);
              endDate.setDate(endDate.getDate() + 3);
              
              const { data: nearbyTxns } = await supabase
                .from('bank_transactions')
                .select('id, transaction_date, debit_amount, credit_amount, reference, description, source_type')
                .eq('bank_account_id', ba.id)
                .gte('transaction_date', startDate.toISOString().slice(0, 10))
                .lte('transaction_date', endDate.toISOString().slice(0, 10))
                .or(`debit_amount.eq.${amount},credit_amount.eq.${amount}`)
                .limit(5);
              console.log(`       📋 Nearby date (±3d) with amount ${amount}: ${nearbyTxns?.length || 0}`);
              for (const tx of (nearbyTxns || [])) {
                console.log(`          ${tx.transaction_date} | DR:${tx.debit_amount} CR:${tx.credit_amount} | ref:"${tx.reference}" | src:${tx.source_type}`);
              }
            }
          }
        }
      }
    }
    console.log();
  }
}

debugLineage().catch(console.error);
