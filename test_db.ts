import { supabase } from './src/integrations/supabase/client';

async function run() {
  const { data: order } = await supabase
    .from('yutong_orders')
    .select('*, yutong_quotations(*)')
    .eq('order_no', 'YTO-2026-0043')
    .single();
  
  console.log('Order:', order);

  if (order) {
    const { data: invoices } = await supabase
      .from('yutong_invoice_records')
      .select('*')
      .eq('order_id', order.id);
    console.log('Invoices:', invoices);

    if (order.ar_invoice_id) {
        const { data: arInvoice } = await supabase
        .from('ar_invoices')
        .select('*')
        .eq('id', order.ar_invoice_id);
        console.log('AR Invoices linked:', arInvoice);
    } else {
        console.log('No AR Invoice linked to order.');
        
        // Let's check if any AR invoice exists for this order regardless of link
        const { data: arByOrder } = await supabase
        .from('ar_invoices')
        .select('*')
        .eq('source_reference_id', order.id);
        console.log('AR Invoices by source_reference_id:', arByOrder);
    }
  }
}

run().catch(console.error);
