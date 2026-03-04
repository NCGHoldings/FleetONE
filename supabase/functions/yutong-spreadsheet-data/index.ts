import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { access_code, action, order_id, field, value, order_data } = body

    if (!access_code || typeof access_code !== 'string') {
      return new Response(JSON.stringify({ error: 'Access code is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Validate access code
    const { data: setting } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'yutong_spreadsheet_access_code')
      .single()

    const storedCode = setting
      ? typeof setting.setting_value === 'string'
        ? setting.setting_value
        : JSON.stringify(setting.setting_value).replace(/"/g, '')
      : 'YTSHT2026'

    if (storedCode !== access_code) {
      return new Response(JSON.stringify({ error: 'Invalid access code' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Handle delete action
    if (action === 'delete' && order_id) {
      const { error } = await supabase
        .from('yutong_orders')
        .delete()
        .eq('id', order_id)

      if (error) {
        console.error('Delete error:', error)
        return new Response(JSON.stringify({ error: 'Failed to delete order' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Handle add action
    if (action === 'add' && order_data) {
      const orderNo = `YTO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`
      const { error } = await supabase
        .from('yutong_orders')
        .insert({
          order_no: orderNo,
          bus_model: order_data.bus_model,
          quantity: order_data.quantity || 1,
          unit_price: order_data.unit_price || 0,
          total_amount: order_data.total_amount || 0,
          balance_due: order_data.total_amount || 0,
          payment_mode: order_data.payment_mode || 'cash',
          expected_delivery_date: order_data.expected_delivery_date || null,
          notes: order_data.notes || null,
          status: 'pending',
          order_date: new Date().toISOString().slice(0, 10),
        })

      if (error) {
        console.error('Add error:', error)
        return new Response(JSON.stringify({ error: 'Failed to add order' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Handle update action
    if (action === 'update' && order_id && field) {
      const allowedFields = ['status', 'current_phase', 'payment_mode', 'progress_percentage', 'expected_delivery_date', 'notes']
      if (!allowedFields.includes(field)) {
        return new Response(JSON.stringify({ error: 'Field not editable' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { error } = await supabase
        .from('yutong_orders')
        .update({ [field]: value })
        .eq('id', order_id)

      if (error) {
        console.error('Update error:', error)
        return new Response(JSON.stringify({ error: 'Failed to update' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch all data
    const [ordersRes, doRes, crRes, paymentsRes] = await Promise.all([
      supabase.from('yutong_orders').select(`
        id, order_no, bus_model, quantity, total_amount, status, current_phase,
        total_paid, balance_due, payment_mode, progress_percentage, order_date,
        expected_delivery_date, notes,
        yutong_quotations(customer_name, company_name)
      `).order('order_date', { ascending: false }),
      supabase.from('yutong_delivery_orders').select('order_id, do_no, status'),
      supabase.from('yutong_cash_receipts').select('order_id, amount'),
      supabase.from('yutong_customer_payments').select('order_id, payment_amount, payment_method, status').in('status', ['received', 'verified']),
    ])

    const orders = ordersRes.data || []
    const deliveryOrders = doRes.data || []
    const cashReceipts = crRes.data || []
    const payments = paymentsRes.data || []

    // Build maps
    const doMap: Record<string, string> = {}
    deliveryOrders.forEach((d: any) => {
      doMap[d.order_id] = doMap[d.order_id] ? `${doMap[d.order_id]}, ${d.do_no}` : (d.do_no || d.status)
    })

    const crMap: Record<string, number> = {}
    cashReceipts.forEach((cr: any) => {
      crMap[cr.order_id] = (crMap[cr.order_id] || 0) + (cr.amount || 0)
    })

    const chequeMap: Record<string, number> = {}
    const cashMap: Record<string, number> = {}
    payments.forEach((p: any) => {
      if (p.payment_method === 'cheque') chequeMap[p.order_id] = (chequeMap[p.order_id] || 0) + (p.payment_amount || 0)
      else if (p.payment_method === 'cash') cashMap[p.order_id] = (cashMap[p.order_id] || 0) + (p.payment_amount || 0)
    })

    const result = orders.map((o: any) => ({
      id: o.id,
      order_no: o.order_no || '',
      customer_name: o.yutong_quotations?.customer_name || '',
      company_name: o.yutong_quotations?.company_name || '',
      bus_model: o.bus_model || '',
      quantity: o.quantity || 0,
      total_amount: o.total_amount || 0,
      status: o.status || '',
      current_phase: o.current_phase || '',
      do_summary: doMap[o.id] || '-',
      cr_total: crMap[o.id] || 0,
      cheque_total: chequeMap[o.id] || 0,
      cash_total: cashMap[o.id] || 0,
      total_paid: o.total_paid || 0,
      balance_due: o.balance_due || 0,
      payment_mode: o.payment_mode || '',
      progress_percentage: o.progress_percentage || 0,
      order_date: o.order_date || '',
      expected_delivery_date: o.expected_delivery_date,
      notes: o.notes,
    }))

    return new Response(JSON.stringify({ orders: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
