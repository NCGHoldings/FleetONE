import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

async function checkConfig() {
  try {
    console.log("Checking Companies...");
    const { data: companies, error: compError } = await supabase.from('companies').select('id, name');
    if (compError) {
      console.error("compError:", compError);
      process.exit(1);
    }
    console.log("Companies:", companies?.map(c => c.name));

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
      .eq('company_id', ncgHolding.id)
      .limit(5);
    
    if (coaError) console.error("coaError:", coaError);
    console.log("Sample COA:", JSON.stringify(coa, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error("Exception:", err);
    process.exit(1);
  }
}

checkConfig();
