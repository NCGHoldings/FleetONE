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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Edit, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReferralAgent {
  id: string;
  agent_name: string;
  phone: string | null;
  default_commission_pct: number;
  status: string;
  notes: string | null;
}

interface EditReferralAgentModalProps {
  agent: ReferralAgent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgentUpdated: () => void;
}

export function EditReferralAgentModal({
  agent,
  open,
  onOpenChange,
  onAgentUpdated
}: EditReferralAgentModalProps) {
  const [loading, setLoading] = useState(false);
  const [agentName, setAgentName] = useState(agent.agent_name);
  const [phone, setPhone] = useState(agent.phone || '');
  const [commission, setCommission] = useState(agent.default_commission_pct.toString());
  const [status, setStatus] = useState(agent.status);
  const [notes, setNotes] = useState(agent.notes || '');

  const { toast } = useToast();

  // Reset form when agent changes
  useEffect(() => {
    setAgentName(agent.agent_name);
    setPhone(agent.phone || '');
    setCommission(agent.default_commission_pct.toString());
    setStatus(agent.status);
    setNotes(agent.notes || '');
  }, [agent]);

  const handleSubmit = async () => {
    if (!agentName.trim()) {
      toast({
        title: 'Agent name required',
        description: 'Please enter the agent name',
        variant: 'destructive'
      });
      return;
    }

    const commissionNum = parseFloat(commission);
    if (isNaN(commissionNum) || commissionNum < 0 || commissionNum > 100) {
      toast({
        title: 'Invalid commission',
        description: 'Commission must be between 0 and 100%',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('referral_agents')
        .update({
          agent_name: agentName.trim(),
          phone: phone.trim() || null,
          default_commission_pct: commissionNum,
          status: status,
          notes: notes.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', agent.id);

      if (error) throw error;

      toast({
        title: 'Agent updated',
        description: `${agentName} has been updated successfully`
      });

      onAgentUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating agent:', error);
      toast({
        title: 'Error',
        description: 'Failed to update agent',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Referral Agent
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agentName">Agent Name *</Label>
            <Input
              id="agentName"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="Enter agent name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g., 0771234567"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="commission">Default Commission (%)</Label>
            <Input
              id="commission"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              placeholder="e.g., 3"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this agent"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
