
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env - robust parsing
const envPath = path.resolve(process.cwd(), '.env');
let env = {};
try {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const idx = line.indexOf('=');
    if (idx > 0) {
      const key = line.substring(0, idx).trim();
      let value = line.substring(idx + 1).trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      env[key] = value;
    }
  });
} catch (e) {
  console.error("Could not read .env file");
}

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY; // Use anon key (Service Role Key in .env is mismatched)

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  console.log('URL:', supabaseUrl);
  console.log('Key Present:', !!supabaseKey);
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
  
  // classification logic
  const classify = (code, name, type) => {
     const ln = (name || "").toLowerCase();
     const p2 = (code || "").substring(0, 2);
     const p3 = (code || "").substring(0, 3);
     
     if (ln.includes("cash") || ln.includes("bank") || ln.includes("petty cash") || p3 === "110" || p3 === "111" || p3 === "112") return "Cash";
     if (ln.includes("loan") || ln.includes("borrowing") || p2 === "22" || p2 === "23") return "Financing (Loan)";
     if (type === "equity") return "Financing (Equity)";
     if (type === "asset" && (ln.includes("property") || ln.includes("equipment") || p2 === "15")) return "Investing";
     
     return "Operating"; 
  };

  const results = accounts.map(a => ({
      code: a.account_code,
      name: a.account_name,
      type: a.account_type,
      classification: classify(a.account_code, a.account_name, a.account_type)
  }));

  console.log('\n--- Potential Misclassifications ---');
  // Check for "Loan" in name but classified as "Cash"
  const loansAsCash = results.filter(r => r.classification === 'Cash' && r.name.toLowerCase().includes('loan'));
  if (loansAsCash.length > 0) {
      console.log('RISK: Loans classified as Cash:', loansAsCash.map(a => `${a.code} ${a.name}`));
  } else {
      console.log('OK: No Loans classified as Cash.');
  }

  // Check for "Bank" in name but not classified as "Cash"
  const bankNotCash = results.filter(r => r.classification !== 'Cash' && r.name.toLowerCase().includes('bank') && !r.name.toLowerCase().includes('charge'));
  
  if (bankNotCash.length > 0) {
      console.log('RISK: Bank accounts not classified as Cash:', bankNotCash.map(a => `${a.code} ${a.name} (${a.classification})`));
  } else {
      console.log('OK: All Bank accounts classified as Cash.');
  }

  console.log('\n--- Counts ---');
  const counts = results.reduce((acc, r) => {
      acc[r.classification] = (acc[r.classification] || 0) + 1;
      return acc;
  }, {});
  console.log(JSON.stringify(counts, null, 2));

  // Also check for Operating items that should be Investing
  console.log('\n--- Verify Investing ---');
  const investingMisses = results.filter(r => r.classification === 'Operating' && (r.name.toLowerCase().includes('asset') || r.type === 'asset') && !r.name.toLowerCase().includes('receivable') && !r.name.toLowerCase().includes('inventory') && !r.name.toLowerCase().includes('prepaid'));
  // Filter out Current Assets usually operating
  const likelyInvesting = investingMisses.filter(r => !r.code.startsWith('11') && !r.code.startsWith('12') && !r.code.startsWith('13') && !r.code.startsWith('14'));
  
  if (likelyInvesting.length > 0) {
      console.log('Review these Assets classified as Operating:', likelyInvesting.map(a => `${a.code} ${a.name}`));
  }

}

audit();
