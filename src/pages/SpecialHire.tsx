import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminApprovalInterface } from '../components/special-hire/AdminApprovalInterface';
import { Clock, FileText, TrendingUp, CheckCircle, Plus, Calculator, Truck, MapPin, AlertTriangle, Shield } from 'lucide-react';
import { CostCalculator } from "@/components/special-hire/CostCalculator";
import { EnhancedCostCalculator } from "@/components/special-hire/EnhancedCostCalculator";
import { ConfirmedTripsTable } from "@/components/special-hire/ConfirmedTripsTable";
import { RateCardsAdmin } from "@/components/special-hire/RateCardsAdmin";
import { BusTypesAdmin } from "@/components/special-hire/BusTypesAdmin";
import { FuelSettingsAdmin } from "@/components/special-hire/FuelSettingsAdmin";
import { QuotationsList } from "@/components/special-hire/QuotationsList";
import { SpecialHireForm } from "@/components/special-hire/SpecialHireForm";
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
}

export default function SpecialHire() {
  const [activeTab, setActiveTab] = useState('quotations');
  const [showForm, setShowForm] = useState(false);
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

  const { toast } = useToast();
  const { user, hasRole } = useAuth();
  
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

  const loadStats = async () => {
    try {
      // Get quotation stats
      const { data: quotations, error } = await supabase
        .from('special_hire_quotations')
        .select('status, gross_revenue, approval_status');

      if (error) throw error;

      // Get payment stats  
      const { data: payments, error: paymentsError } = await supabase
        .from('special_hire_payments')
        .select('status, amount');

      if (paymentsError) throw paymentsError;

      const totalQuotations = quotations?.length || 0;
      const pendingQuotations = quotations?.filter(q => q.status === 'pending').length || 0;
      const confirmedTrips = quotations?.filter(q => q.status === 'confirmed').length || 0;
      const pendingApprovals = quotations?.filter(q => q.approval_status === 'pending').length || 0;
      
      // Calculate finance-specific stats
      const pendingFinanceApprovals = payments?.filter(p => p.status === 'pending_finance').length || 0;
      
      // Calculate total revenue from approved payments
      const totalRevenue = payments?.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.amount, 0) || 0;

      setStats({
        totalQuotations,
        pendingQuotations,
        confirmedTrips,
        totalRevenue,
        pendingApprovals,
        pendingFinanceApprovals
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
  }, [hasPageAccess]);

  // Redirect from approvals tab if not admin
  useEffect(() => {
    if (activeTab === 'approvals' && !isAdmin) {
      setActiveTab('quotations');
    }
  }, [activeTab, isAdmin]);

  const handleFormSubmit = () => {
    setShowForm(false);
    loadStats(); // Refresh stats after new quotation
    toast({
      title: 'Success',
      description: 'Quotation created successfully',
    });
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
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Quotation
        </Button>
      </div>

      {/* Enhanced Dashboard Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Quotations</p>
                <p className="text-2xl font-bold">{stats.totalQuotations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pendingQuotations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Truck className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Confirmed Trips</p>
                <p className="text-2xl font-bold">{stats.confirmedTrips}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Finance-specific stats - only show to finance users */}
        {isFinanceUser && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Finance Pending</p>
                  <p className="text-2xl font-bold">{stats.pendingFinanceApprovals}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revenue</p>
                <p className="text-xl font-bold">LKR {stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Need Approval</p>
                  <p className="text-2xl font-bold">{stats.pendingApprovals}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Enhanced Tabs with Role-based Access */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-8">
          <TabsTrigger value="quotations" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Quotations</span>
          </TabsTrigger>
          
          <TabsTrigger value="confirmed-trips" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            <span className="hidden sm:inline">Trips</span>
          </TabsTrigger>
          
          <TabsTrigger value="calculator" className="flex items-center gap-2">
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
                <Truck className="h-4 w-4" />
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
          <QuotationsList onRefresh={loadStats} />
        </TabsContent>

        <TabsContent value="confirmed-trips" className="space-y-6">
          <ConfirmedTripsTable />
        </TabsContent>

        <TabsContent value="calculator" className="space-y-6">
          <EnhancedCostCalculator />
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
          onClose={() => setShowForm(false)}
          onSubmit={handleFormSubmit}
        />
      )}
    </div>
  );
}