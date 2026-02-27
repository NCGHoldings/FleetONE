import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface YutongReportData {
  pipeline: { totalQuotations: number; draft: number; sent: number; confirmed: number; rejected: number; expired: number; conversionRate: number; avgQuotationValue: number; totalQuotationValue: number; };
  orders: { totalOrders: number; totalOrderValue: number; avgOrderValue: number; totalUnits: number; byPhase: Record<string, number>; cashCount: number; leaseCount: number; totalPaid: number; totalBalance: number; };
  payments: { totalScheduled: number; totalPaid: number; totalPending: number; totalOverdue: number; collectionRate: number; lcActive: number; lcTotal: number; };
  shipments: { totalGroups: number; planning: number; inTransit: number; arrived: number; delivered: number; totalUnits: number; };
  operations: { inCustoms: number; inProcessing: number; inRMV: number; customsCleared: number; processingComplete: number; rmvRegistered: number; };
  delivery: { totalDelivered: number; pendingInspections: number; handoverComplete: number; handoverRate: number; };
  afterSales: { activeWarranties: number; openTickets: number; pendingReminders: number; avgFeedbackRating: number; totalFeedback: number; };
  monthlyTrends: Array<{ month: string; quotations: number; orders: number; deliveries: number; revenue: number; }>;
  topCustomers: Array<{ company_name: string; contact_person: string | null; orderCount: number; totalValue: number; }>;
  busModelPerformance: Array<{ model: string; orders: number; units: number; totalValue: number; avgPrice: number; }>;
  generatedAt: string;
}

