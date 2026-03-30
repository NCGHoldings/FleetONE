// @ts-nocheck
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SinotrukCustomerLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mainCustomerName: string | null;
  onLink: (subCustomerName: string, mainCustomerName: string, notes: string) => Promise<void>;
}

interface CustomerOption {
  customer_name: string;
  company_name: string | null;
}

export function SinotrukCustomerLinkModal({
  open,
  onOpenChange,
  mainCustomerName,
  onLink,
}: SinotrukCustomerLinkModalProps) {
  const [subCustomerName, setSubCustomerName] = useState("");
  const [relationshipNotes, setRelationshipNotes] = useState("");
  const [availableCustomers, setAvailableCustomers] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && mainCustomerName) {
      loadAvailableCustomers();
    }
  }, [open, mainCustomerName]);

  const loadAvailableCustomers = async () => {
    try {
      setLoading(true);

      // Get all unique customer names from quotations
      const { data: quotations, error } = await (supabase as any)
        .from("sinotruck_quotations")
        .select("customer_name, company_name, is_sub_customer, main_customer_name")
        .order("customer_name");

      if (error) throw error;

      // Filter to get only eligible customers:
      // 1. Not already a sub-customer
      // 2. Not the main customer we're linking to
      // 3. Not already used as a main customer by others
      const usedAsMainCustomers = new Set(
        quotations
          ?.filter(q => q.main_customer_name && q.is_sub_customer)
          .map(q => q.main_customer_name) || []
      );

      const eligibleCustomers = quotations
        ?.filter(q => {
          // Exclude the main customer itself
          if (q.customer_name === mainCustomerName) return false;
          
          // Exclude already linked sub-customers
          if (q.is_sub_customer && q.main_customer_name) return false;
          
          // Exclude customers that are being used as main customers by others
          if (usedAsMainCustomers.has(q.customer_name) && q.customer_name !== mainCustomerName) return false;
          
          return true;
        }) || [];

      // Get unique customer names
      const uniqueCustomers = Array.from(
        new Map(
          eligibleCustomers.map(q => [q.customer_name, { customer_name: q.customer_name, company_name: q.company_name }])
        ).values()
      );

      setAvailableCustomers(uniqueCustomers);
    } catch (error: any) {
      console.error("Error loading available customers:", error);
      toast({
        title: "Error",
        description: "Failed to load available customers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!subCustomerName) {
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
        description: "Please enter relationship notes",
        variant: "destructive",
      });
      return;
    }

    if (!mainCustomerName) {
      toast({
        title: "Error",
        description: "Main customer not specified",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await onLink(subCustomerName, mainCustomerName, relationshipNotes);
      setSubCustomerName("");
      setRelationshipNotes("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link Sub-Customer to {mainCustomerName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="sub-customer">Select Sub-Customer</Label>
            <Select value={subCustomerName} onValueChange={setSubCustomerName}>
              <SelectTrigger id="sub-customer">
                <SelectValue placeholder="Choose a customer to link..." />
              </SelectTrigger>
              <SelectContent>
                {availableCustomers.map((customer) => (
                  <SelectItem key={customer.customer_name} value={customer.customer_name}>
                    {customer.customer_name} {customer.company_name && `(${customer.company_name})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              All quotations under this customer name will be linked to {mainCustomerName}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Relationship Notes</Label>
            <Input
              id="notes"
              placeholder="e.g., Daughter, Sister, Business Partner..."
              value={relationshipNotes}
              onChange={(e) => setRelationshipNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !subCustomerName}>
            {loading ? "Linking..." : "Link Customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
