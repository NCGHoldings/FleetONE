import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Simple env parser
const env = fs.readFileSync('.env', 'utf-8')
  .split('\n')
  .filter(line => line.trim() && !line.startsWith('#'))
  .reduce((acc, line) => {
    const [key, ...values] = line.split('=');
    acc[key.trim()] = values.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    return acc;
  }, {});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkConfig() {
  try {
    console.log("Checking Companies...");
    // Force simple fetch to avoid module issues if possible
    const { data: companies, error: compError } = await supabase.from('companies').select('id, name');
    if (compError) {
      console.error("compError:", compError);
      process.exit(1);
    }
    
    const ncgHolding = companies?.find(c => c.name.toLowerCase().includes('holding'));
    if (!ncgHolding) {
      console.log("NCG Holding not found by name.");
      process.exit(0);
    }
    
    console.log(`\nFound NCG Holding: ${ncgHolding.id} (${ncgHolding.name})`);

    console.log("\nChecking GL Settings for NCG Holding...\n");
    const { data: glSettings, error: glError } = await supabase
      .from('gl_settings')
      .select('*')
      .eq('company_id', ncgHolding.id);
    
    if (glError) console.error("glError:", glError);
    console.log("GL Settings:", JSON.stringify(glSettings, null, 2));

    console.log("\nChecking COA for NCG Holding...\n");
    const { data: coa, error: coaError } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code, account_name, account_type')
      .eq('company_id', ncgHolding.id);
    
    if (coaError) console.error("coaError:", coaError);
    console.log(`Total COA accounts for NCG Holding: ${coa?.length || 0}`);
    if (coa && coa.length > 0) {
        console.log("Sample COA:", JSON.stringify(coa.slice(0, 5), null, 2));
    }
    
    process.exit(0);
  } catch (err) {
    console.error("Exception:", err);
    process.exit(1);
  }
}

checkConfig();
