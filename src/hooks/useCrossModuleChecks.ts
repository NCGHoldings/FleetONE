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
        .is('vehicle_id', null);
      
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

    } catch (error) {
      console.error('Cross-module check error:', error);
    }

    setResults(newResults);
    setLastRunTime(new Date());
    setIsRunning(false);
  }, []);

  const issueCount = results.filter(r => r.status !== 'success').length;

  return {
    results,
    isRunning,
    lastRunTime,
    runAllChecks,
    issueCount
  };
};
