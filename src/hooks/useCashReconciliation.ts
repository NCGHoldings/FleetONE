import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

// ── Per-Trip Detail ──
export interface TripDetail {
  id: string;
  trip_no: string;
  route_label: string;
  income_details: any;
  total_revenue: number;
  cash_revenue: number;
  online_revenue: number;
}

// ── Expense Detail (from daily_bus_expenses table) ──
export interface BusExpenseDetail {
  fuel_cost: number;
  salary: number;
  food: number;
  runner: number;
  parking: number;
  police: number;
  repair: number;
  tyre_tube: number;
  highway_charges: number;
  ntc: number;
  other: number;
  [key: string]: number;
}

// ── Per-Bus Row ──
export interface CashSettlementRow {
  bus_id: string;
  bus_no: string;
  trip_count: number;
  trips: TripDetail[];

  // Aggregated Revenue
  total_revenue: number;
  cash_revenue: number;
  online_revenue: number;

  // Expenses (from daily_bus_expenses table)
  total_expenses: number;
  expense_breakdown: BusExpenseDetail;

  // Net
  net_profit: number;
  expected_cash: number;

  // Settlement
  settlement_id?: string;
  actual_cash: number;
  shortage: number;
  overage: number;
  status: 'Draft' | 'Settled';
  notes: string;
}

// ── Fleet Summary ──
export interface DailyCashSummary {
  total_revenue: number;
  total_cash_revenue: number;
  total_online_revenue: number;
  total_expenses: number;
  total_net_profit: number;
  total_expected_cash: number;
  total_actual_collected: number;
  total_shortages: number;
  total_overages: number;
  settled_count: number;
  pending_count: number;
  bus_count: number;
}

// ── Parse income_details JSONB ──
function parseIncome(inc: any) {
  if (!inc || typeof inc !== 'object') return { cash: 0, online: 0, total: 0 };
  const bc = Number(inc.bus_collection || inc.daily_collection || 0);
  const li = Number(inc.luggage_income || inc.luggage_collection || 0);
  const mi = Number(inc.miscellaneous_income || inc.missional || 0);
  const si = Number(inc.special_income || 0);
  const ot = Number(inc.others || 0);
  const cb = Number(inc.call_booking || inc.call_collection || 0);
  const ab = Number(inc.agent_booking || inc.agent_collection || 0);
  return {
    cash: bc + li + mi + si + ot,
    online: cb + ab,
    total: bc + li + mi + si + ot + cb + ab
  };
}

// ── Parse daily_bus_expenses row ──
function parseExpenseRow(exp: any): { total: number; breakdown: BusExpenseDetail } {
  const breakdown: BusExpenseDetail = {
    fuel_cost: Number(exp.fuel_cost || 0),
    salary: Number(exp.salary || 0),
    food: Number(exp.food || 0),
    runner: Number(exp.runner || 0),
    parking: Number(exp.parking || 0),
    police: Number(exp.police || 0),
    repair: Number(exp.repair || 0),
    tyre_tube: Number(exp.tyre_tube || 0),
    highway_charges: Number(exp.highway_charges || 0),
    ntc: Number(exp.ntc || 0),
    other: Number(exp.other || 0) +
           Number(exp.emission_fitness || 0) +
           Number(exp.permits_renewal || 0) +
           Number(exp.staff_accommodation || 0) +
           Number(exp.accident_compensation || 0) +
           Number(exp.log_sheet || 0) +
           Number(exp.vehicle_hire || 0) +
           Number(exp.short_misc || 0) +
           Number(exp.temporary_permit || 0) +
           Number(exp.body_wash || 0) +
           Number(exp.legal_court || 0),
  };
  const total = Object.values(breakdown).reduce((s, v) => s + v, 0);
  return { total, breakdown };
}

const emptyBreakdown: BusExpenseDetail = {
  fuel_cost: 0, salary: 0, food: 0, runner: 0, parking: 0,
  police: 0, repair: 0, tyre_tube: 0, highway_charges: 0, ntc: 0, other: 0
};