async function fetchReportData(): Promise<YutongReportData> {
  const now = new Date();

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
  ]);

  const quotations = quotationsRes.data || [];
  const activeQuotations = quotations.filter(q => q.is_active_version !== false);
  const orders = ordersRes.data || [];
  const paymentSchedules = paymentSchedulesRes.data || [];
  const lcs = lcRes.data || [];
  const shipmentGroups = shipmentGroupsRes.data || [];
  const shipments = shipmentsRes.data || [];
  const customs = customsRes.data || [];
  const processing = processingRes.data || [];
  const rmv = rmvRes.data || [];
  const inspections = inspectionsRes.data || [];
  const confirmations = confirmationsRes.data || [];
  const handovers = handoversRes.data || [];
  const warranties = warrantiesRes.data || [];
  const tickets = ticketsRes.data || [];
  const reminders = remindersRes.data || [];
  const feedback = feedbackRes.data || [];

  // Pipeline
  const totalQ = activeQuotations.length;
  const draft = activeQuotations.filter(q => q.status === 'draft').length;
  const sent = activeQuotations.filter(q => q.status === 'sent').length;
  const confirmed = activeQuotations.filter(q => q.status === 'confirmed').length;
  const rejected = activeQuotations.filter(q => q.status === 'rejected').length;
  const expired = activeQuotations.filter(q => q.status === 'expired').length;
  const totalQValue = activeQuotations.reduce((s, q) => s + (q.total_price || 0), 0);

  // Orders
  const totalOrderValue = orders.reduce((s, o) => s + (o.total_amount || 0), 0);
  const totalUnitsOrdered = orders.reduce((s, o) => s + (o.quantity || 0), 0);
  const byPhase: Record<string, number> = {};
  orders.forEach(o => { const phase = o.current_phase || 'unknown'; byPhase[phase] = (byPhase[phase] || 0) + 1; });
  const cashCount = orders.filter(o => o.payment_mode === 'cash').length;
  const leaseCount = orders.filter(o => o.payment_mode === 'lease').length;
  const orderTotalPaid = orders.reduce((s, o) => s + (o.total_paid || 0), 0);
  const orderTotalBalance = orders.reduce((s, o) => s + (o.balance_due || 0), 0);

  // Payments
  const paidSchedules = paymentSchedules.filter(p => p.status === 'paid');
  const pendingSchedules = paymentSchedules.filter(p => p.status === 'pending');
  const overdueSchedules = paymentSchedules.filter(p => p.status === 'overdue');
  const totalScheduledAmt = paymentSchedules.reduce((s, p) => s + (p.amount || 0), 0);
  const totalPaidAmt = paidSchedules.reduce((s, p) => s + (p.amount || 0), 0);

  // Shipments - shipment_groups has status as string
  const sgPlanning = shipmentGroups.filter(s => s.status === 'planning').length;
  const sgInTransit = shipmentGroups.filter(s => s.status === 'in_transit').length;
  const sgArrived = shipmentGroups.filter(s => s.status === 'arrived').length;
  const sgDelivered = shipmentGroups.filter(s => s.status === 'delivered').length;

  // Operations - customs_status, not declaration_status
  const inCustoms = customs.filter(c => !['cleared', 'completed', 'released'].includes(c.customs_status || '')).length;
  const customsCleared = customs.filter(c => ['cleared', 'completed', 'released'].includes(c.customs_status || '')).length;
  // vehicle_processing uses 'current_stage' enum
  const inProcessing = processing.filter(p => !['completed', 'delivered'].includes(p.current_stage || '')).length;
  const processingComplete = processing.filter(p => ['completed', 'delivered'].includes(p.current_stage || '')).length;
  const inRMV = rmv.filter(r => !['registered', 'completed'].includes(r.registration_status || '')).length;
  const rmvRegistered = rmv.filter(r => ['registered', 'completed'].includes(r.registration_status || '')).length;

  // Delivery - delivery_inspections status enum: approved|completed|failed|in_progress|pending
  const pendingInspections = inspections.filter(i => i.status !== 'completed' && i.status !== 'approved').length;
  const handoverComplete = handovers.filter(h => h.status === 'completed').length;

  // After Sales - warranties uses 'status' column
  const activeWarranties = warranties.filter(w => w.status === 'active').length;
  const openTickets = tickets.filter(t => t.status !== 'closed' && t.status !== 'resolved').length;
  // service_reminders has no 'status' column - use service_completed boolean
  const pendingReminders = reminders.filter(r => !r.service_completed).length;
  // feedback overall_rating is an enum, not number - count by mapping
  const ratingMap: Record<string, number> = { excellent: 5, good: 4, average: 3, poor: 2, very_poor: 1 };
  const ratingValues = feedback.map(f => ratingMap[f.overall_rating as string] || 0).filter(v => v > 0);
  const avgRating = ratingValues.length > 0 ? ratingValues.reduce((s, v) => s + v, 0) / ratingValues.length : 0;

  // Monthly Trends
  const monthlyTrends: YutongReportData['monthlyTrends'] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now); d.setMonth(d.getMonth() - i);
    const monthStr = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    monthlyTrends.push({
      month: label,
      quotations: activeQuotations.filter(q => q.created_at?.startsWith(monthStr)).length,
      orders: orders.filter(o => o.order_date?.startsWith(monthStr)).length,
      deliveries: orders.filter(o => o.actual_delivery_date?.startsWith(monthStr)).length,
      revenue: orders.filter(o => o.order_date?.startsWith(monthStr)).reduce((s, o) => s + (o.total_amount || 0), 0),
    });
  }

  // Top Customers
  const customerIds = [...new Set(orders.map(o => o.customer_id).filter(Boolean))] as string[];
  let customersData: any[] = [];
  if (customerIds.length > 0) {
    const { data } = await supabase.from('yutong_customers').select('id, company_name, contact_person').in('id', customerIds);
    customersData = data || [];
  }
  const customerLookup = new Map(customersData.map((c: any) => [c.id, c]));
  const customerMap = new Map<string, { company_name: string; contact_person: string | null; orderCount: number; totalValue: number }>();
  orders.forEach(o => {
    if (!o.customer_id) return;
    const cust = customerLookup.get(o.customer_id);
    const existing = customerMap.get(o.customer_id) || { company_name: cust?.company_name || 'Unknown', contact_person: cust?.contact_person || null, orderCount: 0, totalValue: 0 };
    existing.orderCount += 1; existing.totalValue += o.total_amount || 0;
    customerMap.set(o.customer_id, existing);
  });
  const topCustomers = [...customerMap.values()].sort((a, b) => b.totalValue - a.totalValue).slice(0, 10);

  // Bus Model Performance
  const modelMap = new Map<string, { orders: number; units: number; totalValue: number }>();
  orders.forEach(o => {
    const model = o.bus_model || 'Unknown';
    const existing = modelMap.get(model) || { orders: 0, units: 0, totalValue: 0 };
    existing.orders += 1; existing.units += o.quantity || 0; existing.totalValue += o.total_amount || 0;
    modelMap.set(model, existing);
  });
  const busModelPerformance = [...modelMap.entries()].map(([model, d]) => ({ model, ...d, avgPrice: d.units > 0 ? d.totalValue / d.units : 0 })).sort((a, b) => b.totalValue - a.totalValue);

  return {
    pipeline: { totalQuotations: totalQ, draft, sent, confirmed, rejected, expired, conversionRate: totalQ > 0 ? (confirmed / totalQ) * 100 : 0, avgQuotationValue: totalQ > 0 ? totalQValue / totalQ : 0, totalQuotationValue: totalQValue },
    orders: { totalOrders: orders.length, totalOrderValue, avgOrderValue: orders.length > 0 ? totalOrderValue / orders.length : 0, totalUnits: totalUnitsOrdered, byPhase, cashCount, leaseCount, totalPaid: orderTotalPaid, totalBalance: orderTotalBalance },
    payments: { totalScheduled: totalScheduledAmt, totalPaid: totalPaidAmt, totalPending: pendingSchedules.reduce((s, p) => s + (p.amount || 0), 0), totalOverdue: overdueSchedules.reduce((s, p) => s + (p.amount || 0), 0), collectionRate: totalScheduledAmt > 0 ? (totalPaidAmt / totalScheduledAmt) * 100 : 0, lcActive: lcs.filter(l => l.status === 'issued').length, lcTotal: lcs.length },
    shipments: { totalGroups: shipmentGroups.length, planning: sgPlanning, inTransit: sgInTransit, arrived: sgArrived, delivered: sgDelivered, totalUnits: shipments.length },
    operations: { inCustoms, inProcessing, inRMV, customsCleared, processingComplete, rmvRegistered },
    delivery: { totalDelivered: confirmations.length, pendingInspections, handoverComplete, handoverRate: handovers.length > 0 ? (handoverComplete / handovers.length) * 100 : 0 },
    afterSales: { activeWarranties, openTickets, pendingReminders, avgFeedbackRating: Math.round(avgRating * 10) / 10, totalFeedback: feedback.length },
    monthlyTrends, topCustomers, busModelPerformance,
    generatedAt: now.toISOString(),
  };
}

export function useYutongExecutiveReport() {
  return useQuery({ queryKey: ['yutong-executive-report'], queryFn: fetchReportData, refetchInterval: 60000, staleTime: 30000 });
}
