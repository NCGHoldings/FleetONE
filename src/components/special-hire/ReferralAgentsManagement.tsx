import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Users, 
  Plus, 
  Search, 
  History, 
  Wallet, 
  Edit, 
  Phone,
  TrendingUp,
  Clock,
  CheckCircle,
  DollarSign
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AddReferralAgentModal } from './AddReferralAgentModal';
import { ReferralAgentHistoryModal } from './ReferralAgentHistoryModal';
import { RecordCommissionPaymentModal } from './RecordCommissionPaymentModal';
import { EditReferralAgentModal } from './EditReferralAgentModal';

interface ReferralAgent {
  id: string;
  agent_name: string;
  phone: string | null;
  default_commission_pct: number;
  total_referrals: number;
  total_commission_earned: number;
  status: string;
  notes: string | null;
  created_at: string;
  // Calculated fields
  pending_amount?: number;
  paid_amount?: number;
}

interface CommissionStats {
  totalAgents: number;
  activeAgents: number;
  totalReferrals: number;
  totalEarned: number;
  pendingPayments: number;
  paidOut: number;
}

export function ReferralAgentsManagement() {
  const [agents, setAgents] = useState<ReferralAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<CommissionStats>({
    totalAgents: 0,
    activeAgents: 0,
    totalReferrals: 0,
    totalEarned: 0,
    pendingPayments: 0,
    paidOut: 0
  });

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAgentForHistory, setSelectedAgentForHistory] = useState<ReferralAgent | null>(null);
  const [selectedAgentForPayment, setSelectedAgentForPayment] = useState<ReferralAgent | null>(null);
  const [selectedAgentForEdit, setSelectedAgentForEdit] = useState<ReferralAgent | null>(null);

  const { toast } = useToast();

  const fetchAgents = async () => {
    try {
      setLoading(true);
      
      // Fetch agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('referral_agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (agentsError) throw agentsError;

      // Fetch commission payments for each agent
      const { data: payments, error: paymentsError } = await supabase
        .from('referral_commission_payments')
        .select('referral_agent_id, commission_amount, payment_status');

      if (paymentsError) throw paymentsError;

      // Calculate pending and paid amounts for each agent
      const agentsWithAmounts = (agentsData || []).map(agent => {
        const agentPayments = payments?.filter(p => p.referral_agent_id === agent.id) || [];
        const pending = agentPayments
          .filter(p => p.payment_status === 'pending')
          .reduce((sum, p) => sum + Number(p.commission_amount), 0);
        const paid = agentPayments
          .filter(p => p.payment_status === 'paid')
          .reduce((sum, p) => sum + Number(p.commission_amount), 0);
        
        return {
          ...agent,
          pending_amount: pending,
          paid_amount: paid
        };
      });

      setAgents(agentsWithAmounts);

      // Calculate stats
      const totalPending = payments?.filter(p => p.payment_status === 'pending').reduce((sum, p) => sum + Number(p.commission_amount), 0) || 0;
      const totalPaid = payments?.filter(p => p.payment_status === 'paid').reduce((sum, p) => sum + Number(p.commission_amount), 0) || 0;

      setStats({
        totalAgents: agentsData?.length || 0,
        activeAgents: agentsData?.filter(a => a.status === 'active').length || 0,
        totalReferrals: agentsData?.reduce((sum, a) => sum + a.total_referrals, 0) || 0,
        totalEarned: agentsData?.reduce((sum, a) => sum + Number(a.total_commission_earned), 0) || 0,
        pendingPayments: totalPending,
        paidOut: totalPaid
      });

    } catch (error: any) {
      console.error('Error fetching agents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load referral agents',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const filteredAgents = agents.filter(agent => 
    agent.agent_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (agent.phone && agent.phone.includes(searchQuery))
  );

  const formatCurrency = (amount: number) => {
    return `LKR ${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Agents</p>
                <p className="text-2xl font-bold">{stats.totalAgents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Agents</p>
                <p className="text-2xl font-bold">{stats.activeAgents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Referrals</p>
                <p className="text-2xl font-bold">{stats.totalReferrals}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Earned</p>
                <p className="text-lg font-bold">{formatCurrency(stats.totalEarned)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-lg font-bold">{formatCurrency(stats.pendingPayments)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Wallet className="h-5 w-5 text-teal-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Paid Out</p>
                <p className="text-lg font-bold">{formatCurrency(stats.paidOut)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agents Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Referral Agents
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search agents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Agent
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No agents found matching your search' : 'No referral agents yet. Add one to get started.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-center">Commission %</TableHead>
                  <TableHead className="text-center">Referrals</TableHead>
                  <TableHead className="text-right">Total Earned</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">{agent.agent_name}</TableCell>
                    <TableCell>
                      {agent.phone ? (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {agent.phone}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{agent.default_commission_pct}%</Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium">{agent.total_referrals}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(agent.total_commission_earned))}
                    </TableCell>
                    <TableCell className="text-right">
                      {agent.pending_amount && agent.pending_amount > 0 ? (
                        <span className="text-orange-600 font-medium">
                          {formatCurrency(agent.pending_amount)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {agent.paid_amount && agent.paid_amount > 0 ? (
                        <span className="text-green-600 font-medium">
                          {formatCurrency(agent.paid_amount)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                        {agent.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedAgentForHistory(agent)}
                          title="View History"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        {agent.pending_amount && agent.pending_amount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedAgentForPayment(agent)}
                            title="Record Payment"
                            className="text-green-600 hover:text-green-700"
                          >
                            <Wallet className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedAgentForEdit(agent)}
                          title="Edit Agent"
                        >
                          <Edit className="h-4 w-4" />
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
        onAgentAdded={fetchAgents}
      />

      {selectedAgentForHistory && (
        <ReferralAgentHistoryModal
          agent={selectedAgentForHistory}
          open={!!selectedAgentForHistory}
          onOpenChange={(open) => !open && setSelectedAgentForHistory(null)}
        />
      )}

      {selectedAgentForPayment && (
        <RecordCommissionPaymentModal
          agent={selectedAgentForPayment}
          open={!!selectedAgentForPayment}
          onOpenChange={(open) => !open && setSelectedAgentForPayment(null)}
          onPaymentRecorded={fetchAgents}
        />
      )}

      {selectedAgentForEdit && (
        <EditReferralAgentModal
          agent={selectedAgentForEdit}
          open={!!selectedAgentForEdit}
          onOpenChange={(open) => !open && setSelectedAgentForEdit(null)}
          onAgentUpdated={fetchAgents}
        />
      )}
    </div>
  );
}
