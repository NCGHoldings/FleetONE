import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { format } from "date-fns";
import { toast } from "sonner";
import { Plus, CheckCircle, Clock, XCircle, Download, Send, FileSpreadsheet } from "lucide-react";

export const PaymentBatchView = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const queryClient = useQueryClient();

  // Fetch payment batches
  const { data: batches, isLoading } = useQuery({
    queryKey: ["payment-batches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_batches")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch bank accounts
  const { data: bankAccounts } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("is_active", true)
        .order("account_name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch outstanding AP invoices
  const { data: outstandingInvoices } = useQuery({
    queryKey: ["outstanding-ap-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ap_invoices")
        .select(`
          *,
          vendors(vendor_name, vendor_code, bank_name, bank_account)
        `)
        .gt("balance", 0)
        .eq("status", "approved")
        .order("due_date");
      if (error) throw error;
      return data;
    },
  });

  // Create batch mutation
  const createBatch = useMutation({
    mutationFn: async () => {
      if (!selectedBankAccount || selectedInvoices.length === 0) {
        throw new Error("Please select a bank account and at least one invoice");
      }

      const invoicesToPay = outstandingInvoices?.filter(inv => selectedInvoices.includes(inv.id)) || [];
      const totalAmount = invoicesToPay.reduce((sum, inv) => sum + Number(inv.balance), 0);
      const batchNumber = `PB-${format(new Date(), "yyyyMMdd")}-${Date.now().toString().slice(-4)}`;

      // Create batch
      const { data: batch, error: batchError } = await supabase
        .from("payment_batches")
        .insert({
          batch_number: batchNumber,
          batch_date: new Date().toISOString().split("T")[0],
          bank_account_id: selectedBankAccount,
          payment_method: paymentMethod,
          total_payments: invoicesToPay.length,
          total_amount: totalAmount,
          status: "draft",
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // Create batch items
      const batchItems = invoicesToPay.map(inv => ({
        batch_id: batch.id,
        payment_type: "ap_invoice",
        invoice_id: inv.id,
        vendor_id: inv.vendor_id,
        amount: Number(inv.balance),
        wht_amount: Number(inv.wht_amount || 0),
        net_amount: Number(inv.balance) - Number(inv.wht_amount || 0),
        status: "pending",
      }));

      const { error: itemsError } = await supabase
        .from("payment_batch_items")
        .insert(batchItems);

      if (itemsError) throw itemsError;

      return batch;
    },
    onSuccess: () => {
      toast.success("Payment batch created successfully");
      queryClient.invalidateQueries({ queryKey: ["payment-batches"] });
      setIsDialogOpen(false);
      setSelectedInvoices([]);
    },
    onError: (error) => {
      toast.error(`Failed to create batch: ${error.message}`);
    },
  });

  // Approve batch mutation
  const approveBatch = useMutation({
    mutationFn: async (batchId: string) => {
      const { error } = await supabase
        .from("payment_batches")
        .update({
          status: "approved",
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", batchId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Batch approved");
      queryClient.invalidateQueries({ queryKey: ["payment-batches"] });
    },
  });

  // Process batch mutation
  const processBatch = useMutation({
    mutationFn: async (batchId: string) => {
      const { error } = await supabase
        .from("payment_batches")
        .update({
          status: "processed",
          processed_at: new Date().toISOString(),
        })
        .eq("id", batchId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Batch processed");
      queryClient.invalidateQueries({ queryKey: ["payment-batches"] });
    },
  });

  const toggleInvoice = (invoiceId: string) => {
    setSelectedInvoices(prev => 
      prev.includes(invoiceId) 
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  const selectAllInvoices = () => {
    if (selectedInvoices.length === outstandingInvoices?.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(outstandingInvoices?.map(inv => inv.id) || []);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Draft</Badge>;
      case "approved":
        return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case "processed":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Processed</Badge>;
      case "cancelled":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const batchColumns = [
    {
      accessorKey: "batch_number",
      header: "Batch #",
    },
    {
      accessorKey: "batch_date",
      header: "Date",
      cell: ({ row }: any) => format(new Date(row.original.batch_date), "dd MMM yyyy"),
    },
    {
      accessorKey: "total_payments",
      header: "Payments",
    },
    {
      accessorKey: "total_amount",
      header: "Total Amount",
      cell: ({ row }: any) => <CurrencyDisplay amount={row.original.total_amount} />,
    },
    {
      accessorKey: "payment_method",
      header: "Method",
      cell: ({ row }: any) => (
        <Badge variant="outline">{row.original.payment_method?.replace("_", " ")}</Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => getStatusBadge(row.original.status),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <div className="flex gap-2">
          {row.original.status === "draft" && (
            <Button size="sm" variant="outline" onClick={() => approveBatch.mutate(row.original.id)}>
              Approve
            </Button>
          )}
          {row.original.status === "approved" && (
            <>
              <Button size="sm" onClick={() => processBatch.mutate(row.original.id)}>
                <Send className="w-3 h-3 mr-1" /> Process
              </Button>
              <Button size="sm" variant="outline">
                <Download className="w-3 h-3 mr-1" /> Export
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const selectedTotal = outstandingInvoices
    ?.filter(inv => selectedInvoices.includes(inv.id))
    .reduce((sum, inv) => sum + Number(inv.balance), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Payment Batches</h2>
          <p className="text-muted-foreground">Process multiple payments in batches</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Batch
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Payment Batch</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Batch Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bank Account</Label>
                  <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts?.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.account_name} - {account.bank_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="rtgs">RTGS</SelectItem>
                      <SelectItem value="slips">SLIPS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Invoice Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Select Invoices to Pay</Label>
                  <Button variant="ghost" size="sm" onClick={selectAllInvoices}>
                    {selectedInvoices.length === outstandingInvoices?.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                
                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="p-2 text-left w-10"></th>
                        <th className="p-2 text-left">Invoice #</th>
                        <th className="p-2 text-left">Vendor</th>
                        <th className="p-2 text-left">Due Date</th>
                        <th className="p-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outstandingInvoices?.map((invoice) => (
                        <tr key={invoice.id} className="border-t hover:bg-muted/50">
                          <td className="p-2">
                            <Checkbox
                              checked={selectedInvoices.includes(invoice.id)}
                              onCheckedChange={() => toggleInvoice(invoice.id)}
                            />
                          </td>
                          <td className="p-2">{invoice.invoice_number}</td>
                          <td className="p-2">{invoice.vendors?.vendor_name}</td>
                          <td className="p-2">{format(new Date(invoice.due_date), "dd MMM yyyy")}</td>
                          <td className="p-2 text-right">
                            <CurrencyDisplay amount={invoice.balance} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <div>
                    <span className="text-muted-foreground">Selected: </span>
                    <span className="font-semibold">{selectedInvoices.length} invoices</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Amount: </span>
                    <span className="font-semibold text-lg">
                      <CurrencyDisplay amount={selectedTotal} />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => createBatch.mutate()}
                disabled={!selectedBankAccount || selectedInvoices.length === 0 || createBatch.isPending}
              >
                {createBatch.isPending ? "Creating..." : "Create Batch"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Draft Batches</CardDescription>
            <CardTitle className="text-2xl">
              {batches?.filter(b => b.status === "draft").length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Approval</CardDescription>
            <CardTitle className="text-2xl text-orange-600">
              {batches?.filter(b => b.status === "approved").length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Processed Today</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {batches?.filter(b => 
                b.status === "processed" && 
                b.processed_at?.startsWith(new Date().toISOString().split("T")[0])
              ).length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Outstanding to Pay</CardDescription>
            <CardTitle className="text-2xl">
              <CurrencyDisplay 
                amount={outstandingInvoices?.reduce((sum, inv) => sum + Number(inv.balance), 0) || 0} 
              />
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Batches Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Batches</CardTitle>
          <CardDescription>View and manage payment batches</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <DataTable
              columns={batchColumns}
              data={batches || []}
              searchKey="batch_number"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
