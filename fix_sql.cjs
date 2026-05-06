const fs = require('fs');
let content = fs.readFileSync('supabase/migrations/20260506073000_seed_buses.sql', 'utf8');
content = content.substring(0, content.indexOf('ON CONFLICT (bus_no) DO NOTHING;')) + 'ON CONFLICT (bus_no) DO NOTHING;\n';
fs.writeFileSync('supabase/migrations/20260506073000_seed_buses.sql', content);
