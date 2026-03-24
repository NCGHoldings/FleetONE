import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type IntegrityStatus = 'success' | 'warning' | 'error' | 'pending';

export interface CrossModuleResult {
  id: string;
  name: string;
  modules: string[];
  status: IntegrityStatus;
  message: string;
  count: number;
  details?: string;
  action?: {
    label: string;
    path: string;
  };
}

export interface UseCrossModuleChecksReturn {
  results: CrossModuleResult[];
  isRunning: boolean;
  lastRunTime: Date | null;
  runAllChecks: () => Promise<void>;
  issueCount: number;
  errorCount: number;
  warningCount: number;
}

export const useCrossModuleChecks = (): UseCrossModuleChecksReturn => {
  const [results, setResults] = useState<CrossModuleResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);

  const runAllChecks = useCallback(async () => {
    setIsRunning(true);
    const newResults: CrossModuleResult[] = [];

    try {
      // 1. Special hire quotations without assigned bus for confirmed trips
      const { count: confirmedNoBus } = await supabase
        .from('special_hire_quotations')
        .select('*', { count: 'exact', head: true })
        .eq('trip_status', 'confirmed')
        .is('assigned_bus_id', null);

      newResults.push({
        id: 'confirmed-no-bus',
        name: 'Confirmed Trips Without Bus',
        modules: ['Special Hire', 'Fleet'],
        status: (confirmedNoBus ?? 0) > 0 ? 'error' : 'success',
        message: (confirmedNoBus ?? 0) > 0 ? `${confirmedNoBus} confirmed trips need bus assignment` : 'All confirmed trips have buses',
        count: confirmedNoBus ?? 0,
        action: { label: 'Assign Buses', path: '/special-hire' }
      });

      // 2. School students without branch
      const { count: studentsNoBranch } = await supabase
        .from('school_students')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .is('branch_id', null);

      newResults.push({
        id: 'students-no-branch',
        name: 'Students Without Branch',
        modules: ['School Bus', 'Routes'],
        status: (studentsNoBranch ?? 0) > 0 ? 'warning' : 'success',
        message: (studentsNoBranch ?? 0) > 0 ? `${studentsNoBranch} students not assigned to branch` : 'All students have branch',
        count: studentsNoBranch ?? 0,
        action: { label: 'View Students', path: '/school-bus-service' }
      });

      // 3. Payments without proper quotation status
      const { data: paymentsCheck } = await supabase
        .from('special_hire_payments')
        .select('id, quotation_id, status, special_hire_quotations(trip_status)')
        .eq('status', 'approved');

      const mismatchedPayments = paymentsCheck?.filter(
        p => p.special_hire_quotations &&
          (p.special_hire_quotations as any)?.trip_status === 'cancelled'
      ).length || 0;

      newResults.push({
        id: 'payments-cancelled-trips',
        name: 'Payments on Cancelled Trips',
        modules: ['Payments', 'Special Hire'],
        status: mismatchedPayments > 0 ? 'error' : 'success',
        message: mismatchedPayments > 0 ? `${mismatchedPayments} approved payments on cancelled trips` : 'All payment statuses consistent',
        count: mismatchedPayments,
        action: { label: 'Review Payments', path: '/special-hire' }
      });

      // 4. Buses with no trips in 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data: activeBuses } = await supabase
        .from('buses')
        .select('id')
        .eq('status', 'active');

      const { data: recentTrips } = await supabase
        .from('daily_trips')
        .select('bus_id')
        .gte('trip_date', sevenDaysAgo);

      const busesWithTrips = new Set(recentTrips?.map(t => t.bus_id));
      const idleBuses = activeBuses?.filter(b => !busesWithTrips.has(b.id)).length || 0;

      newResults.push({
        id: 'idle-buses',
        name: 'Idle Buses (7 days)',
        modules: ['Fleet', 'Daily Trips'],
        status: idleBuses > 5 ? 'warning' : 'success',
        message: idleBuses > 0 ? `${idleBuses} active buses with no recent trips` : 'All buses utilized',
        count: idleBuses,
        action: { label: 'View Fleet', path: '/fleet-management' }
      });

      // 5. Yutong quotations without customer record
      const { count: quotationsNoCustomer } = await supabase
        .from('yutong_quotations')
        .select('*', { count: 'exact', head: true })
        .is('customer_id', null)
        .not('status', 'eq', 'cancelled');

      newResults.push({
        id: 'yutong-no-customer',
        name: 'Yutong Quotations Without Customer',
        modules: ['Yutong', 'Customers'],
        status: (quotationsNoCustomer ?? 0) > 0 ? 'warning' : 'success',
        message: (quotationsNoCustomer ?? 0) > 0 ? `${quotationsNoCustomer} quotations without customer` : 'All quotations have customers',
        count: quotationsNoCustomer ?? 0,
        action: { label: 'View Yutong', path: '/yutong-quotations' }
      });

      // 6. Maintenance records without linked bus
      const { count: orphanMaintenance } = await supabase
        .from('maintenance_records')
        .select('*', { count: 'exact', head: true })
        .is('bus_id', null);

      newResults.push({
        id: 'orphan-maintenance',
        name: 'Maintenance Without Vehicle',
        modules: ['Maintenance', 'Fleet'],
        status: (orphanMaintenance ?? 0) > 0 ? 'error' : 'success',
        message: (orphanMaintenance ?? 0) > 0 ? `${orphanMaintenance} records without vehicle` : 'All maintenance linked',
        count: orphanMaintenance ?? 0,
        action: { label: 'View Maintenance', path: '/maintenance' }
      });

      // 7. Accident records without documents
      const { data: accidents } = await supabase
        .from('accident_records')
        .select('id')
        .not('status', 'eq', 'closed');

      const { data: accidentDocs } = await supabase
        .from('accident_documents')
        .select('accident_id');

      const accidentsWithDocs = new Set(accidentDocs?.map(d => d.accident_id));
      const accidentsNoDocs = accidents?.filter(a => !accidentsWithDocs.has(a.id)).length || 0;

      newResults.push({
        id: 'accidents-no-docs',
        name: 'Open Accidents Without Documents',
        modules: ['Accidents', 'Documents'],
        status: accidentsNoDocs > 0 ? 'warning' : 'success',
        message: accidentsNoDocs > 0 ? `${accidentsNoDocs} open accidents without documents` : 'All accidents documented',
        count: accidentsNoDocs,
        action: { label: 'View Accidents', path: '/fleet-management' }
      });

      // 8. Daily trips without route
      const { count: tripsNoRoute } = await supabase
        .from('daily_trips')
        .select('*', { count: 'exact', head: true })
        .is('route_id', null);

      newResults.push({
        id: 'trips-no-route',
        name: 'Trips Without Route',
        modules: ['Daily Trips', 'Routes'],
        status: (tripsNoRoute ?? 0) > 10 ? 'warning' : 'success',
        message: (tripsNoRoute ?? 0) > 0 ? `${tripsNoRoute} trips without route assigned` : 'All trips have routes',
        count: tripsNoRoute ?? 0,
        action: { label: 'View Trips', path: '/daily-trips' }
      });

      // 9. NSP sales entries
      const today = new Date().toISOString().split('T')[0];
      const { count: todaySales } = await supabase
        .from('nsp_daily_sales')
        .select('*', { count: 'exact', head: true })
        .eq('sale_date', today);

      newResults.push({
        id: 'nsp-today-entries',
        name: 'NSP Sales Today',
        modules: ['NSP', 'Sales'],
        status: 'success',
        message: (todaySales ?? 0) > 0 ? `${todaySales} sales recorded today` : 'No sales recorded today',
        count: todaySales ?? 0,
        action: { label: 'View NSP', path: '/nsp-daily-sales' }
      });

      // 10. Driver allocations without confirmed status
      const { count: pendingAllocations } = await supabase
        .from('driver_allocations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      newResults.push({
        id: 'pending-allocations',
        name: 'Pending Driver Allocations',
        modules: ['Driver Allocation', 'Staff'],
        status: (pendingAllocations ?? 0) > 10 ? 'warning' : 'success',
        message: (pendingAllocations ?? 0) > 0 ? `${pendingAllocations} allocations pending` : 'All allocations confirmed',
        count: pendingAllocations ?? 0,
        action: { label: 'View Allocations', path: '/driver-allocation' }
      });

      // ═══ FINANCE INTEGRITY CHECKS ═══

      // 11. Commission payments without GL posting
      try {
        const { count: unpostedCommissions } = await supabase
          .from('commission_payments')
          .select('*', { count: 'exact', head: true })
          .is('journal_entry_id', null)
          .eq('status', 'approved');

        newResults.push({
          id: 'commission-no-gl',
          name: 'Commission Payments Not Posted to GL',
          modules: ['Commissions', 'Finance'],
          status: (unpostedCommissions ?? 0) > 0 ? 'error' : 'success',
          message: (unpostedCommissions ?? 0) > 0 ? `${unpostedCommissions} approved commissions without GL entry` : 'All commissions posted to GL',
          count: unpostedCommissions ?? 0,
          action: { label: 'View Commissions', path: '/accounting' }
        });
      } catch { /* table may not exist */ }

      // 12. Fuel expenses without GL posting
      try {
        const { count: unpostedFuel } = await supabase
          .from('daily_bus_expenses')
          .select('*', { count: 'exact', head: true })
          .is('journal_entry_id', null)
          .gt('fuel_cost', 0);

        newResults.push({
          id: 'fuel-expense-no-gl',
          name: 'Fuel Expenses Not Posted to GL',
          modules: ['Fuel', 'Finance'],
          status: (unpostedFuel ?? 0) > 10 ? 'warning' : 'success',
          message: (unpostedFuel ?? 0) > 0 ? `${unpostedFuel} fuel expense records without GL posting` : 'All fuel expenses posted',
          count: unpostedFuel ?? 0,
          action: { label: 'View Expenses', path: '/daily-bus-expenses' }
        });
      } catch { /* table may not exist */ }

      // 13. Insurance policies without amortization schedule
      try {
        const { count: insuranceNoAmort } = await supabase
          .from('insurance_policies')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
          .is('amortization_start_date', null);

        newResults.push({
          id: 'insurance-no-amortization',
          name: 'Active Insurance Without Amortization',
          modules: ['Insurance', 'Finance'],
          status: (insuranceNoAmort ?? 0) > 0 ? 'warning' : 'success',
          message: (insuranceNoAmort ?? 0) > 0 ? `${insuranceNoAmort} active policies not amortized` : 'All insurance policies amortized',
          count: insuranceNoAmort ?? 0,
          action: { label: 'View Insurance', path: '/insurance' }
        });
      } catch { /* table may not exist */ }

      // 14. Payroll entries without GL posting
      try {
        const { count: unpostedPayroll } = await supabase
          .from('payroll_entries')
          .select('*', { count: 'exact', head: true })
          .is('journal_entry_id', null)
          .eq('status', 'approved');

        newResults.push({
          id: 'payroll-no-gl',
          name: 'Payroll Entries Not Posted to GL',
          modules: ['Payroll', 'Finance'],
          status: (unpostedPayroll ?? 0) > 0 ? 'error' : 'success',
          message: (unpostedPayroll ?? 0) > 0 ? `${unpostedPayroll} approved payroll without GL entry` : 'All payroll posted to GL',
          count: unpostedPayroll ?? 0,
          action: { label: 'View Payroll', path: '/staff-attendance-payroll' }
        });
      } catch { /* table may not exist */ }

      // 15. Maintenance work orders completed without GL posting
      try {
        const { count: unpostedMaintenance } = await supabase
          .from('maintenance_records')
          .select('*', { count: 'exact', head: true })
          .is('journal_entry_id', null)
          .eq('status', 'completed')
          .gt('total_cost', 0);

        newResults.push({
          id: 'maintenance-no-gl',
          name: 'Completed Maintenance Not Posted to GL',
          modules: ['Maintenance', 'Finance'],
          status: (unpostedMaintenance ?? 0) > 0 ? 'warning' : 'success',
          message: (unpostedMaintenance ?? 0) > 0 ? `${unpostedMaintenance} completed jobs without GL entry` : 'All maintenance costs posted',
          count: unpostedMaintenance ?? 0,
          action: { label: 'View Maintenance', path: '/maintenance' }
        });
      } catch { /* table may not exist */ }

      // 16. Route permits expiring within 30 days
      try {
        const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const { count: expiringPermits } = await supabase
          .from('route_permits')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
          .lte('expiry_date', thirtyDaysFromNow);

        newResults.push({
          id: 'permits-expiring-soon',
          name: 'Route Permits Expiring (30 days)',
          modules: ['Route Permits', 'Operations'],
          status: (expiringPermits ?? 0) > 0 ? 'warning' : 'success',
          message: (expiringPermits ?? 0) > 0 ? `${expiringPermits} permits expiring within 30 days` : 'No permits expiring soon',
          count: expiringPermits ?? 0,
          action: { label: 'View Permits', path: '/route-permits' }
        });
      } catch { /* table may not exist */ }

      // 17. Leasing agreements with overdue payments
      try {
        const { count: overdueLeasing } = await supabase
          .from('leasing_payments')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
          .lt('due_date', new Date().toISOString().split('T')[0]);

        newResults.push({
          id: 'leasing-overdue',
          name: 'Overdue Leasing Payments',
          modules: ['Leasing', 'Finance'],
          status: (overdueLeasing ?? 0) > 0 ? 'error' : 'success',
          message: (overdueLeasing ?? 0) > 0 ? `${overdueLeasing} leasing payments overdue` : 'All leasing payments current',
          count: overdueLeasing ?? 0,
          action: { label: 'View Leasing', path: '/fleet-management' }
        });
      } catch { /* table may not exist */ }

    } catch (error) {
      console.error('Cross-module check error:', error);
    }

    setResults(newResults);
    setLastRunTime(new Date());
    setIsRunning(false);
  }, []);

  const issueCount = results.filter(r => r.status !== 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const warningCount = results.filter(r => r.status === 'warning').length;

  return {
    results,
    isRunning,
    lastRunTime,
    runAllChecks,
    issueCount,
    errorCount,
    warningCount
  };
};
