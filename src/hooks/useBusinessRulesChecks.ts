import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type RuleStatus = 'success' | 'warning' | 'error' | 'pending';

export interface BusinessRuleResult {
  id: string;
  name: string;
  category: string;
  status: RuleStatus;
  message: string;
  count: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  details?: string;
  action?: {
    label: string;
    path: string;
  };
}

export interface UseBusinessRulesChecksReturn {
  results: BusinessRuleResult[];
  isRunning: boolean;
  lastRunTime: Date | null;
  runAllChecks: () => Promise<void>;
  criticalCount: number;
  highCount: number;
}

export const useBusinessRulesChecks = (): UseBusinessRulesChecksReturn => {
  const [results, setResults] = useState<BusinessRuleResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);

  const runAllChecks = useCallback(async () => {
    setIsRunning(true);
    const newResults: BusinessRuleResult[] = [];

    try {
      // 1. Overdue Special Hire Payments (completed trips with balance)
      const { count: overduePayments } = await supabase
        .from('special_hire_quotations')
        .select('*', { count: 'exact', head: true })
        .eq('trip_status', 'completed')
        .gt('balance_due', 0);
      
      newResults.push({
        id: 'overdue-special-hire',
        name: 'Overdue Special Hire Payments',
        category: 'Finance',
        status: (overduePayments ?? 0) > 0 ? 'error' : 'success',
        message: (overduePayments ?? 0) > 0 ? `${overduePayments} completed trips with unpaid balance` : 'All payments collected',
        count: overduePayments ?? 0,
        severity: 'critical',
        action: { label: 'View Payments', path: '/special-hire' }
      });

      // 2. Pending payment approvals
      const { count: pendingApprovals } = await supabase
        .from('special_hire_payments')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending_operations', 'pending_finance']);
      
      newResults.push({
        id: 'pending-payment-approvals',
        name: 'Pending Payment Approvals',
        category: 'Finance',
        status: (pendingApprovals ?? 0) > 5 ? 'warning' : 'success',
        message: (pendingApprovals ?? 0) > 0 ? `${pendingApprovals} payments awaiting approval` : 'No pending approvals',
        count: pendingApprovals ?? 0,
        severity: 'high',
        action: { label: 'Review Payments', path: '/special-hire' }
      });

      // 3. Overdue school bus fees
      const { count: overdueSchoolFees } = await supabase
        .from('school_students')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('payment_status', 'overdue');
      
      newResults.push({
        id: 'overdue-school-fees',
        name: 'Overdue School Bus Fees',
        category: 'School Bus',
        status: (overdueSchoolFees ?? 0) > 0 ? 'error' : 'success',
        message: (overdueSchoolFees ?? 0) > 0 ? `${overdueSchoolFees} students with overdue fees` : 'All fees current',
        count: overdueSchoolFees ?? 0,
        severity: 'critical',
        action: { label: 'View Students', path: '/school-bus-service' }
      });

      // 4. Unbalanced journal entries
      const { data: unbalancedEntries } = await supabase
        .from('journal_entries')
        .select('id, total_debit, total_credit')
        .eq('status', 'posted');
      
      const unbalancedCount = unbalancedEntries?.filter(
        e => Math.abs((e.total_debit || 0) - (e.total_credit || 0)) > 0.01
      ).length || 0;
      
      newResults.push({
        id: 'unbalanced-journals',
        name: 'Unbalanced Journal Entries',
        category: 'Accounting',
        status: unbalancedCount > 0 ? 'error' : 'success',
        message: unbalancedCount > 0 ? `${unbalancedCount} entries not balanced` : 'All entries balanced',
        count: unbalancedCount,
        severity: 'critical',
        action: { label: 'View Accounting', path: '/accounting' }
      });

      // 5. Unpaid accounts receivable
      const { count: unpaidAR } = await supabase
        .from('accounts_receivable')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'overdue');
      
      newResults.push({
        id: 'overdue-ar',
        name: 'Overdue Accounts Receivable',
        category: 'Accounting',
        status: (unpaidAR ?? 0) > 0 ? 'warning' : 'success',
        message: (unpaidAR ?? 0) > 0 ? `${unpaidAR} overdue invoices` : 'All AR current',
        count: unpaidAR ?? 0,
        severity: 'high',
        action: { label: 'View AR', path: '/accounting' }
      });

      // 6. Overdue accounts payable
      const { count: overdueAP } = await supabase
        .from('accounts_payable')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'overdue');
      
      newResults.push({
        id: 'overdue-ap',
        name: 'Overdue Accounts Payable',
        category: 'Accounting',
        status: (overdueAP ?? 0) > 0 ? 'warning' : 'success',
        message: (overdueAP ?? 0) > 0 ? `${overdueAP} overdue bills` : 'All AP current',
        count: overdueAP ?? 0,
        severity: 'high',
        action: { label: 'View AP', path: '/accounting' }
      });

      // 7. Stale quotations pending too long
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: staleQuotations } = await supabase
        .from('special_hire_quotations')
        .select('*', { count: 'exact', head: true })
        .eq('trip_status', 'pending')
        .lt('created_at', sevenDaysAgo);
      
      newResults.push({
        id: 'stale-quotations',
        name: 'Stale Quotations (7+ days)',
        category: 'Special Hire',
        status: (staleQuotations ?? 0) > 5 ? 'warning' : 'success',
        message: (staleQuotations ?? 0) > 0 ? `${staleQuotations} quotations pending 7+ days` : 'No stale quotations',
        count: staleQuotations ?? 0,
        severity: 'medium',
        action: { label: 'View Quotations', path: '/special-hire' }
      });

      // 8. Yutong orders pending payment
      const { count: pendingYutongPayments } = await supabase
        .from('yutong_orders')
        .select('*', { count: 'exact', head: true })
        .gt('balance_due', 0)
        .in('status', ['confirmed', 'in_progress']);
      
      newResults.push({
        id: 'yutong-pending-payments',
        name: 'Yutong Orders Pending Payment',
        category: 'Yutong',
        status: (pendingYutongPayments ?? 0) > 0 ? 'warning' : 'success',
        message: (pendingYutongPayments ?? 0) > 0 ? `${pendingYutongPayments} orders with balance` : 'All orders paid',
        count: pendingYutongPayments ?? 0,
        severity: 'medium',
        action: { label: 'View Orders', path: '/yutong-quotations' }
      });

      // 9. Active bus loans
      const { count: activeLoans } = await supabase
        .from('bus_loans')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      
      newResults.push({
        id: 'active-bus-loans',
        name: 'Active Bus Loans',
        category: 'Finance',
        status: 'success',
        message: (activeLoans ?? 0) > 0 ? `${activeLoans} active loans` : 'No active loans',
        count: activeLoans ?? 0,
        severity: 'low',
        action: { label: 'View Loans', path: '/fleet-management' }
      });

      // 10. Pending late entry requests
      const { count: pendingLateEntries } = await supabase
        .from('late_entry_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      newResults.push({
        id: 'pending-late-entries',
        name: 'Pending Late Entry Requests',
        category: 'Operations',
        status: (pendingLateEntries ?? 0) > 5 ? 'warning' : 'success',
        message: (pendingLateEntries ?? 0) > 0 ? `${pendingLateEntries} requests pending` : 'No pending requests',
        count: pendingLateEntries ?? 0,
        severity: 'medium',
        action: { label: 'View Requests', path: '/daily-trips' }
      });

      // 11. Pending conductor submissions
      const { count: pendingSubmissions } = await supabase
        .from('conductor_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      newResults.push({
        id: 'pending-conductor-submissions',
        name: 'Pending Conductor Submissions',
        category: 'Operations',
        status: (pendingSubmissions ?? 0) > 10 ? 'warning' : 'success',
        message: (pendingSubmissions ?? 0) > 0 ? `${pendingSubmissions} submissions pending review` : 'All submissions reviewed',
        count: pendingSubmissions ?? 0,
        severity: 'medium',
        action: { label: 'Review Submissions', path: '/daily-trips' }
      });

    } catch (error) {
      console.error('Business rules check error:', error);
    }

    setResults(newResults);
    setLastRunTime(new Date());
    setIsRunning(false);
  }, []);

  const criticalCount = results.filter(r => r.status === 'error' && r.severity === 'critical').length;
  const highCount = results.filter(r => r.status !== 'success' && r.severity === 'high').length;

  return {
    results,
    isRunning,
    lastRunTime,
    runAllChecks,
    criticalCount,
    highCount
  };
};
