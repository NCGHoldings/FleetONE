const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const assignments = {
  'Niroshan': ['jaffna', 'badulla', 'badulla 99', 'passara', 'panama', 'madolsima'],
  'Asanka': ['panadura kandy xl', 'panadura kandy', 'panadura nittabuwa', 'panadura nittabuwa hw', 'moratuwa nittabuwa', 'mirigama panadura', 'colombo horana', 'horana kaduwela', 'kaduwela moratuwa', 'kadawatha navinna', 'awissawella colombo', 'avissawella-colombo', 'avissawella - colombo'],
  'Nayana': ['colombo nuwara eliya', 'colombo kandy', 'colombo trinco', 'colombo gampola', 'kegalle colombo', 'colombo anuradhapura', 'welimada colombo'],
  'Dedunu': ['rathnapura colombo']
};

function getLeaderForLabel(label) {
  if (!label) return null;
  const normalized = label.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  for (const [leader, routes] of Object.entries(assignments)) {
    for (const route of routes) {
      const normRoute = route.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalized.includes(normRoute) || normRoute.includes(normalized)) {
        return leader;
      }
    }
  }
  return null;
}

async function run() {
  console.log('Fetching roster...');
  const { data: roster, error } = await supabase.from('fleet_master_roster').select('id, route_label, route_id');
  if (error) throw error;

  console.log(`Found ${roster.length} roster entries.`);
  
  const { data: routes } = await supabase.from('routes').select('id, route_name');
  const routeByName = {};
  (routes || []).forEach(r => routeByName[r.route_name.toLowerCase().trim()] = r.id);

  let updatedCount = 0;

  for (const r of roster) {
    if (!r.route_label) continue;
    
    const leader = getLeaderForLabel(r.route_label);
    if (!leader) {
      console.log(`No leader mapped for: ${r.route_label}`);
      continue;
    }

    let routeId = r.route_id;
    if (!routeId) {
      routeId = routeByName[r.route_label.toLowerCase().trim()];
    }

    if (!routeId) {
      // Create route
      console.log(`Creating route for ${r.route_label} with leader ${leader}`);
      const generatedRouteNo = `RTE-${Math.floor(Math.random() * 10000)}`;
      const parts = r.route_label.split('-');
      const { data: newRoute, error: insertErr } = await supabase.from('routes').insert({
        route_name: r.route_label,
        route_no: generatedRouteNo,
        start_location: parts[0]?.trim() || 'Unknown',
        end_location: parts[1]?.trim() || 'Unknown',
        distance_km: 0,
        route_leader: leader,
        is_active: true
      }).select().single();
      
      if (insertErr) {
        console.error('Insert error:', insertErr);
        continue;
      }
      routeId = newRoute.id;
      routeByName[r.route_label.toLowerCase().trim()] = routeId;
    } else {
       // Update existing route leader
       await supabase.from('routes').update({ route_leader: leader }).eq('id', routeId);
    }

    // Update roster to ensure it links to the route
    if (r.route_id !== routeId) {
       await supabase.from('fleet_master_roster').update({ route_id: routeId }).eq('id', r.id);
       console.log(`Linked ${r.route_label} to route ${routeId}`);
    }
    
    updatedCount++;
  }
  
  console.log(`Successfully mapped ${updatedCount} roster entries to leaders.`);
}

run().catch(console.error);
