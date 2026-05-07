const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/Users/staff/Downloads/ncg new one/ncg-fleetflow/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    const { data: res, error } = await supabase.from('companies').select('id, company_name, short_code, is_sub_company').ilike('company_name', '%Test%');
    
    if (error) throw error;

    console.log("Test companies found:", res);
    
    for (const row of res) {
      if (row.short_code === 'SPH') {
         await supabase.from('companies').update({ short_code: 'TEST_SPH' }).eq('id', row.id);
         console.log(`Updated short_code for ${row.company_name}`);
      }
    }

    const { data: liveSPH } = await supabase.from('companies').select('id, company_name, short_code, is_sub_company, company_address').eq('short_code', 'SPH');
    console.log("Live SPH companies:", liveSPH);

  } catch (err) {
    console.error(err);
  }
}

run();
