import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminApprovalInterface } from '../components/special-hire/AdminApprovalInterface';
import { Clock, FileText, TrendingUp, CheckCircle, Plus, Calculator, Bus, MapPin, AlertTriangle, Shield, TrendingDown, Calendar, ChevronDown, Users, Workflow } from 'lucide-react';
import { SpecialHireFlowDiagram } from "@/components/special-hire/SpecialHireFlowDiagram";
import { CostCalculator } from "@/components/special-hire/CostCalculator";
import { EnhancedCostCalculator } from "@/components/special-hire/EnhancedCostCalculator";
import { ConfirmedTripsTable } from "@/components/special-hire/ConfirmedTripsTable";
import { RateCardsAdmin } from "@/components/special-hire/RateCardsAdmin";
import { BusTypesAdmin } from "@/components/special-hire/BusTypesAdmin";
import { FuelSettingsAdmin } from "@/components/special-hire/FuelSettingsAdmin";
import { QuotationsList } from "@/components/special-hire/QuotationsList";
import { SpecialHireForm } from "@/components/special-hire/SpecialHireForm";
import { SubmissionsList } from "@/components/special-hire/SubmissionsList";
import { SpecialHireQRGenerator } from "@/components/special-hire/SpecialHireQRGenerator";
import { RateCoverageMaps } from "@/components/special-hire/RateCoverageMaps";
import { ReferralAgentsManagement } from "@/components/special-hire/ReferralAgentsManagement";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface DashboardStats {
  totalQuotations: number;
  pendingQuotations: number;
  confirmedTrips: number;
  totalRevenue: number;
  pendingApprovals: number;
  pendingFinanceApprovals: number;
  // Comparison data
  totalQuotationsChange?: number;
  pendingQuotationsChange?: number;
  confirmedTripsChange?: number;
  totalRevenueChange?: number;
  pendingApprovalsChange?: number;
  pendingFinanceApprovalsChange?: number;
}

interface ComparisonPeriod {
  label: string;
  value: string;
  days: number;
}

