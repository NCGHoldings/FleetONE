import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envPath = '/Users/staff/Downloads/ncg new one/ncg-fleetflow/.env';
const envFile = fs.readFileSync(envPath, 'utf8');
const supabaseUrl = envFile.match(/VITE_SUPABASE_URL="(.*)"/)[1].trim();
const supabaseKey = envFile.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const table = process.argv[2];
    const { data: qData, error: qErr } = await supabase.from(table).select('*').limit(1);
    if (qData && qData.length > 0) {
        console.log("Columns for", table, ":", Object.keys(qData[0]));
    } else {
        console.log("Empty or missing", table, qErr);
    }
}
main();
