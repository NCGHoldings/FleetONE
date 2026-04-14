import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type CheckStatus = 'success' | 'warning' | 'error' | 'pending';

export interface DataQualityResult {
  id: string;
  name: string;
  category: string;
  status: CheckStatus;
  message: string;
  count: number;
  details?: string;
  action?: {
    label: string;
    path: string;
  };
}

export interface UseDataQualityChecksReturn {
  results: DataQualityResult[];
  isRunning: boolean;
  lastRunTime: Date | null;
  runAllChecks: () => Promise<void>;
  errorCount: number;
  warningCount: number;
}

export const useDataQualityChecks = (): UseDataQualityChecksReturn => {
  const [results, setResults] = useState<DataQualityResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);

  const runAllChecks = useCallback(async () => {
    setIsRunning(true);
    const newResults: DataQualityResult[] = [];

    try {
      // 1. Buses without routes
      const { count: busesNoRoute } = await supabase
        .from('buses')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .is('route', null);
      
      newResults.push({
        id: 'buses-no-route',
        name: 'Buses Without Routes',
        category: 'Fleet',
        status: (busesNoRoute ?? 0) > 0 ? 'warning' : 'success',
        message: (busesNoRoute ?? 0) > 0 ? `${busesNoRoute} buses have no route assigned` : 'All buses have routes',
        count: busesNoRoute ?? 0,
        action: { label: 'View Fleet', path: '/fleet-management' }
      });

      // 2. Expired insurance
      const today = new Date().toISOString().split('T')[0];
      const { count: expiredInsurance } = await supabase
        .from('buses')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .lt('insurance_expiry', today);
      
      newResults.push({
        id: 'expired-insurance',
        name: 'Expired Insurance',
        category: 'Compliance',
        status: (expiredInsurance ?? 0) > 0 ? 'error' : 'success',
        message: (expiredInsurance ?? 0) > 0 ? `${expiredInsurance} buses have expired insurance` : 'All insurance valid',
        count: expiredInsurance ?? 0,
        action: { label: 'View Insurance', path: '/insurance' }
      });

      // 3. Expiring insurance (within 30 days)
      const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { count: expiringInsurance } = await supabase
        .from('buses')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('insurance_expiry', today)
        .lte('insurance_expiry', thirtyDaysLater);
      
      newResults.push({
        id: 'expiring-insurance',
        name: 'Insurance Expiring Soon',
        category: 'Compliance',
        status: (expiringInsurance ?? 0) > 0 ? 'warning' : 'success',
        message: (expiringInsurance ?? 0) > 0 ? `${expiringInsurance} buses expire within 30 days` : 'No upcoming expirations',
        count: expiringInsurance ?? 0,
        action: { label: 'View Insurance', path: '/insurance' }
      });

      // 4. Expired revenue licenses
      const { count: expiredRevenue } = await supabase
        .from('buses')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .lt('revenue_license_expiry', today);
      
      newResults.push({
        id: 'expired-revenue-license',
        name: 'Expired Revenue Licenses',
        category: 'Compliance',
        status: (expiredRevenue ?? 0) > 0 ? 'error' : 'success',
        message: (expiredRevenue ?? 0) > 0 ? `${expiredRevenue} buses have expired revenue licenses` : 'All licenses valid',
        count: expiredRevenue ?? 0,
        action: { label: 'View Fleet', path: '/fleet-management' }
      });

      // 5. Staff without phone numbers
      const { count: staffNoPhone } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .is('phone', null);
      
      newResults.push({
        id: 'staff-no-phone',
        name: 'Staff Without Phone',
        category: 'HR',
        status: (staffNoPhone ?? 0) > 0 ? 'warning' : 'success',
        message: (staffNoPhone ?? 0) > 0 ? `${staffNoPhone} staff members have no phone` : 'All staff have contact info',
        count: staffNoPhone ?? 0,
        action: { label: 'View Staff', path: '/staff-management' }
      });

      // 6. Buses due for service
      const { count: serviceOverdue } = await supabase
        .from('buses')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .lt('next_service_date', today);
      
      newResults.push({
        id: 'service-overdue',
        name: 'Service Overdue',
        category: 'Maintenance',
        status: (serviceOverdue ?? 0) > 0 ? 'error' : 'success',
        message: (serviceOverdue ?? 0) > 0 ? `${serviceOverdue} buses overdue for service` : 'All services up to date',
        count: serviceOverdue ?? 0,
        action: { label: 'View Maintenance', path: '/maintenance' }
      });

      // 7. Inactive students with balance
      const { count: inactiveWithBalance } = await supabase
        .from('school_students')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', false)
        .gt('payment_balance', 0);
      
      newResults.push({
        id: 'inactive-student-balance',
        name: 'Inactive Students With Balance',
        category: 'School Bus',
        status: (inactiveWithBalance ?? 0) > 0 ? 'warning' : 'success',
        message: (inactiveWithBalance ?? 0) > 0 ? `${inactiveWithBalance} inactive students have positive balance` : 'No orphan balances',
        count: inactiveWithBalance ?? 0,
        action: { label: 'View Students', path: '/school-bus-service' }
      });

      // 8. Quotations without customer email
      const { count: noEmail } = await supabase
        .from('special_hire_quotations')
        .select('*', { count: 'exact', head: true })
        .is('customer_email', null)
        .not('trip_status', 'eq', 'cancelled');
      
      newResults.push({
        id: 'quotation-no-email',
        name: 'Quotations Without Email',
        category: 'Special Hire',
        status: (noEmail ?? 0) > 5 ? 'warning' : 'success',
        message: (noEmail ?? 0) > 0 ? `${noEmail} quotations missing customer email` : 'All quotations have email',
        count: noEmail ?? 0,
        action: { label: 'View Quotations', path: '/special-hire' }
      });

      // 9. Buses without category
      const { count: noCategoryBuses } = await supabase
        .from('buses')
        .select('*', { count: 'exact', head: true })
        .is('category_id', null);
      
      newResults.push({
        id: 'buses-no-category',
        name: 'Buses Without Category',
        category: 'Fleet',
        status: (noCategoryBuses ?? 0) > 0 ? 'warning' : 'success',
        message: (noCategoryBuses ?? 0) > 0 ? `${noCategoryBuses} buses uncategorized` : 'All buses categorized',
        count: noCategoryBuses ?? 0,
        action: { label: 'View Fleet', path: '/fleet-management' }
      });

      // 10. Total buses count
      const { count: totalBuses } = await supabase
        .from('buses')
        .select('*', { count: 'exact', head: true });
      
      newResults.push({
        id: 'total-buses',
        name: 'Total Fleet Size',
        category: 'Fleet',
        status: 'success',
        message: `${totalBuses ?? 0} buses in fleet`,
        count: totalBuses ?? 0,
        action: { label: 'View Fleet', path: '/fleet-management' }
      });

    } catch (error) {
      console.error('Data quality check error:', error);
    }

    setResults(newResults);
    setLastRunTime(new Date());
    setIsRunning(false);
  }, []);

  const errorCount = results.filter(r => r.status === 'error').length;
  const warningCount = results.filter(r => r.status === 'warning').length;

  return {
    results,
    isRunning,
    lastRunTime,
    runAllChecks,
    errorCount,
    warningCount
  };
};
