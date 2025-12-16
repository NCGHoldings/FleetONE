import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, CreditCard, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface FinanceStats {
  totalRevenue: number;
  totalReceived: number;
  totalPending: number;
  overduePayments: number;
}

export function LightVehicleFinanceDashboard() {
  const [stats, setStats] = useState<FinanceStats>({
    totalRevenue: 0,
    totalReceived: 0,
    totalPending: 0,
    overduePayments: 0
  });
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      // Get orders stats
      const { data: orders } = await supabase
        .from('lightvehicle_orders')
        .select('total_amount, total_paid, balance_due');

      if (orders) {
        const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
        const totalReceived = orders.reduce((sum, o) => sum + (o.total_paid || 0), 0);
        const totalPending = orders.reduce((sum, o) => sum + (o.balance_due || 0), 0);

        setStats({
          totalRevenue,
          totalReceived,
          totalPending,
          overduePayments: 0 // Can be calculated based on due dates
        });
      }
    } catch (error) {
      console.error('Error loading finance stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Finance Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <div className="text-muted-foreground">Loading finance data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">LKR {stats.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">LKR {stats.totalReceived.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">LKR {stats.totalPending.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">LKR {stats.overduePayments.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Tracking */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Payment tracking will be available once orders are created.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
