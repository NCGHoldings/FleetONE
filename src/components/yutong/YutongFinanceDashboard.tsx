import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CreditCard, 
  DollarSign, 
  FileText, 
  TrendingUp,
  Plus,
  AlertCircle,
  CheckCircle,
  Package
} from 'lucide-react';
import { useYutongFinanceManagement } from '@/hooks/useYutongFinanceManagement';
import { YutongLCManagement } from './YutongLCManagement';
import { YutongPaymentTracking } from './YutongPaymentTracking';
import { YutongDeliveryOrderManagement } from './YutongDeliveryOrderManagement';
import { YutongLandedCostView } from './YutongLandedCostView';
import { format } from 'date-fns';

interface FinancialSummary {
  totalOrderValue: number;
  totalPaid: number;
  totalOutstanding: number;
  totalLCValue: number;
  activeLCs: number;
  pendingPayments: number;
  overduePayments: number;
}

export function YutongFinanceDashboard() {
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>({
    totalOrderValue: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    totalLCValue: 0,
    activeLCs: 0,
    pendingPayments: 0,
    overduePayments: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const { getFinancialDashboard } = useYutongFinanceManagement();

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      const result = await getFinancialDashboard();
      
      if (result.success) {
        const { lcSummary, paymentSummary, ordersSummary } = result.dashboard;
        
        // Calculate summary metrics
        const totalOrderValue = ordersSummary.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0);
        const totalPaid = ordersSummary.reduce((sum: number, order: any) => sum + (order.total_paid || 0), 0);
        const totalOutstanding = ordersSummary.reduce((sum: number, order: any) => sum + (order.balance_due || 0), 0);
        
        const totalLCValue = lcSummary.reduce((sum: number, lc: any) => sum + (lc.lc_amount || 0), 0);
        const activeLCs = lcSummary.filter((lc: any) => ['issued', 'amended'].includes(lc.status)).length;
        
        const pendingPayments = paymentSummary.filter((payment: any) => payment.status === 'pending').length;
        const currentDate = new Date();
        const overduePayments = paymentSummary.filter((payment: any) => 
          payment.status === 'pending' && new Date(payment.payment_date) < currentDate
        ).length;

        setFinancialSummary({
          totalOrderValue,
          totalPaid,
          totalOutstanding,
          totalLCValue,
          activeLCs,
          pendingPayments,
          overduePayments
        });
      }
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinancialData();
  }, []);

  const getPaymentProgress = () => {
    if (financialSummary.totalOrderValue === 0) return 0;
    return (financialSummary.totalPaid / financialSummary.totalOrderValue) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Order Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              LKR {financialSummary.totalOrderValue.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              Across all active orders
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              LKR {financialSummary.totalPaid.toLocaleString()}
            </div>
            <Progress 
              value={getPaymentProgress()} 
              className="mt-2" 
            />
            <div className="text-xs text-muted-foreground mt-1">
              {Math.round(getPaymentProgress())}% of total value
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              LKR {financialSummary.totalOutstanding.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              {financialSummary.pendingPayments} pending payments
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active LCs</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {financialSummary.activeLCs}
            </div>
            <div className="text-xs text-muted-foreground">
              USD {(financialSummary.totalLCValue).toLocaleString()} total value
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert Cards for Overdue Items */}
      {financialSummary.overduePayments > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800">
                  {financialSummary.overduePayments} Overdue Payment{financialSummary.overduePayments !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-red-600">
                  Immediate attention required for overdue customer payments
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Finance Management Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="lc-management">Letter of Credits</TabsTrigger>
          <TabsTrigger value="payments">Payment Tracking</TabsTrigger>
          <TabsTrigger value="delivery-orders">Delivery Orders</TabsTrigger>
          <TabsTrigger value="landed-cost">Landed Cost</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Payment Collection Status</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Order Value:</span>
                      <span className="font-medium">LKR {financialSummary.totalOrderValue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Collected:</span>
                      <span className="font-medium">LKR {financialSummary.totalPaid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-orange-600">
                      <span>Outstanding:</span>
                      <span className="font-medium">LKR {financialSummary.totalOutstanding.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Import Finance Status</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Active LCs:</span>
                      <span className="font-medium">{financialSummary.activeLCs}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total LC Value:</span>
                      <span className="font-medium">USD {financialSummary.totalLCValue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-orange-600">
                      <span>Pending Payments:</span>
                      <span className="font-medium">{financialSummary.pendingPayments}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lc-management">
          <YutongLCManagement onRefresh={loadFinancialData} />
        </TabsContent>

        <TabsContent value="payments">
          <YutongPaymentTracking onRefresh={loadFinancialData} />
        </TabsContent>

        <TabsContent value="delivery-orders">
          <YutongDeliveryOrderManagement onRefresh={loadFinancialData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}