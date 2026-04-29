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

async function fix() {
  console.log("Fetching accounts...");
  const { data: accounts, error } = await supabase.from('chart_of_accounts').select('*');
  if (error) throw error;
  
  console.log(`Found ${accounts.length} accounts`);
  
  // Group by company
  const companies = [...new Set(accounts.map(a => a.company_id))];
  
  for (const companyId of companies) {
    const compAccounts = accounts.filter(a => a.company_id === companyId);
    
    // Find all distinct levels
    const foldersToCreate = [];
    
    // Collect all level paths
    const paths = new Set<string>();
    compAccounts.forEach(acc => {
      if (acc.level1 && acc.level1 !== acc.account_name) paths.add(JSON.stringify({name: acc.level1, level: 1, type: acc.account_type}));
      if (acc.level2 && acc.level2 !== acc.account_name) paths.add(JSON.stringify({name: acc.level2, level: 2, type: acc.account_type, parent: acc.level1}));
      if (acc.level3 && acc.level3 !== acc.account_name) paths.add(JSON.stringify({name: acc.level3, level: 3, type: acc.account_type, parent: acc.level2}));
      if (acc.level4 && acc.level4 !== acc.account_name) paths.add(JSON.stringify({name: acc.level4, level: 4, type: acc.account_type, parent: acc.level3}));
    });
    
    for (const pathStr of paths) {
      const folder = JSON.parse(pathStr);
      // Check if this folder already exists as an account
      const exists = compAccounts.some(a => a.account_name === folder.name);
      
      if (!exists && folder.name && folder.name.trim() !== '') {
        console.log(`Need to create ghost folder: ${folder.name} (Level ${folder.level}) for company ${companyId}`);
        foldersToCreate.push(folder);
      }
    }
  }
}

fix().catch(console.error);
