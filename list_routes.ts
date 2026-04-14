import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [key, ...rest] = line.split('=');
    env[key.trim()] = rest.join('=').trim().replace(/['"]/g, '');
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: routes, error } = await supabase.from('routes').select('id, route_no, route_name');
  if (error) {
    console.error(error);
    return;
  }
  console.log("ALL ROUTES:");
  console.table(routes.map(r => ({ route_no: r.route_no, route_name: r.route_name })));
}
run();