export function useCashReconciliation(date: Date) {
  const [data, setData] = useState<CashSettlementRow[]>([]);
  const [summary, setSummary] = useState<DailyCashSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const targetDate = format(date, 'yyyy-MM-dd');

      // 1. Fetch daily trips (REVENUE source)
      const { data: tripsData, error: tripsError } = await supabase
        .from('daily_trips')
        .select(`
          id, trip_no, bus_id, route_label, income, income_details,
          buses!inner(bus_no)
        `)
        .eq('trip_date', targetDate)
        .order('trip_no');
      if (tripsError) throw tripsError;

      // 2. Fetch daily_bus_expenses (EXPENSE source — separate table!)
      const { data: expensesData, error: expError } = await supabase
        .from('daily_bus_expenses')
        .select('*')
        .eq('expense_date', targetDate);
      if (expError) throw expError;

      // 3. Fetch existing settlements
      const { data: settlementData, error: settlementError } = await supabase
        .from('daily_cash_settlements')
        .select('*')
        .eq('settlement_date', targetDate);
      if (settlementError) throw settlementError;

      // Build expense map: bus_id -> expense row
      const expenseMap = new Map<string, any>();
      (expensesData || []).forEach((exp: any) => {
        expenseMap.set(exp.bus_id, exp);
      });

      const busMap = new Map<string, CashSettlementRow>();

      // ── Aggregate per bus from trips ──
      (tripsData || []).forEach((trip: any) => {
        const busId = trip.bus_id;
        if (!busId) return;

        if (!busMap.has(busId)) {
          // Get expense data for this bus
          const expRow = expenseMap.get(busId);
          const { total: totalExp, breakdown } = expRow
            ? parseExpenseRow(expRow)
            : { total: 0, breakdown: { ...emptyBreakdown } };

          busMap.set(busId, {
            bus_id: busId,
            bus_no: trip.buses?.bus_no || 'Unknown',
            trip_count: 0,
            trips: [],
            total_revenue: 0, cash_revenue: 0, online_revenue: 0,
            total_expenses: totalExp,
            expense_breakdown: breakdown,
            net_profit: 0, expected_cash: 0,
            actual_cash: 0, shortage: 0, overage: 0,
            status: 'Draft', notes: ''
          });
        }

        const row = busMap.get(busId)!;
        row.trip_count += 1;

        const inc = parseIncome(trip.income_details);

        row.trips.push({
          id: trip.id,
          trip_no: trip.trip_no || `Trip ${row.trip_count}`,
          route_label: trip.route_label || '',
          income_details: trip.income_details || {},
          total_revenue: inc.total,
          cash_revenue: inc.cash,
          online_revenue: inc.online
        });

        row.total_revenue += inc.total;
        row.cash_revenue += inc.cash;
        row.online_revenue += inc.online;
      });

      // ── Compute net / expected cash ──
      // Fuel is paid by card, so exclude it from expected cash calculation
      busMap.forEach(row => {
        const fuelCost = row.expense_breakdown.fuel_cost || 0;
        const cashExpenses = row.total_expenses - fuelCost; // Expenses actually paid from cash
        row.net_profit = row.total_revenue - row.total_expenses;
        row.expected_cash = row.cash_revenue - cashExpenses; // Fuel NOT deducted from cash
      });

      // ── Merge settlements ──
      (settlementData || []).forEach(s => {
        if (busMap.has(s.bus_id)) {
          const row = busMap.get(s.bus_id)!;
          row.settlement_id = s.id;
          row.actual_cash = s.actual_cash;
          row.shortage = s.shortage;
          row.overage = s.overage;
          row.status = s.status as any;
          row.notes = s.notes || '';
        }
      });

      const rows = Array.from(busMap.values());
      setData(rows);

      setSummary({
        total_revenue: rows.reduce((a, r) => a + r.total_revenue, 0),
        total_cash_revenue: rows.reduce((a, r) => a + r.cash_revenue, 0),
        total_online_revenue: rows.reduce((a, r) => a + r.online_revenue, 0),
        total_expenses: rows.reduce((a, r) => a + r.total_expenses, 0),
        total_net_profit: rows.reduce((a, r) => a + r.net_profit, 0),
        total_expected_cash: rows.reduce((a, r) => a + r.expected_cash, 0),
        total_actual_collected: rows.reduce((a, r) => a + (r.status === 'Settled' ? r.actual_cash : 0), 0),
        total_shortages: rows.reduce((a, r) => a + r.shortage, 0),
        total_overages: rows.reduce((a, r) => a + r.overage, 0),
        settled_count: rows.filter(r => r.status === 'Settled').length,
        pending_count: rows.filter(r => r.status !== 'Settled').length,
        bus_count: rows.length,
      });

    } catch (err: any) {
      console.error("Error in useCashReconciliation", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [date]);

  // Save settlement
  const saveSettlement = async (row: CashSettlementRow) => {
    try {
      const targetDate = format(date, 'yyyy-MM-dd');
      const payload = {
        settlement_date: targetDate, bus_id: row.bus_id,
        expected_cash: row.expected_cash, actual_cash: row.actual_cash,
        shortage: row.shortage, overage: row.overage,
        status: row.status, notes: row.notes,
        updated_at: new Date().toISOString()
      };
      if (row.settlement_id) {
        const { error } = await supabase.from('daily_cash_settlements').update(payload).eq('id', row.settlement_id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('daily_cash_settlements').insert([payload]).select('id').single();
        if (error) throw error;
        row.settlement_id = data.id;
      }
      return true;
    } catch (err) { console.error(err); throw err; }
  };

  // Save trip income inline
  const saveTripDetails = async (tripId: string, incomeDetails: any) => {
    try {
      const { error } = await supabase
        .from('daily_trips')
        .update({
          income_details: incomeDetails,
          updated_at: new Date().toISOString()
        })
        .eq('id', tripId);
      if (error) throw error;
      return true;
    } catch (err) { console.error(err); throw err; }
  };

  return { data, summary, loading, error, refetch: fetchData, saveSettlement, saveTripDetails };
}
