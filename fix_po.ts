import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function main() {
  const { data: po } = await supabase.from('purchase_orders').select('*').eq('po_number', 'PO-2026-00040').single();
  if (!po) return console.log('PO not found');
  
  const { data: item } = await supabase.from('items').select('id').limit(1).single();
  if (!item) return console.log('No items found to attach');
  
  const res = await supabase.from('purchase_order_lines').insert({
    purchase_order_id: po.id,
    item_id: item.id,
    description: 'Yutong Bus ZK6122H (Database Recovery)',
    quantity: 1,
    unit_price: 68000,
    line_total: 68000,
    company_id: po.company_id
  });
  console.log('Fixed PO items', res.error || 'Success');
}
main();
