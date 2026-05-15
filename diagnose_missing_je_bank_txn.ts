/**
 * Diagnose why JV-2026-01938 (LKR 7,800) is missing from Bank Reconciliation
 */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
  });
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
);

async function diagnose() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Diagnosing JV-2026-01938 Bank Transaction Linkage");
  console.log("═══════════════════════════════════════════════════════════\n");

  // 1. Find the JE
  const { data: je, error: jeErr } = await supabase
    .from('journal_entries')
    .select('id, entry_number, entry_date, status, company_id, description')
    .eq('entry_number', 'JV-2026-01938')
    .maybeSingle();

  if (jeErr) { console.error('JE query failed:', jeErr.message); return; }
  if (!je) { console.error('JE JV-2026-01938 not found!'); return; }

  console.log('✓ Journal Entry found:', je.id);
  console.log('  Date:', je.entry_date, '| Status:', je.status, '| Company:', je.company_id);
  console.log('  Desc:', je.description);

  // 2. Get JE lines
  const { data: lines } = await supabase
    .from('journal_entry_lines')
    .select('account_id, debit, credit, description')
    .eq('journal_entry_id', je.id);

  console.log('\n── JE Lines ──');
  for (const line of (lines || [])) {
    // Get COA info
    const { data: coa } = await supabase
      .from('chart_of_accounts')
      .select('account_code, account_name, account_type')
      .eq('id', line.account_id)
      .single();
    
    console.log(`  ${coa?.account_code} ${coa?.account_name}`);
    console.log(`    DR: ${line.debit || 0} | CR: ${line.credit || 0}`);
    console.log(`    Is bank (1300x): ${coa?.account_code?.startsWith('1300') ? 'YES ✓' : 'NO'}`);
    console.log(`    account_id (UUID): ${line.account_id}`);
  }

  // 3. Check bank_accounts GL linkage
  const bankLine = (lines || []).find(l => true); // Get first line's account_id
  const bankAccountIds: string[] = [];
  
  for (const line of (lines || [])) {
    const { data: coa } = await supabase
      .from('chart_of_accounts')
      .select('account_code')
      .eq('id', line.account_id)
      .single();
    
    if (coa?.account_code?.startsWith('1300')) {
      console.log(`\n── Checking bank_accounts for GL account ${coa.account_code} (${line.account_id}) ──`);
      
      const { data: bankAccounts, error: baErr } = await supabase
        .from('bank_accounts')
        .select('id, account_name, bank_name, gl_account_id, current_balance, company_id')
        .eq('gl_account_id', line.account_id);

      if (baErr) {
        console.error('  ✗ bank_accounts query failed:', baErr.message);
      } else if (!bankAccounts || bankAccounts.length === 0) {
        console.error('  ✗ NO bank_accounts linked to this GL account!');
        console.log('  This is why the auto-creation failed — no bank_account has gl_account_id = ' + line.account_id);
        
        // Check all bank accounts to see which ones exist
        const { data: allBA } = await supabase
          .from('bank_accounts')
          .select('id, account_name, bank_name, gl_account_id, account_number')
          .eq('company_id', je.company_id);
        
        console.log(`\n  All bank accounts for company ${je.company_id}:`);
        for (const ba of (allBA || [])) {
          console.log(`    ${ba.account_name} | ${ba.bank_name} | acct#: ${ba.account_number}`);
          console.log(`      gl_account_id: ${ba.gl_account_id || 'NULL ⚠'}`);
        }
      } else {
        console.log(`  ✓ Found ${bankAccounts.length} linked bank account(s):`);
        for (const ba of bankAccounts) {
          console.log(`    ${ba.account_name} | ${ba.bank_name} | id: ${ba.id}`);
          bankAccountIds.push(ba.id);
        }
      }
    }
  }

  // 4. Check if a bank_transaction already exists for this JE
  console.log('\n── Checking bank_transactions for this JE ──');
  
  const { data: btByJE } = await supabase
    .from('bank_transactions')
    .select('id, bank_account_id, transaction_date, description, debit_amount, credit_amount, source_type, source_id, journal_entry_id, company_id, is_reconciled')
    .or(`journal_entry_id.eq.${je.id},source_id.eq.${je.id}`);

  if (btByJE && btByJE.length > 0) {
    console.log(`  ✓ Found ${btByJE.length} bank_transaction(s) linked to this JE:`);
    for (const bt of btByJE) {
      console.log(`    id: ${bt.id}`);
      console.log(`    bank_account_id: ${bt.bank_account_id}`);
      console.log(`    date: ${bt.transaction_date} | DR: ${bt.debit_amount} | CR: ${bt.credit_amount}`);
      console.log(`    source_type: ${bt.source_type} | is_reconciled: ${bt.is_reconciled}`);
      console.log(`    company_id: ${bt.company_id}`);
    }
  } else {
    console.log('  ✗ NO bank_transactions linked to this JE (neither by journal_entry_id nor source_id)');
  }

  // 5. Also check by date+amount heuristic
  console.log('\n── Heuristic search: date=2026-04-02, amount=7800 ──');
  const { data: btByHeuristic } = await supabase
    .from('bank_transactions')
    .select('id, bank_account_id, transaction_date, description, debit_amount, credit_amount, source_type, journal_entry_id, company_id')
    .eq('transaction_date', '2026-04-02')
    .or('debit_amount.eq.7800,credit_amount.eq.7800');

  if (btByHeuristic && btByHeuristic.length > 0) {
    console.log(`  Found ${btByHeuristic.length} matching transaction(s):`);
    for (const bt of btByHeuristic) {
      console.log(`    id: ${bt.id} | ${bt.description}`);
      console.log(`    bank_account_id: ${bt.bank_account_id} | DR: ${bt.debit_amount} | CR: ${bt.credit_amount}`);
      console.log(`    source_type: ${bt.source_type} | je_id: ${bt.journal_entry_id} | company_id: ${bt.company_id}`);
    }
  } else {
    console.log('  No matching transactions found by date+amount');
  }

  // 6. Count orphaned bank_transactions (NULL company_id)
  const { count } = await supabase
    .from('bank_transactions')
    .select('id', { count: 'exact', head: true })
    .is('company_id', null);
  
  console.log(`\n── Orphan check ──`);
  console.log(`  Bank transactions with NULL company_id: ${count || 0}`);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Diagnosis complete');
  console.log('═══════════════════════════════════════════════════════════');
}

diagnose();
