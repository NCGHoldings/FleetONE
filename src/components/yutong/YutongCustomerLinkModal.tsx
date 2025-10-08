import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface YutongCustomerLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mainCustomerId: string | null;
  onLink: (subCustomerId: string, mainCustomerId: string, notes: string) => Promise<void>;
}

export function YutongCustomerLinkModal({
  open,
  onOpenChange,
  mainCustomerId,
  onLink,
}: YutongCustomerLinkModalProps) {
  const [subCustomerId, setSubCustomerId] = useState("");
  const [relationshipNotes, setRelationshipNotes] = useState("");
  const [availableCustomers, setAvailableCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadAvailableCustomers();
    }
  }, [open, mainCustomerId]);

  const loadAvailableCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("yutong_customers")
        .select("id, customer_code, company_name, parent_customer_id")
        .is("parent_customer_id", null)
        .neq("id", mainCustomerId || "")
        .order("company_name");

      if (error) throw error;
      setAvailableCustomers(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
    if (!subCustomerId || !mainCustomerId) {
      toast({
        title: "Validation Error",
        description: "Please select a sub-customer",
        variant: "destructive",
      });
      return;
    }

    if (!relationshipNotes.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide relationship notes",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await onLink(subCustomerId, mainCustomerId, relationshipNotes);
      setSubCustomerId("");
      setRelationshipNotes("");
    } catch (error: any) {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link Sub-Customer</DialogTitle>
          <DialogDescription>
            Link a customer as a sub-customer (family member, business partner, etc.)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="sub-customer">Select Sub-Customer</Label>
            <Select value={subCustomerId} onValueChange={setSubCustomerId}>
              <SelectTrigger id="sub-customer">
                <SelectValue placeholder="Choose a customer..." />
              </SelectTrigger>
              <SelectContent>
                {availableCustomers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.company_name} ({customer.customer_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="relationship">Relationship Notes</Label>
            <Input
              id="relationship"
              placeholder="e.g., Son, Daughter, Business Partner"
              value={relationshipNotes}
              onChange={(e) => setRelationshipNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Linking..." : "Link Customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
