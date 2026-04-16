import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Search, Phone, Percent, Calculator } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReferralAgent {
  id: string;
  agent_name: string;
  phone: string | null;
  default_commission_pct: number;
  status: string;
}

interface Quotation {
  id: string;
  quotation_no: string;
  customer_name: string;
  gross_revenue: number;
  fuel_cost_fuel_only: number;
  total_additional_charges: number;
  discount_amount_lkr: number;
  commission_pass_through_amount: number;
}

interface LinkReferralAgentModalProps {
  quotation: Quotation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLinked: () => void;
}

export function LinkReferralAgentModal({
  quotation,
  open,
  onOpenChange,
  onLinked,
}: LinkReferralAgentModalProps) {
  const [agents, setAgents] = useState<ReferralAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [commissionPct, setCommissionPct] = useState<number>(3.0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (open) {
      fetchAgents();
    }
  }, [open]);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('referral_agents')
        .select('id, agent_name, phone, default_commission_pct, status')
        .eq('status', 'active')
        .order('agent_name');

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast.error('Failed to load referral agents');
    } finally {
      setLoading(false);
    }
  };

  const filteredAgents = agents.filter(agent =>
    agent.agent_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (agent.phone && agent.phone.includes(searchQuery))
  );

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  // Calculate commission base (matches SpecialHireForm calculation)
  const calculateCommissionBase = () => {
    const grossRevenue = quotation.gross_revenue || 0;
    const fuelCost = quotation.fuel_cost_fuel_only || 0;
    const additionalCharges = quotation.total_additional_charges || 0;
    const discount = quotation.discount_amount_lkr || 0;
    return grossRevenue + fuelCost + additionalCharges - discount;
  };

  const commissionBase = calculateCommissionBase();
  const calculatedCommission = Math.round(commissionBase * (commissionPct / 100));

  const handleAgentSelect = (agentId: string) => {
    setSelectedAgentId(agentId);
    const agent = agents.find(a => a.id === agentId);
    if (agent) {
      setCommissionPct(agent.default_commission_pct);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAgentId) {
      toast.error('Please select a referral agent');
      return;
    }

    try {
      setSaving(true);

      // Update quotation with referral agent
      const { error: quotationError } = await supabase
        .from('special_hire_quotations')
        .update({
          referral_agent_id: selectedAgentId,
          referral_commission_pct: commissionPct,
          referral_commission_amount: calculatedCommission,
        })
        .eq('id', quotation.id);

      if (quotationError) throw quotationError;

      // Create commission payment record
      const { error: commissionError } = await supabase
        .from('referral_commission_payments')
        .insert({
          referral_agent_id: selectedAgentId,
          quotation_id: quotation.id,
          commission_amount: calculatedCommission,
          payment_status: 'pending',
        });

      if (commissionError) throw commissionError;

      // Update agent totals
      const { data: currentAgent, error: agentFetchError } = await supabase
        .from('referral_agents')
        .select('total_referrals, total_commission_earned')
        .eq('id', selectedAgentId)
        .single();

      if (agentFetchError) throw agentFetchError;

      const { error: agentUpdateError } = await supabase
        .from('referral_agents')
        .update({
          total_referrals: (currentAgent?.total_referrals || 0) + 1,
          total_commission_earned: (currentAgent?.total_commission_earned || 0) + calculatedCommission,
        })
        .eq('id', selectedAgentId);

      if (agentUpdateError) throw agentUpdateError;

      toast.success(`Linked to ${selectedAgent?.agent_name} with LKR ${calculatedCommission.toLocaleString()} commission`);
      onLinked();
      onOpenChange(false);
    } catch (error) {
      console.error('Error linking referral agent:', error);
      toast.error('Failed to link referral agent');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Link Referral Agent
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quotation Info */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Quotation:</span>
                <span className="ml-2 font-mono font-medium">{quotation.quotation_no}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Customer:</span>
                <span className="ml-2 font-medium">{quotation.customer_name}</span>
              </div>
            </div>
          </div>

          {/* Search Agents */}
          <div className="space-y-2">
            <Label>Search Agents</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Agent Selection */}
          <div className="space-y-2">
            <Label>Select Referral Agent</Label>
            <Select value={selectedAgentId} onValueChange={handleAgentSelect}>
              <SelectTrigger>
                <SelectValue placeholder={loading ? "Loading agents..." : "Select an agent"} />
              </SelectTrigger>
              <SelectContent>
                {filteredAgents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    <div className="flex items-center gap-2">
                      <span>{agent.agent_name}</span>
                      {agent.phone && (
                        <span className="text-muted-foreground text-xs flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {agent.phone}
                        </span>
                      )}
                      <Badge variant="outline" className="ml-auto">
                        {agent.default_commission_pct}%
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Commission Percentage */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Commission Percentage
            </Label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={commissionPct}
              onChange={(e) => setCommissionPct(parseFloat(e.target.value) || 0)}
            />
          </div>

          {/* Commission Calculation */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calculator className="h-4 w-4 text-primary" />
              Commission Calculation
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Commission Base:</span>
              <span className="text-right font-medium">LKR {commissionBase.toLocaleString()}</span>
              <span className="text-muted-foreground">Commission Rate:</span>
              <span className="text-right font-medium">{commissionPct}%</span>
              <span className="text-muted-foreground font-medium">Commission Amount:</span>
              <span className="text-right font-bold text-primary">LKR {calculatedCommission.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !selectedAgentId}>
            {saving ? 'Linking...' : 'Link Agent'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
