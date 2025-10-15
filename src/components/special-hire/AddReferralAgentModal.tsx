import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AddReferralAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgentAdded: (agentId: string) => void;
}

export function AddReferralAgentModal({ open, onOpenChange, onAgentAdded }: AddReferralAgentModalProps) {
  const [loading, setLoading] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [phone, setPhone] = useState("");
  const [commission, setCommission] = useState("3.0");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agentName.trim()) {
      toast.error("Agent name is required");
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('referral_agents')
        .insert({
          agent_name: agentName.trim(),
          phone: phone.trim() || null,
          default_commission_pct: parseFloat(commission) || 3.0,
          notes: notes.trim() || null,
          created_by: userData.user?.id,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Agent added successfully", {
        description: `${agentName} can now be selected for quotations`
      });

      // Call callback with new agent ID
      onAgentAdded(data.id);

      // Reset form and close
      setAgentName("");
      setPhone("");
      setCommission("3.0");
      setNotes("");
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error adding agent:', error);
      toast.error("Failed to add agent", {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Referral Agent</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agentName">
              Agent Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="agentName"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="Enter agent name"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number (optional)</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+94771234567"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="commission">Default Commission %</Label>
            <Input
              id="commission"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              placeholder="3.0"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              This will be the default commission rate for this agent
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this agent..."
              rows={3}
              disabled={loading}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Agent
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
