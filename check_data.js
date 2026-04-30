import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Checking companies...");
  const { data: companies } = await supabase.from('companies').select('id, name, parent_company_id, short_code');
  console.log("Companies:", companies);

  const ltv = companies?.find(c => c.name.includes('Light Vehicle'));
  console.log("\nLight Vehicle Sales Company:", ltv);

  if (ltv) {
    const parentId = ltv.parent_company_id;
    console.log("Parent ID:", parentId);
    
    // Check chart of accounts
    const { data: coaWithLtvId } = await supabase.from('chart_of_accounts').select('id').eq('company_id', ltv.id);
    console.log(`\nCOA entries with company_id = LTV: ${coaWithLtvId?.length}`);

    const { data: coaWithParentId } = await supabase.from('chart_of_accounts').select('id').eq('company_id', parentId);
    console.log(`COA entries with company_id = Parent: ${coaWithParentId?.length}`);
    
    // Check journal entries
    const { data: jeLtv } = await supabase.from('journal_entries').select('id').eq('company_id', parentId).eq('business_unit_code', ltv.short_code || 'LTV');
    console.log(`\nJournal Entries for LTV: ${jeLtv?.length}`);
    
    // Check invoices
    const { data: arLtv } = await supabase.from('ar_invoices').select('id').eq('company_id', parentId).eq('business_unit_code', ltv.short_code || 'LTV');
    console.log(`AR Invoices for LTV: ${arLtv?.length}`);
  }
}

main().catch(console.error);
