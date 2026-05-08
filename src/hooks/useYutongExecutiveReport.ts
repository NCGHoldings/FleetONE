import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useMemo } from 'react';

export interface YutongReportFilters {
  startDate: string | null;
  endDate: string | null;
  compareWithPrevious: boolean;
  busModels: string[];
  paymentMode: 'all' | 'cash' | 'lease';
}

export interface PeriodMetrics {
  revenue: number;
  orders: number;
  units: number;
  conversionRate: number;
  collectionRate: number;
  delivered: number;
  avgDealSize: number;
}

export interface AgingData {
  current: number;
  days31to60: number;
  days61to90: number;
  over90: number;
}

export interface VelocityData {
  avgQuoteToOrderDays: number;
  avgOrderToDeliveryDays: number;
  avgCollectionDays: number;
}

export interface ReportAlert {
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface CustomerBreakdown {
  newCustomers: number;
  repeatCustomers: number;
  topConcentration: number;
}

export interface YutongReportData {
  pipeline: { totalQuotations: number; draft: number; sent: number; confirmed: number; rejected: number; expired: number; conversionRate: number; avgQuotationValue: number; totalQuotationValue: number; };
  orders: { totalOrders: number; totalOrderValue: number; avgOrderValue: number; totalUnits: number; byPhase: Record<string, number>; cashCount: number; leaseCount: number; totalPaid: number; totalBalance: number; };
  payments: { totalScheduled: number; totalPaid: number; totalPending: number; totalOverdue: number; collectionRate: number; lcActive: number; lcTotal: number; };
  shipments: { totalGroups: number; planning: number; inTransit: number; arrived: number; delivered: number; totalUnits: number; };
  operations: { inCustoms: number; inProcessing: number; inRMV: number; customsCleared: number; processingComplete: number; rmvRegistered: number; };
  delivery: { totalDelivered: number; pendingInspections: number; handoverComplete: number; handoverRate: number; };
  afterSales: { activeWarranties: number; openTickets: number; pendingReminders: number; avgFeedbackRating: number; totalFeedback: number; };
  monthlyTrends: Array<{ month: string; quotations: number; orders: number; deliveries: number; revenue: number; }>;
  topCustomers: Array<{ company_name: string; contact_person: string | null; orderCount: number; totalValue: number; avgOrderValue: number; lastOrderDate: string | null; }>;
  busModelPerformance: Array<{ model: string; orders: number; units: number; totalValue: number; avgPrice: number; }>;
  generatedAt: string;
  // New fields
  previousPeriod: PeriodMetrics | null;
  currentPeriod: PeriodMetrics;
  velocity: VelocityData;
  aging: AgingData;
  healthScore: number;
  alerts: ReportAlert[];
  customerBreakdown: CustomerBreakdown;
  revenueByModel: Array<{ model: string; revenue: number; }>;
  revenueByPaymentMode: { cash: number; lease: number; };
  availableBusModels: string[];
}

function daysBetween(d1: string, d2: string): number {
  return Math.abs(new Date(d1).getTime() - new Date(d2).getTime()) / (1000 * 60 * 60 * 24);
}

async function fetchReportData(filters: YutongReportFilters): Promise<YutongReportData> {
  const now = new Date();

  const [
    quotationsRes, ordersRes, paymentSchedulesRes, lcRes,
    shipmentGroupsRes, shipmentsRes, customsRes, processingRes,
    rmvRes, inspectionsRes, confirmationsRes, handoversRes,
    warrantiesRes, ticketsRes, remindersRes, feedbackRes,
  ] = await Promise.all([
    supabase.from('yutong_quotations').select('id, status, total_price, quantity, created_at, bus_model, customer_name, is_active_version'),
    supabase.from('yutong_orders').select('id, status, total_amount, quantity, unit_price, payment_mode, current_phase, total_paid, balance_due, bus_model, customer_id, order_date, actual_delivery_date, created_at, expected_delivery_date'),
    supabase.from('yutong_payment_schedules').select('id, amount, status, due_date, payment_date'),
    supabase.from('yutong_letter_of_credits').select('id, status, lc_amount'),
    supabase.from('yutong_shipment_groups').select('id, status, shipment_name, created_at'),
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

  let allQuotations = (quotationsRes.data || []).filter(q => q.is_active_version !== false);
  let allOrders = ordersRes.data || [];
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

  // Collect available bus models
  const availableBusModels = [...new Set([
    ...allOrders.map(o => o.bus_model).filter(Boolean),
    ...allQuotations.map(q => q.bus_model).filter(Boolean),
  ])] as string[];

  // Apply filters
  let quotations = allQuotations;
  let orders = allOrders;

  if (filters.startDate) {
    quotations = quotations.filter(q => q.created_at && q.created_at >= filters.startDate!);
    orders = orders.filter(o => o.order_date && o.order_date >= filters.startDate!);
  }
  if (filters.endDate) {
    quotations = quotations.filter(q => q.created_at && q.created_at <= filters.endDate! + 'T23:59:59');
    orders = orders.filter(o => o.order_date && o.order_date <= filters.endDate!);
  }
  if (filters.busModels.length > 0) {
    quotations = quotations.filter(q => filters.busModels.includes(q.bus_model || ''));
    orders = orders.filter(o => filters.busModels.includes(o.bus_model || ''));
  }
  if (filters.paymentMode !== 'all') {
    orders = orders.filter(o => o.payment_mode === filters.paymentMode);
  }

  // Previous period calculation
  let previousPeriod: PeriodMetrics | null = null;
  if (filters.compareWithPrevious && filters.startDate && filters.endDate) {
    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);
    const duration = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - duration - 86400000);
    const prevEnd = new Date(start.getTime() - 86400000);
    const prevStartStr = prevStart.toISOString().slice(0, 10);
    const prevEndStr = prevEnd.toISOString().slice(0, 10);

    const prevQuotations = allQuotations.filter(q => q.created_at && q.created_at >= prevStartStr && q.created_at <= prevEndStr + 'T23:59:59');
    let prevOrders = allOrders.filter(o => o.order_date && o.order_date >= prevStartStr && o.order_date <= prevEndStr);
    if (filters.busModels.length > 0) {
      prevOrders = prevOrders.filter(o => filters.busModels.includes(o.bus_model || ''));
    }
    if (filters.paymentMode !== 'all') {
      prevOrders = prevOrders.filter(o => o.payment_mode === filters.paymentMode);
    }

    const prevRevenue = prevOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
    const prevConfirmed = prevQuotations.filter(q => q.status === 'confirmed').length;
    const prevDelivered = prevOrders.filter(o => o.actual_delivery_date).length;
    const prevPaid = prevOrders.reduce((s, o) => s + (o.total_paid || 0), 0);

    previousPeriod = {
      revenue: prevRevenue,
      orders: prevOrders.length,
      units: prevOrders.reduce((s, o) => s + (o.quantity || 0), 0),
      conversionRate: prevQuotations.length > 0 ? (prevConfirmed / prevQuotations.length) * 100 : 0,
      collectionRate: prevRevenue > 0 ? (prevPaid / prevRevenue) * 100 : 0,
      delivered: prevDelivered,
      avgDealSize: prevOrders.length > 0 ? prevRevenue / prevOrders.length : 0,
    };
  }

  // Pipeline
  const totalQ = quotations.length;
  const draft = quotations.filter(q => q.status === 'draft').length;
  const sent = quotations.filter(q => q.status === 'sent').length;
  const confirmed = quotations.filter(q => q.status === 'confirmed').length;
  const rejected = quotations.filter(q => q.status === 'rejected').length;
  const expired = quotations.filter(q => q.status === 'expired').length;
  const totalQValue = quotations.reduce((s, q) => s + (q.total_price || 0), 0);

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

  // Shipments
  const sgPlanning = shipmentGroups.filter(s => s.status === 'planning').length;
  const sgInTransit = shipmentGroups.filter(s => s.status === 'in_transit').length;
  const sgArrived = shipmentGroups.filter(s => s.status === 'arrived').length;
  const sgDelivered = shipmentGroups.filter(s => s.status === 'delivered').length;

  // Operations
  const inCustoms = customs.filter(c => !['cleared', 'completed', 'released'].includes(c.customs_status || '')).length;
  const customsCleared = customs.filter(c => ['cleared', 'completed', 'released'].includes(c.customs_status || '')).length;
  const inProcessing = processing.filter(p => !['completed', 'delivered'].includes(p.current_stage || '')).length;
  const processingComplete = processing.filter(p => ['completed', 'delivered'].includes(p.current_stage || '')).length;
  const inRMV = rmv.filter(r => !['registered', 'completed'].includes(r.registration_status || '')).length;
  const rmvRegistered = rmv.filter(r => ['registered', 'completed'].includes(r.registration_status || '')).length;

  // Delivery
  const pendingInspections = inspections.filter(i => i.status !== 'completed' && i.status !== 'approved').length;
  const handoverComplete = handovers.filter(h => h.status === 'completed').length;

  // After Sales
  const activeWarranties = warranties.filter(w => w.status === 'active').length;
  const openTickets = tickets.filter(t => t.status !== 'closed' && t.status !== 'resolved').length;
  const pendingReminders = reminders.filter(r => !r.service_completed).length;
  const ratingMap: Record<string, number> = { excellent: 5, good: 4, average: 3, poor: 2, very_poor: 1 };
  const ratingValues = feedback.map(f => ratingMap[f.overall_rating as string] || 0).filter(v => v > 0);
  const avgRating = ratingValues.length > 0 ? ratingValues.reduce((s, v) => s + v, 0) / ratingValues.length : 0;

  // Monthly Trends (always full 12 months for charting)
  const monthlyTrends: YutongReportData['monthlyTrends'] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now); d.setMonth(d.getMonth() - i);
    const monthStr = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    monthlyTrends.push({
      month: label,
      quotations: allQuotations.filter(q => q.created_at?.startsWith(monthStr)).length,
      orders: allOrders.filter(o => o.order_date?.startsWith(monthStr)).length,
      deliveries: allOrders.filter(o => o.actual_delivery_date?.startsWith(monthStr)).length,
      revenue: allOrders.filter(o => o.order_date?.startsWith(monthStr)).reduce((s, o) => s + (o.total_amount || 0), 0),
    });
  }

  // Top Customers (enhanced)
  const customerIds = [...new Set(orders.map(o => o.customer_id).filter(Boolean))] as string[];
  let customersData: any[] = [];
  if (customerIds.length > 0) {
    const { data } = await supabase.from('yutong_customers').select('id, company_name, contact_person').in('id', customerIds);
    customersData = data || [];
  }
  const customerLookup = new Map(customersData.map((c: any) => [c.id, c]));
  const customerMap = new Map<string, { company_name: string; contact_person: string | null; orderCount: number; totalValue: number; avgOrderValue: number; lastOrderDate: string | null }>();
  orders.forEach(o => {
    if (!o.customer_id) return;
    const cust = customerLookup.get(o.customer_id);
    const existing = customerMap.get(o.customer_id) || { company_name: cust?.company_name || 'Unknown', contact_person: cust?.contact_person || null, orderCount: 0, totalValue: 0, avgOrderValue: 0, lastOrderDate: null };
    existing.orderCount += 1;
    existing.totalValue += o.total_amount || 0;
    if (!existing.lastOrderDate || (o.order_date && o.order_date > existing.lastOrderDate)) {
      existing.lastOrderDate = o.order_date;
    }
    customerMap.set(o.customer_id, existing);
  });
  const topCustomersArr = [...customerMap.values()].map(c => ({ ...c, avgOrderValue: c.orderCount > 0 ? c.totalValue / c.orderCount : 0 })).sort((a, b) => b.totalValue - a.totalValue).slice(0, 10);

  // Customer Breakdown
  const allCustomerEntries = [...customerMap.values()];
  const repeatCustomers = allCustomerEntries.filter(c => c.orderCount >= 2).length;
  const newCustomers = allCustomerEntries.filter(c => c.orderCount === 1).length;
  const sortedByValue = [...allCustomerEntries].sort((a, b) => b.totalValue - a.totalValue);
  const top3Value = sortedByValue.slice(0, 3).reduce((s, c) => s + c.totalValue, 0);
  const topConcentration = totalOrderValue > 0 ? (top3Value / totalOrderValue) * 100 : 0;

  // Bus Model Performance
  const modelMap = new Map<string, { orders: number; units: number; totalValue: number }>();
  orders.forEach(o => {
    const model = o.bus_model || 'Unknown';
    const existing = modelMap.get(model) || { orders: 0, units: 0, totalValue: 0 };
    existing.orders += 1; existing.units += o.quantity || 0; existing.totalValue += o.total_amount || 0;
    modelMap.set(model, existing);
  });
  const busModelPerformance = [...modelMap.entries()].map(([model, d]) => ({ model, ...d, avgPrice: d.units > 0 ? d.totalValue / d.units : 0 })).sort((a, b) => b.totalValue - a.totalValue);

  // Revenue by model & payment mode
  const revenueByModel = busModelPerformance.map(m => ({ model: m.model, revenue: m.totalValue }));
  const cashRevenue = orders.filter(o => o.payment_mode === 'cash').reduce((s, o) => s + (o.total_amount || 0), 0);
  const leaseRevenue = orders.filter(o => o.payment_mode === 'lease').reduce((s, o) => s + (o.total_amount || 0), 0);

  // Velocity
  const confirmedQuotations = allQuotations.filter(q => q.status === 'confirmed');
  const quoteToOrderDays: number[] = [];
  confirmedQuotations.forEach(q => {
    const matchingOrder = allOrders.find(o => o.customer_id && q.customer_name && o.order_date && q.created_at);
    if (matchingOrder && matchingOrder.order_date && q.created_at) {
      quoteToOrderDays.push(daysBetween(q.created_at, matchingOrder.order_date));
    }
  });

  const deliveredOrders = allOrders.filter(o => o.actual_delivery_date && o.order_date);
  const orderToDeliveryDays = deliveredOrders.map(o => daysBetween(o.order_date!, o.actual_delivery_date!));

  const paidPayments = paymentSchedules.filter(p => p.status === 'paid' && p.due_date && p.payment_date);
  const collectionDays = paidPayments.map(p => daysBetween(p.due_date!, p.payment_date!));

  const avgQuoteToOrderDays = quoteToOrderDays.length > 0 ? quoteToOrderDays.reduce((s, v) => s + v, 0) / quoteToOrderDays.length : 0;
  const avgOrderToDeliveryDays = orderToDeliveryDays.length > 0 ? orderToDeliveryDays.reduce((s, v) => s + v, 0) / orderToDeliveryDays.length : 0;
  const avgCollectionDays = collectionDays.length > 0 ? collectionDays.reduce((s, v) => s + v, 0) / collectionDays.length : 0;

  // Aging
  const nowMs = now.getTime();
  const pendingPayments = paymentSchedules.filter(p => p.status !== 'paid' && p.due_date);
  const aging: AgingData = { current: 0, days31to60: 0, days61to90: 0, over90: 0 };
  pendingPayments.forEach(p => {
    const dueMs = new Date(p.due_date!).getTime();
    const daysOverdue = Math.max(0, (nowMs - dueMs) / (1000 * 60 * 60 * 24));
    const amt = p.amount || 0;
    if (daysOverdue <= 30) aging.current += amt;
    else if (daysOverdue <= 60) aging.days31to60 += amt;
    else if (daysOverdue <= 90) aging.days61to90 += amt;
    else aging.over90 += amt;
  });

  // Health Score
  const convRate = totalQ > 0 ? (confirmed / totalQ) * 100 : 0;
  const collRate = totalScheduledAmt > 0 ? (totalPaidAmt / totalScheduledAmt) * 100 : 0;
  const delivRate = orders.length > 0 ? (confirmations.length / orders.length) * 100 : 0;
  const custScore = avgRating > 0 ? (avgRating / 5) * 100 : 50;
  const healthScore = Math.round((Math.min(convRate, 100) * 0.25 + Math.min(collRate, 100) * 0.25 + Math.min(delivRate, 100) * 0.25 + Math.min(custScore, 100) * 0.25));

  // Alerts
  const alerts: ReportAlert[] = [];
  if (overdueSchedules.length > 0) {
    const overdueAmt = overdueSchedules.reduce((s, p) => s + (p.amount || 0), 0);
    alerts.push({ type: 'overdue', message: `${overdueSchedules.length} overdue payments totaling LKR ${overdueAmt.toLocaleString()}`, severity: 'critical' });
  }
  if (aging.over90 > 0) {
    alerts.push({ type: 'aging', message: `LKR ${aging.over90.toLocaleString()} outstanding over 90 days`, severity: 'critical' });
  }
  const stalledOrders = orders.filter(o => o.current_phase && !['completed', 'delivered'].includes(o.current_phase));
  if (stalledOrders.length > 5) {
    alerts.push({ type: 'stalled', message: `${stalledOrders.length} orders still in active pipeline`, severity: 'warning' });
  }
  if (expired > 0) {
    alerts.push({ type: 'expired', message: `${expired} quotations expired — follow up or archive`, severity: 'info' });
  }
  if (openTickets > 3) {
    alerts.push({ type: 'tickets', message: `${openTickets} open support tickets pending resolution`, severity: 'warning' });
  }

  // Current period metrics
  const currentPeriod: PeriodMetrics = {
    revenue: totalOrderValue,
    orders: orders.length,
    units: totalUnitsOrdered,
    conversionRate: convRate,
    collectionRate: collRate,
    delivered: confirmations.length,
    avgDealSize: orders.length > 0 ? totalOrderValue / orders.length : 0,
  };

  return {
    pipeline: { totalQuotations: totalQ, draft, sent, confirmed, rejected, expired, conversionRate: convRate, avgQuotationValue: totalQ > 0 ? totalQValue / totalQ : 0, totalQuotationValue: totalQValue },
    orders: { totalOrders: orders.length, totalOrderValue, avgOrderValue: orders.length > 0 ? totalOrderValue / orders.length : 0, totalUnits: totalUnitsOrdered, byPhase, cashCount, leaseCount, totalPaid: orderTotalPaid, totalBalance: orderTotalBalance },
    payments: { totalScheduled: totalScheduledAmt, totalPaid: totalPaidAmt, totalPending: pendingSchedules.reduce((s, p) => s + (p.amount || 0), 0), totalOverdue: overdueSchedules.reduce((s, p) => s + (p.amount || 0), 0), collectionRate: totalScheduledAmt > 0 ? (totalPaidAmt / totalScheduledAmt) * 100 : 0, lcActive: lcs.filter(l => l.status === 'issued').length, lcTotal: lcs.length },
    shipments: { totalGroups: shipmentGroups.length, planning: sgPlanning, inTransit: sgInTransit, arrived: sgArrived, delivered: sgDelivered, totalUnits: shipments.length },
    operations: { inCustoms, inProcessing, inRMV, customsCleared, processingComplete, rmvRegistered },
    delivery: { totalDelivered: confirmations.length, pendingInspections, handoverComplete, handoverRate: handovers.length > 0 ? (handoverComplete / handovers.length) * 100 : 0 },
    afterSales: { activeWarranties, openTickets, pendingReminders, avgFeedbackRating: Math.round(avgRating * 10) / 10, totalFeedback: feedback.length },
    monthlyTrends, topCustomers: topCustomersArr, busModelPerformance,
    generatedAt: now.toISOString(),
    previousPeriod,
    currentPeriod,
    velocity: { avgQuoteToOrderDays: Math.round(avgQuoteToOrderDays), avgOrderToDeliveryDays: Math.round(avgOrderToDeliveryDays), avgCollectionDays: Math.round(avgCollectionDays) },
    aging,
    healthScore,
    alerts,
    customerBreakdown: { newCustomers, repeatCustomers, topConcentration: Math.round(topConcentration) },
    revenueByModel,
    revenueByPaymentMode: { cash: cashRevenue, lease: leaseRevenue },
    availableBusModels,
  };
}

export function useYutongExecutiveReport(filters?: YutongReportFilters) {
  const effectiveFilters: YutongReportFilters = filters || {
    startDate: null,
    endDate: null,
    compareWithPrevious: false,
    busModels: [],
    paymentMode: 'all',
  };

  return useQuery({
    queryKey: ['yutong-executive-report', effectiveFilters],
    queryFn: () => fetchReportData(effectiveFilters),
    refetchInterval: 10 * 60 * 1000, // 10 min — this fn fires 16 parallel queries
    staleTime: 5 * 60 * 1000,
  });
}
