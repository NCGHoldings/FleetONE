import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, DollarSign, Clock, CheckCircle, Plus, Eye, CreditCard, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AddReferralAgentModal } from '@/components/special-hire/AddReferralAgentModal';
import { SinotrukReferralHistoryModal } from './SinotrukReferralHistoryModal';
import { SinotrukRecordCommissionPaymentModal } from './SinotrukRecordCommissionPaymentModal';

interface ReferralAgent {
  id: string;
  agent_name: string;
  phone: string | null;
  default_commission_pct: number;
  status: string;
  total_referrals: number;
  total_commission_earned: number;
  notes: string | null;
  created_at: string;
}

interface Stats {
  totalAgents: number;
  activeAgents: number;
  totalReferrals: number;
  totalEarned: number;
  pendingAmount: number;
  paidAmount: number;
}

export function SinotrukReferralManagement() {
  const [agents, setAgents] = useState<ReferralAgent[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalAgents: 0,
    activeAgents: 0,
    totalReferrals: 0,
    totalEarned: 0,
    pendingAmount: 0,
    paidAmount: 0
  });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<ReferralAgent | null>(null);

  const loadAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('referral_agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error loading agents:', error);
      toast.error('Failed to load referral agents');
    }
  };

  const loadStats = async () => {
    try {
      // Get commission stats from sinotruck_referral_commission_payments
      const { data: commissions, error: commError } = await supabase
        .from('sinotruck_referral_commission_payments')
        .select('commission_amount, payment_status');

      if (commError) throw commError;

      const pendingAmount = commissions
        ?.filter(c => c.payment_status === 'pending')
        .reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;

      const paidAmount = commissions
        ?.filter(c => c.payment_status === 'paid')
        .reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;

      // Get agent stats
      const { data: agentData, error: agentError } = await supabase
        .from('referral_agents')
        .select('status, total_referrals, total_commission_earned');

      if (agentError) throw agentError;

      setStats({
        totalAgents: agentData?.length || 0,
        activeAgents: agentData?.filter(a => a.status === 'active').length || 0,
        totalReferrals: agentData?.reduce((sum, a) => sum + (a.total_referrals || 0), 0) || 0,
        totalEarned: agentData?.reduce((sum, a) => sum + Number(a.total_commission_earned || 0), 0) || 0,
        pendingAmount,
        paidAmount
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([loadAgents(), loadStats()]);
      setLoading(false);
    };
    load();
  }, []);

  const handleViewHistory = (agent: ReferralAgent) => {
    setSelectedAgent(agent);
    setShowHistoryModal(true);
  };

  const handleRecordPayment = (agent: ReferralAgent) => {
    setSelectedAgent(agent);
    setShowPaymentModal(true);
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this referral agent?')) return;
    
    try {
      const { error } = await supabase
        .from('referral_agents')
        .delete()
        .eq('id', agentId);

      if (error) throw error;
      toast.success('Referral agent deleted');
      loadAgents();
      loadStats();
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast.error('Failed to delete agent');
    }
  };

  const formatCurrency = (amount: number) => {
    return `Rs ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Agents</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.totalAgents}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Active</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.activeAgents}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Total Referrals</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.totalReferrals}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Total Earned</span>
            </div>
            <p className="text-lg font-bold mt-1">{formatCurrency(stats.totalEarned)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Pending</span>
            </div>
            <p className="text-lg font-bold mt-1 text-yellow-600">{formatCurrency(stats.pendingAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Paid Out</span>
            </div>
            <p className="text-lg font-bold mt-1 text-green-600">{formatCurrency(stats.paidAmount)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Agents Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Referral Agents</CardTitle>
          <Button onClick={() => setShowAddModal(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Agent
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : agents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No referral agents yet. Add one to get started.
            </div>
          ) : (
            <Table>
                  <TableHeader>
                <TableRow>
                  <TableHead>Agent Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Default %</TableHead>
                  <TableHead className="text-center">Referrals</TableHead>
                  <TableHead className="text-right">Total Earned</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">{agent.agent_name}</TableCell>
                    <TableCell>{agent.phone || '-'}</TableCell>
                    <TableCell>{agent.default_commission_pct}%</TableCell>
                    <TableCell className="text-center">{agent.total_referrals}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(agent.total_commission_earned))}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                        {agent.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewHistory(agent)}
                          title="View History"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRecordPayment(agent)}
                          title="Record Payment"
                        >
                          <CreditCard className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteAgent(agent.id)}
                          title="Delete"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <AddReferralAgentModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onAgentAdded={() => {
          loadAgents();
          loadStats();
        }}
      />

      {selectedAgent && (
        <>
          <SinotrukReferralHistoryModal
            open={showHistoryModal}
            onOpenChange={setShowHistoryModal}
            agent={selectedAgent}
          />
          <SinotrukRecordCommissionPaymentModal
            open={showPaymentModal}
            onOpenChange={setShowPaymentModal}
            agent={selectedAgent}
            onPaymentRecorded={() => {
              loadAgents();
              loadStats();
            }}
          />
        </>
      )}
    </div>
  );
}
