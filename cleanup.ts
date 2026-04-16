import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env', 'utf8');
const env: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [key, ...rest] = line.split('=');
    env[key.trim()] = rest.join('=').trim().replace(/['"]/g, '');
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: routes, error } = await supabase.from('routes').select('id, route_no, route_name');
  if (error) {
    console.error(error);
    return;
  }
  
  // Find dupes based on the user's screenshot
  const jaffnaMoratuwaDelete = routes.find(r => r.route_name === 'Jaffna To Moratuwa');
  const jaffnaMoratuwaKeep = routes.find(r => r.route_name === 'Jaffna - Moratuwa');
  
  const moratuwaJaffnaDelete = routes.find(r => r.route_name === 'Moratuwa To Jaffna');
  const moratuwaJaffnaKeep = routes.find(r => r.route_name === 'Moratuwa - Jaffna');

  const makuburaDelete = routes.find(r => r.route_name === 'Makubura - Badulla');
  const makuburaKeep = routes.find(r => r.route_name === 'Makumbura - Badulla');

  const badullaDelete = routes.find(r => r.route_name === 'Badulla - Makubura');
  const badullaKeep = routes.find(r => r.route_name === 'Badulla - Makumbura');

  const passaraDuplicates = routes.filter(r => r.route_name === 'Passara - Colombo');
  const colomboPassaraDuplicates = routes.filter(r => r.route_name === 'Colombo - Passara');

  console.log("=== MERGING TARGETS ===");
  console.log("Jaffna -> Moratuwa:", jaffnaMoratuwaDelete?.id, "=>", jaffnaMoratuwaKeep?.id);
  console.log("Moratuwa -> Jaffna:", moratuwaJaffnaDelete?.id, "=>", moratuwaJaffnaKeep?.id);
  console.log("Makubura -> Badulla:", makuburaDelete?.id, "=>", makuburaKeep?.id);
  console.log("Badulla -> Makubura:", badullaDelete?.id, "=>", badullaKeep?.id);
  console.log("Passara - Colombo Dupes:", passaraDuplicates.length);
  console.log("Colombo - Passara Dupes:", colomboPassaraDuplicates.length);

  const merges = [
    { source: jaffnaMoratuwaDelete, target: jaffnaMoratuwaKeep },
    { source: moratuwaJaffnaDelete, target: moratuwaJaffnaKeep },
    { source: makuburaDelete, target: makuburaKeep },
    { source: badullaDelete, target: badullaKeep }
  ];

  if (passaraDuplicates.length > 1) {
    merges.push({ source: passaraDuplicates[1], target: passaraDuplicates[0] });
  }

  if (colomboPassaraDuplicates.length > 1) {
    merges.push({ source: colomboPassaraDuplicates[1], target: colomboPassaraDuplicates[0] });
  }

  const tables = [
    "ap_invoices",
    "driver_allocations",
    "journal_entry_lines",
    "multi_day_route_config",
    "real_time_tracking",
    "route_permits",
    "route_targets",
    "staff_commissions"
  ];

  for (const { source, target } of merges) {
    if (!source || !target) continue;

    console.log(`\nMerging ${source.route_name} into ${target.route_name}...`);

    await supabase.from("fleet_master_roster")
      .update({ route_id: target.id, route_label: target.route_name })
      .or(`route_id.eq.${source.id},route_label.eq.${source.route_name}`);

    await supabase.from("daily_trips")
      .update({ route_id: target.id, route_label: target.route_name })
      .or(`route_id.eq.${source.id},route_label.eq.${source.route_name}`);

    await supabase.from("buses")
      .update({ route: target.route_name })
      .eq("route", source.route_name);

    for (const tableName of tables) {
      const res = await supabase.from(tableName as any)
        .update({ route_id: target.id })
        .eq("route_id", source.id);
      if (res.error) console.error(`Error updating ${tableName}:`, res.error.message);
    }

    const { error: delError } = await supabase.from("routes").delete().eq("id", source.id);
    if (delError) {
      console.error(`Failed to delete source route ${source.route_name}:`, delError.message);
    } else {
      console.log(`Successfully merged and deleted duplicate ${source.route_name}`);
    }
  }

  console.log("\nCleanup Complete!");
}

run();