export default function SpecialHire() {
  const [activeTab, setActiveTab] = useState('quotations');
  const [showForm, setShowForm] = useState(false);
  const [submissionData, setSubmissionData] = useState(null);
  const [selectedCalculatorQuotationId, setSelectedCalculatorQuotationId] = useState<string | undefined>(undefined);
  const [refreshQuotationsTrigger, setRefreshQuotationsTrigger] = useState(0);
  const [stats, setStats] = useState<DashboardStats>({
    totalQuotations: 0,
    pendingQuotations: 0,
    confirmedTrips: 0,
    totalRevenue: 0,
    pendingApprovals: 0,
    pendingFinanceApprovals: 0
  });
  const [hasPageAccess, setHasPageAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [comparisonPeriod, setComparisonPeriod] = useState('weekly');

  const { toast } = useToast();
  const { user, hasRole } = useAuth();

  const comparisonPeriods: ComparisonPeriod[] = [
    { label: 'Daily', value: 'daily', days: 1 },
    { label: 'Weekly', value: 'weekly', days: 7 },
    { label: '2 Weeks', value: '2weeks', days: 14 },
    { label: 'Monthly', value: 'monthly', days: 30 },
    { label: 'Quarterly', value: 'quarterly', days: 90 },
    { label: 'Annually', value: 'annually', days: 365 },
  ];
  
  // Check user roles and permissions
  const isAdmin = hasRole('admin') || hasRole('super_admin');
  const isFinanceUser = hasRole('finance') || hasRole('admin') || hasRole('super_admin');
  const isOperationsUser = hasRole('admin') || hasRole('super_admin') || hasRole('supervisor');

  // Check page access permissions
  useEffect(() => {
    const checkPageAccess = async () => {
      if (!user) {
        setCheckingAccess(false);
        return;
      }

      try {
        // Check if user has specific page access
        const { data: pageAccess, error } = await supabase
          .from('user_page_permissions')
          .select('has_access')
          .eq('user_id', user.id)
          .eq('page_identifier', 'special-hire')
          .maybeSingle();

        if (error) {
          console.error('Error checking page access:', error);
        }

        // Grant access if:
        // 1. User has explicit page permission, OR
        // 2. User has admin/super_admin role, OR  
        // 3. User has supervisor/finance role (operations access)
        const hasAccess = pageAccess?.has_access || 
                         hasRole('admin') || 
                         hasRole('super_admin') || 
                         hasRole('supervisor') || 
                         hasRole('finance');

        setHasPageAccess(hasAccess);
      } catch (error) {
        console.error('Error checking access:', error);
        setHasPageAccess(false);
      } finally {
        setCheckingAccess(false);
      }
    };

    checkPageAccess();
  }, [user, hasRole]);

  const renderChangeIndicator = (change?: number) => {
    if (change === undefined) return null;
    
    const isPositive = change >= 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const colorClass = isPositive ? 'text-green-500' : 'text-red-500';
    
    return (
      <div className={`flex items-center space-x-1 ${colorClass}`}>
        <Icon className="h-3 w-3" />
        <span className="text-xs font-medium">{Math.abs(change).toFixed(1)}%</span>
      </div>
    );
  };

  const loadStats = async () => {
    try {
      const selectedPeriod = comparisonPeriods.find(p => p.value === comparisonPeriod);
      const daysBack = selectedPeriod?.days || 7;
      
      const currentDate = new Date();
      const comparisonDate = new Date();
      comparisonDate.setDate(currentDate.getDate() - daysBack);

      // Get current period quotation stats
      const { data: quotations, error } = await supabase
        .from('special_hire_quotations')
        .select('status, gross_revenue, approval_status, created_at');

      if (error) throw error;

      // Get comparison period quotation stats
      const { data: comparisonQuotations, error: compError } = await supabase
        .from('special_hire_quotations')
        .select('status, gross_revenue, approval_status, created_at')
        .lte('created_at', comparisonDate.toISOString());

      if (compError) throw compError;

      // Get current payment stats  
      const { data: payments, error: paymentsError } = await supabase
        .from('special_hire_payments')
        .select('status, amount, created_at');

      if (paymentsError) throw paymentsError;

      // Get comparison payment stats
      const { data: comparisonPayments, error: compPaymentsError } = await supabase
        .from('special_hire_payments')
        .select('status, amount, created_at')
        .lte('created_at', comparisonDate.toISOString());

      if (compPaymentsError) throw compPaymentsError;

      // Current stats
      const totalQuotations = quotations?.length || 0;
      const pendingQuotations = quotations?.filter(q => q.status === 'pending').length || 0;
      const confirmedTrips = quotations?.filter(q => q.status === 'confirmed').length || 0;
      const pendingApprovals = quotations?.filter(q => q.approval_status === 'pending').length || 0;
      const pendingFinanceApprovals = payments?.filter(p => p.status === 'pending_finance').length || 0;
      const totalRevenue = payments?.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.amount, 0) || 0;

      // Comparison stats
      const compTotalQuotations = comparisonQuotations?.length || 0;
      const compPendingQuotations = comparisonQuotations?.filter(q => q.status === 'pending').length || 0;
      const compConfirmedTrips = comparisonQuotations?.filter(q => q.status === 'confirmed').length || 0;
      const compPendingApprovals = comparisonQuotations?.filter(q => q.approval_status === 'pending').length || 0;
      const compPendingFinanceApprovals = comparisonPayments?.filter(p => p.status === 'pending_finance').length || 0;
      const compTotalRevenue = comparisonPayments?.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.amount, 0) || 0;

      // Calculate percentage changes
      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      setStats({
        totalQuotations,
        pendingQuotations,
        confirmedTrips,
        totalRevenue,
        pendingApprovals,
        pendingFinanceApprovals,
        totalQuotationsChange: calculateChange(totalQuotations, compTotalQuotations),
        pendingQuotationsChange: calculateChange(pendingQuotations, compPendingQuotations),
        confirmedTripsChange: calculateChange(confirmedTrips, compConfirmedTrips),
        totalRevenueChange: calculateChange(totalRevenue, compTotalRevenue),
        pendingApprovalsChange: calculateChange(pendingApprovals, compPendingApprovals),
        pendingFinanceApprovalsChange: calculateChange(pendingFinanceApprovals, compPendingFinanceApprovals),
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard statistics',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (hasPageAccess) {
      loadStats();
    }
  }, [hasPageAccess, comparisonPeriod]);

  // Redirect from approvals tab if not admin
  useEffect(() => {
    if (activeTab === 'approvals' && !isAdmin) {
      setActiveTab('quotations');
    }
  }, [activeTab, isAdmin]);

  const handleFormSubmit = () => {
    setShowForm(false);
    setSubmissionData(null);
    loadStats(); // Refresh stats after new quotation
    setRefreshQuotationsTrigger(prev => prev + 1); // Trigger quotations list refresh
    toast({
      title: 'Success',
      description: 'Quotation created successfully',
    });
  };

  const handleSelectSubmission = (submission: any) => {
    setSubmissionData(submission);
    setActiveTab("quotations");
    setShowForm(true);
  };

  const handleViewInCalculator = (quotationId: string) => {
    setSelectedCalculatorQuotationId(quotationId);
    setActiveTab('calculator');
  };

  // Show loading state while checking access
  if (checkingAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Checking access permissions...</p>
        </div>
      </div>
    );
  }

  // Show access denied if user doesn't have permission
  if (!hasPageAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Shield className="h-12 w-12 text-red-500 mx-auto" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Access Restricted</h3>
                <p className="text-muted-foreground">
                  You don't have permission to access the Special Hire module. 
                  Please contact your administrator to request access.
                </p>
              </div>
              <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                <span>Required roles: Admin, Supervisor, or Finance</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      {/* Enhanced Header - Mobile Responsive */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Special Hire Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage quotations, track payments, and oversee special hire operations
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <Select value={comparisonPeriod} onValueChange={setComparisonPeriod}>
              <SelectTrigger className="w-full sm:w-[140px] h-10">
                <SelectValue placeholder="Compare with" />
              </SelectTrigger>
              <SelectContent>
                {comparisonPeriods.map((period) => (
                  <SelectItem key={period.value} value={period.value}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setShowForm(true)} className="flex items-center justify-center gap-2 h-10 sm:h-9">
            <Plus className="h-4 w-4" />
            <span className="sm:inline">New Quotation</span>
          </Button>
        </div>
      </div>

      {/* Enhanced Dashboard Stats - Mobile Scrollable */}
      <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 pb-2">
        <div className="flex sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 min-w-max sm:min-w-0">
          <Card className="min-w-[140px] sm:min-w-0">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Quotations</p>
                    <p className="text-xl sm:text-2xl font-bold">{stats.totalQuotations}</p>
                  </div>
                </div>
                {renderChangeIndicator(stats.totalQuotationsChange)}
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-[140px] sm:min-w-0">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Pending</p>
                    <p className="text-xl sm:text-2xl font-bold">{stats.pendingQuotations}</p>
                  </div>
                </div>
                {renderChangeIndicator(stats.pendingQuotationsChange)}
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-[140px] sm:min-w-0">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bus className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Confirmed Trips</p>
                    <p className="text-xl sm:text-2xl font-bold">{stats.confirmedTrips}</p>
                  </div>
                </div>
                {renderChangeIndicator(stats.confirmedTripsChange)}
              </div>
            </CardContent>
          </Card>

          {/* Finance-specific stats - only show to finance users */}
          {isFinanceUser && (
            <Card className="min-w-[140px] sm:min-w-0">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">Finance Pending</p>
                      <p className="text-xl sm:text-2xl font-bold">{stats.pendingFinanceApprovals}</p>
                    </div>
                  </div>
                  {renderChangeIndicator(stats.pendingFinanceApprovalsChange)}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="min-w-[140px] sm:min-w-0">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Revenue</p>
                    <p className="text-lg sm:text-xl font-bold">LKR {stats.totalRevenue.toLocaleString()}</p>
                  </div>
                </div>
                {renderChangeIndicator(stats.totalRevenueChange)}
              </div>
            </CardContent>
          </Card>

          {isAdmin && (
            <Card className="min-w-[140px] sm:min-w-0">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">Need Approval</p>
                      <p className="text-xl sm:text-2xl font-bold">{stats.pendingApprovals}</p>
                    </div>
                  </div>
                  {renderChangeIndicator(stats.pendingApprovalsChange)}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Enhanced Tabs with Role-based Access - Mobile Scrollable */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex h-auto gap-1 p-1 min-w-max">
            <TabsTrigger value="quotations" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-xs sm:text-sm">
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Quotes</span>
            </TabsTrigger>
            
            <TabsTrigger value="submissions" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-xs sm:text-sm">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Submissions</span>
            </TabsTrigger>
            
            <TabsTrigger value="confirmed-trips" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-xs sm:text-sm">
              <Bus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Trips</span>
            </TabsTrigger>
            
            <TabsTrigger value="calculator" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-xs sm:text-sm">
              <Calculator className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Calc</span>
            </TabsTrigger>

            <TabsTrigger value="referral-agents" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Referrals</span>
            </TabsTrigger>

            {isAdmin && (
              <TabsTrigger value="approvals" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-xs sm:text-sm">
                <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Approvals</span>
              </TabsTrigger>
            )}

            {isOperationsUser && (
              <>
                <TabsTrigger value="bus-types" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-xs sm:text-sm">
                  <Bus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Buses</span>
                </TabsTrigger>
                
                <TabsTrigger value="rate-cards" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-xs sm:text-sm">
                  <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Rates</span>
                </TabsTrigger>
                
                <TabsTrigger value="fuel-settings" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-xs sm:text-sm">
                  <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Fuel</span>
                </TabsTrigger>
                
                <TabsTrigger value="reports" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-xs sm:text-sm">
                  <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Reports</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>
        </div>

        <TabsContent value="quotations" className="space-y-4 sm:space-y-6">
          <div className="flex justify-end mb-2 sm:mb-4">
            <Button onClick={() => setShowForm(true)} size="sm" className="sm:hidden">
              <Plus className="w-4 h-4 mr-1" />
              New
            </Button>
            <Button onClick={() => setShowForm(true)} className="hidden sm:flex">
              <Plus className="w-4 h-4 mr-2" />
              New Quotation
            </Button>
          </div>
            <QuotationsList 
              onRefresh={loadStats}
              refreshTrigger={refreshQuotationsTrigger}
              onViewInCalculator={handleViewInCalculator}
            />
        </TabsContent>

        <TabsContent value="submissions" className="space-y-6">
          <SpecialHireQRGenerator />
          <SubmissionsList onSelectSubmission={handleSelectSubmission} />
        </TabsContent>

        <TabsContent value="confirmed-trips" className="space-y-6">
          <ConfirmedTripsTable />
        </TabsContent>

        <TabsContent value="calculator" className="space-y-6">
          <EnhancedCostCalculator preselectedQuotationId={selectedCalculatorQuotationId} />
        </TabsContent>

        {/* Referral Agents content */}
        <TabsContent value="referral-agents" className="space-y-6">
          <ReferralAgentsManagement />
        </TabsContent>

        {/* Admin-only content */}
        {isAdmin && (
          <TabsContent value="approvals" className="space-y-6">
            <AdminApprovalInterface onRefresh={loadStats} />
          </TabsContent>
        )}

        {/* Operations content - restricted to operations users */}
        {isOperationsUser && (
          <>
            <TabsContent value="bus-types" className="space-y-6">
              <BusTypesAdmin />
            </TabsContent>

            <TabsContent value="rate-cards" className="space-y-6">
              <RateCoverageMaps />
              <RateCardsAdmin />
            </TabsContent>

            <TabsContent value="fuel-settings" className="space-y-6">
              <FuelSettingsAdmin />
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Reports & Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Comprehensive reporting dashboard coming soon...
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Enhanced Form Modal */}
      {showForm && (
        <SpecialHireForm 
          onCancel={() => {
            setShowForm(false);
            setSubmissionData(null);
          }}
          onSubmit={handleFormSubmit}
          submissionData={submissionData}
        />
      )}
    </div>
  );
}