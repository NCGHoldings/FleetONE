const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

async function test() {
  // get any iou id
  const { data: ious } = await supabase.from('iou_records').select('id').limit(1);
  if (!ious || ious.length === 0) {
    console.log("No IOUs found");
    return;
  }
  
  const iouId = ious[0].id;
  console.log("Testing with IOU ID:", iouId);
  
  const { data, error } = await supabase.rpc('get_iou_deletion_breakdown', { p_iou_id: iouId });
  console.log("Data:", data);
  if (error) console.error("Error:", error);
}

test();
