import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowRight, CheckCircle, Wallet, Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface AdvanceAllocationFormProps {
  type: "ar" | "ap";
}

interface Allocation {
  invoiceId: string;
  amount: number;
}

export const AdvanceAllocationForm = ({ type }: AdvanceAllocationFormProps) => {
  const queryClient = useQueryClient();
  const [selectedParty, setSelectedParty] = useState<string>("");
  const [partyOpen, setPartyOpen] = useState(false);
  const [allocations, setAllocations] = useState<Allocation[]>([]);

  const isAR = type === "ar";
  const partyLabel = isAR ? "Customer" : "Vendor";

  // Fetch customers or vendors
  const { data: customers } = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, customer_name")
        .eq("is_active", true)
        .order("customer_name");
      if (error) throw error;
      return data;
    },
    enabled: isAR,
  });

  const { data: vendors } = useQuery({
    queryKey: ["vendors-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("id, vendor_name")
        .eq("is_active", true)
        .order("vendor_name");
      if (error) throw error;
      return data;
    },
    enabled: !isAR,
  });

  const parties = isAR ? customers : vendors;

  // Fetch advance receipts for AR
  const { data: arAdvances } = useQuery({
    queryKey: ["ar-advances", selectedParty],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_receipts")
        .select("*")
        .eq("customer_id", selectedParty)
        .eq("is_advance", true)
        .eq("status", "posted");
      if (error) throw error;
      return data;
    },
    enabled: isAR && !!selectedParty,
  });

  // Fetch advance payments for AP
  const { data: apAdvances } = useQuery({
    queryKey: ["ap-advances", selectedParty],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ap_payments")
        .select("*")
        .eq("vendor_id", selectedParty)
        .eq("is_advance", true)
        .eq("status", "posted");
      if (error) throw error;
      return data;
    },
    enabled: !isAR && !!selectedParty,
  });

  const advances = isAR ? arAdvances : apAdvances;

  // Fetch outstanding invoices
  const { data: arInvoices } = useQuery({
    queryKey: ["ar-invoices-outstanding", selectedParty],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_invoices")
        .select("*")
        .eq("customer_id", selectedParty)
        .gt("balance", 0)
        .order("due_date");
      if (error) throw error;
      return data;
    },
    enabled: isAR && !!selectedParty,
  });

  const { data: apInvoices } = useQuery({
    queryKey: ["ap-invoices-outstanding", selectedParty],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ap_invoices")
        .select("*")
        .eq("vendor_id", selectedParty)
        .gt("balance", 0)
        .order("due_date");
      if (error) throw error;
      return data;
    },
    enabled: !isAR && !!selectedParty,
  });

  const invoices = isAR ? arInvoices : apInvoices;

  const totalAdvanceBalance = advances?.reduce((sum, adv) => sum + (adv.amount || 0), 0) || 0;
  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
  const remainingBalance = totalAdvanceBalance - totalAllocated;

  const handleAllocationChange = (invoiceId: string, amount: number) => {
    setAllocations(prev => {
      const existing = prev.find(a => a.invoiceId === invoiceId);
      if (existing) {
        return prev.map(a => a.invoiceId === invoiceId ? { ...a, amount } : a);
      }
      return [...prev, { invoiceId, amount }];
    });
  };

  const allocateMutation = useMutation({
    mutationFn: async () => {
      for (const allocation of allocations) {
        if (allocation.amount <= 0) continue;

        const { error } = await supabase
          .from(isAR ? "ar_receipt_allocations" : "ap_payment_allocations")
          .insert({
            [isAR ? "receipt_id" : "payment_id"]: advances?.[0]?.id,
            invoice_id: allocation.invoiceId,
            allocated_amount: allocation.amount,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Allocations saved successfully");
      queryClient.invalidateQueries({ queryKey: [isAR ? "ar-invoices" : "ap-invoices"] });
      setAllocations([]);
    },
    onError: (error) => {
      toast.error("Failed to save allocations: " + error.message);
    },
  });

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">
              {isAR ? "Advance Receipt" : "Advance Payment"} Allocation
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Allocate advance {isAR ? "receipts" : "payments"} to outstanding invoices
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <div className="space-y-2 flex flex-col">
            <Label>{partyLabel}</Label>
            <Popover open={partyOpen} onOpenChange={setPartyOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={partyOpen}
                  className="justify-between w-full font-normal"
                >
                  {selectedParty
                    ? isAR 
                      ? parties?.find((p) => p.id === selectedParty)?.customer_name 
                      : parties?.find((p) => p.id === selectedParty)?.vendor_name
                    : `Select ${partyLabel}`}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder={`Search ${partyLabel}...`} />
                  <CommandList>
                    <CommandEmpty>No {partyLabel.toLowerCase()} found.</CommandEmpty>
                    <CommandGroup>
                      {parties?.map((party) => {
                        const name = isAR ? (party as any).customer_name : (party as any).vendor_name;
                        return (
                          <CommandItem
                            key={party.id}
                            value={name}
                            onSelect={() => {
                              setSelectedParty(party.id);
                              setPartyOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedParty === party.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {name}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {selectedParty && (
            <Card className="p-4 bg-primary/5">
              <div className="flex items-center gap-3">
                <Wallet className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Available Advance Balance</p>
                  <p className="text-2xl font-bold">
                    <CurrencyDisplay amount={remainingBalance} />
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {selectedParty && advances && advances.length > 0 && (
          <>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">
                Advance {isAR ? "Receipts" : "Payments"}
              </h3>
              <div className="grid gap-3 md:grid-cols-3">
                {advances.map((adv) => (
                  <Card key={adv.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {isAR ? (adv as any).receipt_number : (adv as any).payment_number}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(isAR ? (adv as any).receipt_date : (adv as any).payment_date), "MMM dd, yyyy")}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        <CurrencyDisplay amount={adv.amount} />
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Outstanding Invoices</h3>
              {invoices && invoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Allocate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => {
                      const allocation = allocations.find(a => a.invoiceId === invoice.id);
                      
                      return (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                          <TableCell>
                            {format(new Date(invoice.invoice_date), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell className="text-right">
                            <CurrencyDisplay amount={invoice.balance} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <Input
                                type="number"
                                className="w-32 text-right"
                                placeholder="0.00"
                                min={0}
                                value={allocation?.amount || ""}
                                onChange={(e) => handleAllocationChange(invoice.id, parseFloat(e.target.value) || 0)}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleAllocationChange(invoice.id, invoice.balance)}
                              >
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No outstanding invoices
                </p>
              )}
            </div>

            {totalAllocated > 0 && (
              <div className="mt-6 flex justify-between items-center pt-4 border-t">
                <p className="text-xl font-bold">
                  Total: <CurrencyDisplay amount={totalAllocated} />
                </p>
                <Button 
                  onClick={() => allocateMutation.mutate()}
                  disabled={allocateMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Save Allocations
                </Button>
              </div>
            )}
          </>
        )}

        {selectedParty && (!advances || advances.length === 0) && (
          <p className="text-muted-foreground text-center py-12">
            No advance {isAR ? "receipts" : "payments"} available
          </p>
        )}
      </Card>
    </div>
  );
};
