import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

const BACKUP_TIME = '2026-04-30T22:30:00+03:00'; // Adjusting to ISO string

const tablesToCheck = [
  'ap_invoices',
  'ar_invoices',
  'ap_payments',
  'ar_receipts',
  'special_hire_payments',
  'special_hire_invoices',
  'journal_entries',
  'daily_trips',
  'petty_cash_vouchers',
  'chart_of_accounts'
];

async function checkRecentData() {
  console.log(`Checking for any new records created after ${BACKUP_TIME}...\n`);
  let hasNewData = false;

  for (const table of tablesToCheck) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('id, created_at', { count: 'exact', head: true })
        .gte('created_at', BACKUP_TIME);

      if (error) {
        console.error(`Error checking ${table}:`, error.message);
        continue;
      }

      if (count > 0) {
        hasNewData = true;
        console.log(`⚠️ FOUND: ${count} new records in '${table}'`);
      } else {
        console.log(`✅ Clear: 0 new records in '${table}'`);
      }
    } catch (e) {
      console.log(`Skipped ${table} (might not exist)`);
    }
  }

  console.log('\n--- SUMMARY ---');
  if (hasNewData) {
    console.log('🚨 NEW DATA FOUND! Do NOT do a direct restore, or you will lose these records.');
  } else {
    console.log('🟢 NO NEW DATA FOUND. It is 100% safe to do a direct restore of the backup.');
  }
}

checkRecentData();
