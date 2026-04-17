import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { format } from "date-fns";
import { toast } from "sonner";
import { SearchableCustomerSelector } from "./shared/SearchableCustomerSelector";
import { Plus, CheckCircle, AlertTriangle, FileText, RefreshCw } from "lucide-react";

export const ARReconciliationView = () => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const queryClient = useQueryClient();

  // Fetch customers
  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("is_active", true)
        .order("customer_name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch reconciliations
  const { data: reconciliations, isLoading } = useQuery({
    queryKey: ["ar-reconciliations", selectedCustomerId],
    queryFn: async () => {
      let query = supabase
        .from("ar_reconciliations")
        .select(`
          *,
          customers(customer_name, customer_code)
        `)
        .order("reconciliation_date", { ascending: false });
      
      if (selectedCustomerId) {
        query = query.eq("customer_id", selectedCustomerId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch AR invoices for selected customer
  const { data: arInvoices } = useQuery({
    queryKey: ["ar-invoices-reconciliation", selectedCustomerId, periodStart, periodEnd],
    queryFn: async () => {
      if (!selectedCustomerId) return [];
      
      let query = supabase
        .from("ar_invoices")
        .select("*")
        .eq("customer_id", selectedCustomerId)
        .order("invoice_date");
      
      if (periodStart) query = query.gte("invoice_date", periodStart);
      if (periodEnd) query = query.lte("invoice_date", periodEnd);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCustomerId,
  });

  // Fetch AR receipts for selected customer
  const { data: arReceipts } = useQuery({
    queryKey: ["ar-receipts-reconciliation", selectedCustomerId, periodStart, periodEnd],
    queryFn: async () => {
      if (!selectedCustomerId) return [];
      
      let query = supabase
        .from("ar_receipts")
        .select("*")
        .eq("customer_id", selectedCustomerId)
        .order("receipt_date");
      
      if (periodStart) query = query.gte("receipt_date", periodStart);
      if (periodEnd) query = query.lte("receipt_date", periodEnd);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCustomerId,
  });

  // Create reconciliation mutation
  const createReconciliation = useMutation({
    mutationFn: async (data: {
      customer_id: string;
      reconciliation_date: string;
      period_start: string;
      period_end: string;
      opening_balance: number;
      closing_balance: number;
      customer_statement_balance: number;
      notes?: string;
    }) => {
      const discrepancy = data.closing_balance - data.customer_statement_balance;
      
      const { error } = await supabase.from("ar_reconciliations").insert({
        ...data,
        discrepancy_amount: discrepancy,
        status: Math.abs(discrepancy) < 0.01 ? "reconciled" : "discrepancy",
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reconciliation saved successfully");
      queryClient.invalidateQueries({ queryKey: ["ar-reconciliations"] });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to save reconciliation: ${error.message}`);
    },
  });

  // Calculate totals
  const totalInvoices = arInvoices?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;
  const totalReceipts = arReceipts?.reduce((sum, rec) => sum + Number(rec.amount), 0) || 0;
  const outstandingBalance = arInvoices?.reduce((sum, inv) => sum + Number(inv.balance), 0) || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "reconciled":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Reconciled</Badge>;
      case "discrepancy":
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" /> Discrepancy</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const reconciliationColumns = [
    {
      accessorKey: "reconciliation_date",
      header: "Date",
      cell: ({ row }: any) => format(new Date(row.original.reconciliation_date), "dd MMM yyyy"),
    },
    {
      accessorKey: "customers.customer_name",
      header: "Customer",
      cell: ({ row }: any) => row.original.customers?.customer_name || "-",
    },
    {
      accessorKey: "period_start",
      header: "Period",
      cell: ({ row }: any) => 
        `${format(new Date(row.original.period_start), "MMM yyyy")} - ${format(new Date(row.original.period_end), "MMM yyyy")}`,
    },
    {
      accessorKey: "closing_balance",
      header: "Book Balance",
      cell: ({ row }: any) => <CurrencyDisplay amount={row.original.closing_balance} />,
    },
    {
      accessorKey: "customer_statement_balance",
      header: "Statement Balance",
      cell: ({ row }: any) => <CurrencyDisplay amount={row.original.customer_statement_balance} />,
    },
    {
      accessorKey: "discrepancy_amount",
      header: "Discrepancy",
      cell: ({ row }: any) => (
        <span className={row.original.discrepancy_amount !== 0 ? "text-destructive font-medium" : ""}>
          <CurrencyDisplay amount={row.original.discrepancy_amount} />
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => getStatusBadge(row.original.status),
    },
  ];

  const invoiceColumns = [
    {
      accessorKey: "invoice_number",
      header: "Invoice #",
    },
    {
      accessorKey: "invoice_date",
      header: "Date",
      cell: ({ row }: any) => format(new Date(row.original.invoice_date), "dd MMM yyyy"),
    },
    {
      accessorKey: "total_amount",
      header: "Amount",
      cell: ({ row }: any) => <CurrencyDisplay amount={row.original.total_amount} />,
    },
    {
      accessorKey: "paid_amount",
      header: "Paid",
      cell: ({ row }: any) => <CurrencyDisplay amount={row.original.paid_amount || 0} />,
    },
    {
      accessorKey: "balance",
      header: "Balance",
      cell: ({ row }: any) => <CurrencyDisplay amount={row.original.balance} />,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => (
        <Badge variant={row.original.status === "paid" ? "default" : "secondary"}>
          {row.original.status}
        </Badge>
      ),
    },
  ];

  const receiptColumns = [
    {
      accessorKey: "receipt_number",
      header: "Receipt #",
    },
    {
      accessorKey: "receipt_date",
      header: "Date",
      cell: ({ row }: any) => format(new Date(row.original.receipt_date), "dd MMM yyyy"),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }: any) => <CurrencyDisplay amount={row.original.amount} />,
    },
    {
      accessorKey: "payment_method",
      header: "Method",
      cell: ({ row }: any) => <Badge variant="outline">{row.original.payment_method || "Cash"}</Badge>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => (
        <Badge variant={row.original.status === "posted" ? "default" : "secondary"}>
          {row.original.status}
        </Badge>
      ),
    },
  ];

  const handleCreateReconciliation = () => {
    if (!selectedCustomerId || !periodStart || !periodEnd) {
      toast.error("Please select a customer and date range");
      return;
    }

    const statementBalance = prompt("Enter customer statement balance:");
    if (statementBalance === null) return;

    createReconciliation.mutate({
      customer_id: selectedCustomerId,
      reconciliation_date: new Date().toISOString().split("T")[0],
      period_start: periodStart,
      period_end: periodEnd,
      opening_balance: 0,
      closing_balance: outstandingBalance,
      customer_statement_balance: parseFloat(statementBalance) || 0,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AR Reconciliation</h2>
          <p className="text-muted-foreground">Reconcile customer accounts with statements</p>
        </div>
        <Button onClick={handleCreateReconciliation} disabled={!selectedCustomerId}>
          <Plus className="w-4 h-4 mr-2" />
          Save Reconciliation
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Reconciliation Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <SearchableCustomerSelector
                value={selectedCustomerId || ""}
                onValueChange={setSelectedCustomerId}
                showQuickAdd={false}
              />
            </div>
            <div className="space-y-2">
              <Label>Period Start</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Period End</Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["ar-invoices-reconciliation"] })}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {selectedCustomerId && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Invoiced</CardDescription>
              <CardTitle className="text-2xl">
                <CurrencyDisplay amount={totalInvoices} />
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Received</CardDescription>
              <CardTitle className="text-2xl text-green-600">
                <CurrencyDisplay amount={totalReceipts} />
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Outstanding Balance</CardDescription>
              <CardTitle className="text-2xl text-orange-600">
                <CurrencyDisplay amount={outstandingBalance} />
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Transactions</CardDescription>
              <CardTitle className="text-2xl">
                {(arInvoices?.length || 0) + (arReceipts?.length || 0)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Transactions Tabs */}
      {selectedCustomerId && (
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="invoices">
              <TabsList>
                <TabsTrigger value="invoices">
                  <FileText className="w-4 h-4 mr-2" />
                  Invoices ({arInvoices?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="receipts">
                  Receipts ({arReceipts?.length || 0})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="invoices" className="mt-4">
                <DataTable
                  columns={invoiceColumns}
                  data={arInvoices || []}
                  searchKey="invoice_number"
                />
              </TabsContent>
              
              <TabsContent value="receipts" className="mt-4">
                <DataTable
                  columns={receiptColumns}
                  data={arReceipts || []}
                  searchKey="receipt_number"
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Reconciliation History */}
      <Card>
        <CardHeader>
          <CardTitle>Reconciliation History</CardTitle>
          <CardDescription>Past reconciliation records</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <DataTable
              columns={reconciliationColumns}
              data={reconciliations || []}
              searchKey="customers.customer_name"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
