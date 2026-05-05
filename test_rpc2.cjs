const fetch = require('node-fetch');
require('dotenv').config({ path: '.env' });

async function test() {
  const url = `${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/get_iou_deletion_breakdown`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      'Authorization': `Bearer ${process.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_iou_id: '00000000-0000-0000-0000-000000000000' })
  });
  
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Body:", text);
}

test();
