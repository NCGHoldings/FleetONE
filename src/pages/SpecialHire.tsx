import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminApprovalInterface } from '../components/special-hire/AdminApprovalInterface';
import { Clock, FileText, TrendingUp, CheckCircle, Plus, Calculator, Bus, MapPin, AlertTriangle, Shield, TrendingDown, Calendar, ChevronDown } from 'lucide-react';
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
    <div className="space-y-6 p-6">
      {/* Enhanced Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Special Hire Management</h1>
          <p className="text-muted-foreground">
            Manage quotations, track payments, and oversee special hire operations
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={comparisonPeriod} onValueChange={setComparisonPeriod}>
              <SelectTrigger className="w-[140px]">
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
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Quotation
          </Button>
        </div>
      </div>

      {/* Enhanced Dashboard Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Quotations</p>
                  <p className="text-2xl font-bold">{stats.totalQuotations}</p>
                </div>
              </div>
              {renderChangeIndicator(stats.totalQuotationsChange)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{stats.pendingQuotations}</p>
                </div>
              </div>
              {renderChangeIndicator(stats.pendingQuotationsChange)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bus className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Confirmed Trips</p>
                  <p className="text-2xl font-bold">{stats.confirmedTrips}</p>
                </div>
              </div>
              {renderChangeIndicator(stats.confirmedTripsChange)}
            </div>
          </CardContent>
        </Card>

        {/* Finance-specific stats - only show to finance users */}
        {isFinanceUser && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Finance Pending</p>
                    <p className="text-2xl font-bold">{stats.pendingFinanceApprovals}</p>
                  </div>
                </div>
                {renderChangeIndicator(stats.pendingFinanceApprovalsChange)}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Revenue</p>
                  <p className="text-xl font-bold">LKR {stats.totalRevenue.toLocaleString()}</p>
                </div>
              </div>
              {renderChangeIndicator(stats.totalRevenueChange)}
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Need Approval</p>
                    <p className="text-2xl font-bold">{stats.pendingApprovals}</p>
                  </div>
                </div>
                {renderChangeIndicator(stats.pendingApprovalsChange)}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Enhanced Tabs with Role-based Access */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-9">
          <TabsTrigger value="quotations" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Quotations</span>
          </TabsTrigger>
          
          <TabsTrigger value="submissions" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Submissions</span>
          </TabsTrigger>
          
          <TabsTrigger value="confirmed-trips" className="flex items-center gap-2">
            <Bus className="h-4 w-4" />
            <span className="hidden sm:inline">Trips</span>
          </TabsTrigger>
          
          <TabsTrigger value="calculator" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">Calculator</span>
          </TabsTrigger>
          
          <TabsTrigger value="calculator-legacy" className="flex items-center gap-2 hidden">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">Calculator</span>
          </TabsTrigger>

          {/* Admin-only tabs */}
          {isAdmin && (
            <TabsTrigger value="approvals" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Approvals</span>
            </TabsTrigger>
          )}

          {/* Operations tabs - visible to operations users */}
          {isOperationsUser && (
            <>
              <TabsTrigger value="bus-types" className="flex items-center gap-2">
                <Bus className="h-4 w-4" />
                <span className="hidden sm:inline">Bus Types</span>
              </TabsTrigger>
              
              <TabsTrigger value="rate-cards" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Rate Cards</span>
              </TabsTrigger>
              
              <TabsTrigger value="fuel-settings" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Fuel</span>
              </TabsTrigger>
              
              <TabsTrigger value="reports" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Reports</span>
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="quotations" className="space-y-6">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowForm(true)}>
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