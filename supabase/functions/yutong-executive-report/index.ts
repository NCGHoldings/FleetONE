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
    const { access_code } = await req.json()
    if (!access_code || typeof access_code !== 'string') {
      return new Response(JSON.stringify({ error: 'Access code is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Validate access code
    const { data: setting } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'yutong_report_access_code')
      .single()

    const storedCode = typeof setting.setting_value === 'string' ? setting.setting_value : JSON.stringify(setting.setting_value).replace(/"/g, '')
    if (!setting || storedCode !== access_code) {
      return new Response(JSON.stringify({ error: 'Invalid access code' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Fetch all data
    const now = new Date()
    const [
      quotationsRes, ordersRes, paymentSchedulesRes, lcRes,
      shipmentGroupsRes, shipmentsRes, customsRes, processingRes,
      rmvRes, inspectionsRes, confirmationsRes, handoversRes,
      warrantiesRes, ticketsRes, remindersRes, feedbackRes,
    ] = await Promise.all([
      supabase.from('yutong_quotations').select('id, status, total_price, quantity, created_at, bus_model, customer_name, is_active_version'),
      supabase.from('yutong_orders').select('id, status, total_amount, quantity, unit_price, payment_mode, current_phase, total_paid, balance_due, bus_model, customer_id, order_date, actual_delivery_date'),
      supabase.from('yutong_payment_schedules').select('id, amount, status, due_date, payment_date'),
      supabase.from('yutong_letter_of_credits').select('id, status, lc_amount'),
      supabase.from('yutong_shipment_groups').select('id, status, shipment_name'),
      supabase.from('yutong_shipments').select('id, status'),
      supabase.from('yutong_customs_declarations').select('id, customs_status'),
      supabase.from('yutong_vehicle_processing').select('id, current_stage'),
      supabase.from('yutong_rmv_registrations').select('id, registration_status'),
      supabase.from('yutong_delivery_inspections').select('id, status'),
      supabase.from('yutong_delivery_confirmations').select('id'),
      supabase.from('yutong_customer_handovers').select('id, status'),
      supabase.from('yutong_warranties').select('id, status'),
      supabase.from('yutong_support_tickets').select('id, status, priority'),
      supabase.from('yutong_service_reminders').select('id, service_completed, due_date'),
      supabase.from('yutong_customer_feedback').select('id, overall_rating'),
    ])

    const quotations = quotationsRes.data || []
    const activeQuotations = quotations.filter((q: any) => q.is_active_version !== false)
    const orders = ordersRes.data || []
    const paymentSchedules = paymentSchedulesRes.data || []
    const lcs = lcRes.data || []
    const shipmentGroups = shipmentGroupsRes.data || []
    const shipments = shipmentsRes.data || []
    const customs = customsRes.data || []
    const processing = processingRes.data || []
    const rmv = rmvRes.data || []
    const inspections = inspectionsRes.data || []
    const confirmations = confirmationsRes.data || []
    const handovers = handoversRes.data || []
    const warranties = warrantiesRes.data || []
    const tickets = ticketsRes.data || []
    const reminders = remindersRes.data || []
    const feedback = feedbackRes.data || []

    // Pipeline
    const totalQ = activeQuotations.length
    const draft = activeQuotations.filter((q: any) => q.status === 'draft').length
    const sent = activeQuotations.filter((q: any) => q.status === 'sent').length
    const confirmed = activeQuotations.filter((q: any) => q.status === 'confirmed').length
    const rejected = activeQuotations.filter((q: any) => q.status === 'rejected').length
    const expired = activeQuotations.filter((q: any) => q.status === 'expired').length
    const totalQValue = activeQuotations.reduce((s: number, q: any) => s + (q.total_price || 0), 0)

    // Orders
    const totalOrderValue = orders.reduce((s: number, o: any) => s + (o.total_amount || 0), 0)
    const totalUnitsOrdered = orders.reduce((s: number, o: any) => s + (o.quantity || 0), 0)
    const byPhase: Record<string, number> = {}
    orders.forEach((o: any) => { const phase = o.current_phase || 'unknown'; byPhase[phase] = (byPhase[phase] || 0) + 1 })
    const cashCount = orders.filter((o: any) => o.payment_mode === 'cash').length
    const leaseCount = orders.filter((o: any) => o.payment_mode === 'lease').length
    const orderTotalPaid = orders.reduce((s: number, o: any) => s + (o.total_paid || 0), 0)
    const orderTotalBalance = orders.reduce((s: number, o: any) => s + (o.balance_due || 0), 0)

    // Payments
    const paidSchedules = paymentSchedules.filter((p: any) => p.status === 'paid')
    const pendingSchedules = paymentSchedules.filter((p: any) => p.status === 'pending')
    const overdueSchedules = paymentSchedules.filter((p: any) => p.status === 'overdue')
    const totalScheduledAmt = paymentSchedules.reduce((s: number, p: any) => s + (p.amount || 0), 0)
    const totalPaidAmt = paidSchedules.reduce((s: number, p: any) => s + (p.amount || 0), 0)

    // Shipments
    const sgPlanning = shipmentGroups.filter((s: any) => s.status === 'planning').length
    const sgInTransit = shipmentGroups.filter((s: any) => s.status === 'in_transit').length
    const sgArrived = shipmentGroups.filter((s: any) => s.status === 'arrived').length
    const sgDelivered = shipmentGroups.filter((s: any) => s.status === 'delivered').length

    // Operations
    const inCustoms = customs.filter((c: any) => !['cleared', 'completed', 'released'].includes(c.customs_status || '')).length
    const customsCleared = customs.filter((c: any) => ['cleared', 'completed', 'released'].includes(c.customs_status || '')).length
    const inProcessing = processing.filter((p: any) => !['completed', 'delivered'].includes(p.current_stage || '')).length
    const processingComplete = processing.filter((p: any) => ['completed', 'delivered'].includes(p.current_stage || '')).length
    const inRMV = rmv.filter((r: any) => !['registered', 'completed'].includes(r.registration_status || '')).length
    const rmvRegistered = rmv.filter((r: any) => ['registered', 'completed'].includes(r.registration_status || '')).length

    // Delivery
    const pendingInspections = inspections.filter((i: any) => i.status !== 'completed' && i.status !== 'approved').length
    const handoverComplete = handovers.filter((h: any) => h.status === 'completed').length

    // After Sales
    const activeWarranties = warranties.filter((w: any) => w.status === 'active').length
    const openTickets = tickets.filter((t: any) => t.status !== 'closed' && t.status !== 'resolved').length
    const pendingReminders = reminders.filter((r: any) => !r.service_completed).length
    const ratingMap: Record<string, number> = { excellent: 5, good: 4, average: 3, poor: 2, very_poor: 1 }
    const ratingValues = feedback.map((f: any) => ratingMap[f.overall_rating as string] || 0).filter((v: number) => v > 0)
    const avgRating = ratingValues.length > 0 ? ratingValues.reduce((s: number, v: number) => s + v, 0) / ratingValues.length : 0

    // Monthly Trends
    const monthlyTrends: any[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now); d.setMonth(d.getMonth() - i)
      const monthStr = d.toISOString().slice(0, 7)
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      monthlyTrends.push({
        month: label,
        quotations: activeQuotations.filter((q: any) => q.created_at?.startsWith(monthStr)).length,
        orders: orders.filter((o: any) => o.order_date?.startsWith(monthStr)).length,
        deliveries: orders.filter((o: any) => o.actual_delivery_date?.startsWith(monthStr)).length,
        revenue: orders.filter((o: any) => o.order_date?.startsWith(monthStr)).reduce((s: number, o: any) => s + (o.total_amount || 0), 0),
      })
    }

    // Top Customers
    const customerIds = [...new Set(orders.map((o: any) => o.customer_id).filter(Boolean))] as string[]
    let customersData: any[] = []
    if (customerIds.length > 0) {
      const { data } = await supabase.from('yutong_customers').select('id, company_name, contact_person').in('id', customerIds)
      customersData = data || []
    }
    const customerLookup = new Map(customersData.map((c: any) => [c.id, c]))
    const customerMap = new Map<string, any>()
    orders.forEach((o: any) => {
      if (!o.customer_id) return
      const cust = customerLookup.get(o.customer_id)
      const existing = customerMap.get(o.customer_id) || { company_name: cust?.company_name || 'Unknown', contact_person: cust?.contact_person || null, orderCount: 0, totalValue: 0 }
      existing.orderCount += 1; existing.totalValue += o.total_amount || 0
      customerMap.set(o.customer_id, existing)
    })
    const topCustomers = [...customerMap.values()].sort((a: any, b: any) => b.totalValue - a.totalValue).slice(0, 10)

    // Bus Model Performance
    const modelMap = new Map<string, any>()
    orders.forEach((o: any) => {
      const model = o.bus_model || 'Unknown'
      const existing = modelMap.get(model) || { orders: 0, units: 0, totalValue: 0 }
      existing.orders += 1; existing.units += o.quantity || 0; existing.totalValue += o.total_amount || 0
      modelMap.set(model, existing)
    })
    const busModelPerformance = [...modelMap.entries()].map(([model, d]: [string, any]) => ({ model, ...d, avgPrice: d.units > 0 ? d.totalValue / d.units : 0 })).sort((a: any, b: any) => b.totalValue - a.totalValue)

    const reportData = {
      pipeline: { totalQuotations: totalQ, draft, sent, confirmed, rejected, expired, conversionRate: totalQ > 0 ? (confirmed / totalQ) * 100 : 0, avgQuotationValue: totalQ > 0 ? totalQValue / totalQ : 0, totalQuotationValue: totalQValue },
      orders: { totalOrders: orders.length, totalOrderValue, avgOrderValue: orders.length > 0 ? totalOrderValue / orders.length : 0, totalUnits: totalUnitsOrdered, byPhase, cashCount, leaseCount, totalPaid: orderTotalPaid, totalBalance: orderTotalBalance },
      payments: { totalScheduled: totalScheduledAmt, totalPaid: totalPaidAmt, totalPending: pendingSchedules.reduce((s: number, p: any) => s + (p.amount || 0), 0), totalOverdue: overdueSchedules.reduce((s: number, p: any) => s + (p.amount || 0), 0), collectionRate: totalScheduledAmt > 0 ? (totalPaidAmt / totalScheduledAmt) * 100 : 0, lcActive: lcs.filter((l: any) => l.status === 'issued').length, lcTotal: lcs.length },
      shipments: { totalGroups: shipmentGroups.length, planning: sgPlanning, inTransit: sgInTransit, arrived: sgArrived, delivered: sgDelivered, totalUnits: shipments.length },
      operations: { inCustoms, inProcessing, inRMV, customsCleared, processingComplete, rmvRegistered },
      delivery: { totalDelivered: confirmations.length, pendingInspections, handoverComplete, handoverRate: handovers.length > 0 ? (handoverComplete / handovers.length) * 100 : 0 },
      afterSales: { activeWarranties, openTickets, pendingReminders, avgFeedbackRating: Math.round(avgRating * 10) / 10, totalFeedback: feedback.length },
      monthlyTrends, topCustomers, busModelPerformance,
      generatedAt: now.toISOString(),
    }

    return new Response(JSON.stringify(reportData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})