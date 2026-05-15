/**
 * Backfill bank_transactions.company_id from bank_accounts
 * 
 * Run with: npx tsx backfill_bank_company_id.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8');
  envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
    }
  });
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://wwjpdszkmtnzshbulkon.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function backfill() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Bank Transactions company_id Backfill");
  console.log("═══════════════════════════════════════════════════════════");

  // Step 1: Find bank_transactions with NULL company_id
  const { data: orphans, error: err1 } = await supabase
    .from("bank_transactions")
    .select("id, bank_account_id, company_id, source_type, description")
    .is("company_id", null)
    .limit(500);

  if (err1) {
    console.error("Failed to fetch orphaned bank_transactions:", err1.message);
    return;
  }

  console.log(`\nFound ${orphans?.length || 0} bank_transactions with NULL company_id`);

  if (!orphans || orphans.length === 0) {
    console.log("✓ No orphans to fix. All bank_transactions have company_id.");
    return;
  }

  // Step 2: Get unique bank_account_ids
  const bankAccountIds = [...new Set(orphans.map(t => t.bank_account_id).filter(Boolean))];
  console.log(`Linked to ${bankAccountIds.length} distinct bank accounts`);

  // Step 3: Fetch bank_accounts to get their company_id
  const { data: bankAccounts, error: err2 } = await supabase
    .from("bank_accounts")
    .select("id, company_id, account_name")
    .in("id", bankAccountIds);

  if (err2) {
    console.error("Failed to fetch bank_accounts:", err2.message);
    return;
  }

  const baMap = new Map((bankAccounts || []).map(ba => [ba.id, ba]));

  // Step 4: Patch each orphan
  let fixed = 0;
  let skipped = 0;

  for (const txn of orphans) {
    const ba = baMap.get(txn.bank_account_id);
    if (!ba || !ba.company_id) {
      console.warn(`  ⚠ Skipping txn ${txn.id} — bank account ${txn.bank_account_id} has no company_id`);
      skipped++;
      continue;
    }

    const updateData: any = { company_id: ba.company_id };
    
    // Also backfill source_type if null
    if (!txn.source_type) {
      updateData.source_type = 'manual';
    }

    const { error: updateErr } = await supabase
      .from("bank_transactions")
      .update(updateData)
      .eq("id", txn.id);

    if (updateErr) {
      console.error(`  ✗ Failed to patch txn ${txn.id}: ${updateErr.message}`);
    } else {
      fixed++;
    }
  }

  console.log(`\n════════════════════════════════════════`);
  console.log(`  Fixed:   ${fixed}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Total:   ${orphans.length}`);
  console.log(`════════════════════════════════════════`);
}

backfill();
