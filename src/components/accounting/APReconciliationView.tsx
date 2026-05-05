import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { format } from "date-fns";
import { toast } from "sonner";
import { Plus, CheckCircle, AlertTriangle, FileText, RefreshCw } from "lucide-react";

export const APReconciliationView = () => {
  const [selectedVendorId, setSelectedVendorId] = useState<string | undefined>();
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const queryClient = useQueryClient();

  // Fetch vendors
  const { data: vendors } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .eq("is_active", true)
        .order("vendor_name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch reconciliations
  const { data: reconciliations, isLoading } = useQuery({
    queryKey: ["ap-reconciliations", selectedVendorId],
    queryFn: async () => {
      let query = supabase
        .from("ap_reconciliations")
        .select(`
          *,
          vendors(vendor_name, vendor_code)
        `)
        .order("reconciliation_date", { ascending: false });
      
      if (selectedVendorId) {
        query = query.eq("vendor_id", selectedVendorId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch AP invoices for selected vendor
  const { data: apInvoices } = useQuery({
    queryKey: ["ap-invoices-reconciliation", selectedVendorId, periodStart, periodEnd],
    queryFn: async () => {
      if (!selectedVendorId) return [];
      
      let query = supabase
        .from("ap_invoices")
        .select("*")
        .eq("vendor_id", selectedVendorId)
        .order("invoice_date");
      
      if (periodStart) query = query.gte("invoice_date", periodStart);
      if (periodEnd) query = query.lte("invoice_date", periodEnd);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedVendorId,
  });

  // Fetch AP payments for selected vendor
  const { data: apPayments } = useQuery({
    queryKey: ["ap-payments-reconciliation", selectedVendorId, periodStart, periodEnd],
    queryFn: async () => {
      if (!selectedVendorId) return [];
      
      let query = supabase
        .from("ap_payments")
        .select("*")
        .eq("vendor_id", selectedVendorId)
        .order("payment_date");
      
      if (periodStart) query = query.gte("payment_date", periodStart);
      if (periodEnd) query = query.lte("payment_date", periodEnd);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedVendorId,
  });

  // Create reconciliation mutation
  const createReconciliation = useMutation({
    mutationFn: async (data: {
      vendor_id: string;
      reconciliation_date: string;
      period_start: string;
      period_end: string;
      opening_balance: number;
      closing_balance: number;
      vendor_statement_balance: number;
      notes?: string;
    }) => {
      const discrepancy = data.closing_balance - data.vendor_statement_balance;
      
      const { error } = await supabase.from("ap_reconciliations").insert({
        ...data,
        discrepancy_amount: discrepancy,
        status: Math.abs(discrepancy) < 0.01 ? "reconciled" : "discrepancy",
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reconciliation saved successfully");
      queryClient.invalidateQueries({ queryKey: ["ap-reconciliations"] });
    },
    onError: (error) => {
      toast.error(`Failed to save reconciliation: ${error.message}`);
    },
  });

  // Calculate totals
  const totalInvoices = apInvoices?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;
  const totalPayments = apPayments?.reduce((sum, pay) => sum + Number(pay.amount), 0) || 0;
  const outstandingBalance = apInvoices?.reduce((sum, inv) => sum + Number(inv.balance), 0) || 0;
  const totalWHT = apInvoices?.reduce((sum, inv) => sum + Number(inv.wht_amount || 0), 0) || 0;

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
      accessorKey: "vendors.vendor_name",
      header: "Vendor",
      cell: ({ row }: any) => row.original.vendors?.vendor_name || "-",
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
      accessorKey: "vendor_statement_balance",
      header: "Statement Balance",
      cell: ({ row }: any) => <CurrencyDisplay amount={row.original.vendor_statement_balance} />,
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
      accessorKey: "wht_amount",
      header: "WHT",
      cell: ({ row }: any) => <CurrencyDisplay amount={row.original.wht_amount || 0} />,
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

  const paymentColumns = [
    {
      accessorKey: "payment_number",
      header: "Payment #",
    },
    {
      accessorKey: "payment_date",
      header: "Date",
      cell: ({ row }: any) => format(new Date(row.original.payment_date), "dd MMM yyyy"),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }: any) => <CurrencyDisplay amount={row.original.amount} />,
    },
    {
      accessorKey: "payment_method",
      header: "Method",
      cell: ({ row }: any) => <Badge variant="outline">{row.original.payment_method || "Bank Transfer"}</Badge>,
    },
    {
      accessorKey: "cheque_number",
      header: "Cheque #",
      cell: ({ row }: any) => row.original.cheque_number || "-",
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
    if (!selectedVendorId || !periodStart || !periodEnd) {
      toast.error("Please select a vendor and date range");
      return;
    }

    const statementBalance = prompt("Enter vendor statement balance:");
    if (statementBalance === null) return;

    createReconciliation.mutate({
      vendor_id: selectedVendorId,
      reconciliation_date: new Date().toISOString().split("T")[0],
      period_start: periodStart,
      period_end: periodEnd,
      opening_balance: 0,
      closing_balance: outstandingBalance,
      vendor_statement_balance: parseFloat(statementBalance) || 0,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AP Reconciliation</h2>
          <p className="text-muted-foreground">Reconcile vendor accounts with statements</p>
        </div>
        <Button onClick={handleCreateReconciliation} disabled={!selectedVendorId}>
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
              <Label>Vendor</Label>
              <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors?.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.vendor_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["ap-invoices-reconciliation"] })}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {selectedVendorId && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              <CardDescription>Total Paid</CardDescription>
              <CardTitle className="text-2xl text-green-600">
                <CurrencyDisplay amount={totalPayments} />
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>WHT Deducted</CardDescription>
              <CardTitle className="text-2xl text-blue-600">
                <CurrencyDisplay amount={totalWHT} />
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
                {(apInvoices?.length || 0) + (apPayments?.length || 0)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Transactions Tabs */}
      {selectedVendorId && (
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="invoices">
              <TabsList>
                <TabsTrigger value="invoices">
                  <FileText className="w-4 h-4 mr-2" />
                  Invoices ({apInvoices?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="payments">
                  Payments ({apPayments?.length || 0})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="invoices" className="mt-4">
                <DataTable enableColumnFilters
                  columns={invoiceColumns}
                  data={apInvoices || []}
                  searchKey="invoice_number"
                />
              </TabsContent>
              
              <TabsContent value="payments" className="mt-4">
                <DataTable enableColumnFilters
                  columns={paymentColumns}
                  data={apPayments || []}
                  searchKey="payment_number"
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
            <DataTable enableColumnFilters
              columns={reconciliationColumns}
              data={reconciliations || []}
              searchKey="vendors.vendor_name"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
