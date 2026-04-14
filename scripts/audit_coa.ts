
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest) {
    let value = rest.join('=').trim();
    if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
    }
    env[key.trim()] = value;
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY; // Use service role for access

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function audit() {
  console.log('Fetching Chart of Accounts...');
  const { data: accounts, error } = await supabase
    .from('chart_of_accounts')
    .select('account_code, account_name, account_type, id')
    .order('account_code');

  if (error) {
    console.error('Error fetching accounts:', error);
    return;
  }

  console.log(`Found ${accounts.length} accounts.`);
  
  // classification logic from useCashFlowData.ts (replicated)
  const classify = (code: string, name: string, type: string) => {
     const ln = name.toLowerCase();
     const p2 = code.substring(0, 2);
     const p3 = code.substring(0, 3);
     
     if (ln.includes("cash") || ln.includes("bank") || ln.includes("petty cash") || p3 === "110" || p3 === "111" || p3 === "112") return "Cash";
     if (ln.includes("loan") || ln.includes("borrowing") || p2 === "22" || p2 === "23") return "Financing (Loan)";
     if (type === "equity") return "Financing (Equity)";
     if (type === "asset" && (ln.includes("property") || ln.includes("equipment") || p2 === "15")) return "Investing";
     
     return "Operating"; // Default/Catch-all
  };

  const results = accounts.map(a => ({
      ...a,
      classification: classify(a.account_code, a.account_name, a.account_type)
  }));

  console.log('\n--- Potential Misclassifications ---');
  // Check for "Loan" in name but classified as "Cash"
  const loansAsCash = results.filter(r => r.classification === 'Cash' && r.account_name.toLowerCase().includes('loan'));
  if (loansAsCash.length > 0) {
      console.log('RISK: Loans classified as Cash:', loansAsCash.map(a => `${a.account_code} ${a.account_name}`));
  } else {
      console.log('OK: No Loans classified as Cash.');
  }

  // Check for "Bank" in name but not classified as "Cash"
  const bankNotCash = results.filter(r => r.classification !== 'Cash' && r.account_name.toLowerCase().includes('bank') && !r.account_name.toLowerCase().includes('charge'));
  if (bankNotCash.length > 0) {
      console.log('RISK: Bank accounts not classified as Cash:', bankNotCash.map(a => `${a.account_code} ${a.account_name} (${a.classification})`));
  } else {
      console.log('OK: All Bank accounts classified as Cash.');
  }

  console.log('\n--- Summary ---');
  const counts = results.reduce((acc, r) => {
      acc[r.classification] = (acc[r.classification] || 0) + 1;
      return acc;
  }, {} as Record<string, number>);
  console.log(counts);
}

audit();
