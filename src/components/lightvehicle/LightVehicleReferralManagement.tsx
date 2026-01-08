import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, DollarSign, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ReferralStats {
  totalAgents: number;
  totalCommissions: number;
  pendingCommissions: number;
}

export function LightVehicleReferralManagement() {
  const [stats, setStats] = useState<ReferralStats>({
    totalAgents: 0,
    totalCommissions: 0,
    pendingCommissions: 0
  });
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      // Load commissions
      const { data: commissionData } = await supabase
        .from('lightvehicle_referral_commission_payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (commissionData) {
        setCommissions(commissionData);
        const totalCommissions = commissionData.reduce((sum, c) => sum + (c.commission_amount || 0), 0);
        const pendingCommissions = commissionData
          .filter(c => c.status === 'pending')
          .reduce((sum, c) => sum + (c.commission_amount || 0), 0);

        // Get unique agents
        const uniqueAgents = new Set(commissionData.map(c => c.agent_id)).size;

        setStats({
          totalAgents: uniqueAgents,
          totalCommissions,
          pendingCommissions
        });
      }
    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Referral Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <div className="text-muted-foreground">Loading referral data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAgents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">LKR {stats.totalCommissions.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Commissions</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">LKR {stats.pendingCommissions.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Commission History */}
      <Card>
        <CardHeader>
          <CardTitle>Commission History</CardTitle>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No commission records found. Commissions are automatically tracked when quotations are confirmed.
            </div>
          ) : (
            <div className="space-y-4">
              {commissions.map((commission) => (
                <Card key={commission.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{commission.agent_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {commission.commission_percentage}% of LKR {commission.quotation_value?.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">LKR {commission.commission_amount?.toLocaleString()}</p>
                      <Badge className={commission.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {commission.status}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
