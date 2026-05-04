const BASE = 'https://wwjpdszkmtnzshbulkon.supabase.co/rest/v1';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3anBkc3prbXRuenNoYnVsa29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTQxMjAsImV4cCI6MjA3MTUzMDEyMH0.EiNNdtKsKSmiBxnpMrLjiQ45jYuJWqijjK-hCkpw_y4';
const H = { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function q(table, select) {
  const r = await fetch(`${BASE}/${table}?select=${select}`, { headers: H });
  return r.json();
}

async function audit() {
  const routes = await q('routes', 'id,route_name,route_no,is_active');
  const officialNames = new Set(routes.map(r => r.route_name.toLowerCase().trim()));
  
  console.log(`\n=== OFFICIAL ROUTES (${routes.length}) ===`);
  routes.sort((a,b) => a.route_name.localeCompare(b.route_name)).forEach(r => console.log(`  [${r.route_no}] ${r.route_name}`));

  const trips = await q('daily_trips', 'id,route_id,route_label');
  const roster = await q('fleet_master_roster', 'id,route_id,route_label');
  const buses = await q('buses', 'id,route,bus_number');

  const orphanMap = {};
  const add = (label, src) => {
    const k = label.trim();
    if (!k) return;
    if (!orphanMap[k]) orphanMap[k] = { trips: 0, roster: 0, buses: 0 };
    orphanMap[k][src]++;
  };

  (trips || []).forEach(t => {
    const label = (t.route_label || '').trim();
    if (label && (!t.route_id || !officialNames.has(label.toLowerCase()))) add(label, 'trips');
  });
  (roster || []).forEach(r => {
    const label = (r.route_label || '').trim();
    if (label && (!r.route_id || !officialNames.has(label.toLowerCase()))) add(label, 'roster');
  });
  (buses || []).forEach(b => {
    const label = (b.route || '').trim();
    if (label && !officialNames.has(label.toLowerCase())) add(label, 'buses');
  });

  const orphans = Object.entries(orphanMap).sort((a,b) => {
    const ta = a[1].trips + a[1].roster + a[1].buses;
    const tb = b[1].trips + b[1].roster + b[1].buses;
    return tb - ta;
  });

  console.log(`\n=== ORPHAN ROUTES (${orphans.length}) ===`);
  console.log('Label                              | Trips | Roster | Buses | SUGGESTED MATCH');
  console.log('-----------------------------------|-------|--------|-------|----------------');
  orphans.forEach(([label, counts]) => {
    const lower = label.toLowerCase();
    // Find best match
    let match = routes.find(r => r.route_name.toLowerCase() === lower);
    if (!match) {
      match = routes.find(r => {
        const rn = r.route_name.toLowerCase();
        return rn.includes(lower) || lower.includes(rn.split(' - ')[0]) || 
               rn.split(' - ').some(part => lower.includes(part.trim().toLowerCase()));
      });
    }
    const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);
    const matchStr = match ? `→ ${match.route_name} [${match.route_no}]` : '??? NO MATCH';
    console.log(`${pad(label, 35)}| ${pad(String(counts.trips), 6)}| ${pad(String(counts.roster), 7)}| ${pad(String(counts.buses), 6)}| ${matchStr}`);
  });
}

audit().catch(console.error);
