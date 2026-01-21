import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, DollarSign, Eye, FileText } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useAPInvoices } from "@/hooks/useAccountingData";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APInvoiceForm } from "./APInvoiceForm";

export const AccountsPayableView = () => {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [invoiceFormOpen, setInvoiceFormOpen] = useState(false);
  const { data: invoices, isLoading } = useAPInvoices(statusFilter);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "outline",
      pending: "secondary",
      approved: "default",
      partial: "outline",
      paid: "default",
      overdue: "destructive",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status?.toUpperCase()}</Badge>;
  };

  const getApprovalBadge = (status: string | null) => {
    if (!status) return null;
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      approved: "default",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"} className="text-xs">{status}</Badge>;
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status === "paid" || status === "cancelled") return false;
    return new Date(dueDate) < new Date();
  };

  const columns = [
    {
      accessorKey: "invoice_number",
      header: "Invoice #",
      cell: ({ row }: any) => (
        <span className="font-mono font-medium">{row.original.invoice_number}</span>
      ),
    },
    {
      accessorKey: "vendors.vendor_name",
      header: "Vendor",
      cell: ({ row }: any) => (
        <div>
          <p className="font-medium">{row.original.vendors?.vendor_name || "N/A"}</p>
          <p className="text-xs text-muted-foreground">{row.original.vendors?.vendor_code}</p>
        </div>
      ),
    },
    {
      accessorKey: "invoice_date",
      header: "Invoice Date",
      cell: ({ row }: any) => format(new Date(row.original.invoice_date), "MMM dd, yyyy"),
    },
    {
      accessorKey: "due_date",
      header: "Due Date",
      cell: ({ row }: any) => {
        const overdue = isOverdue(row.original.due_date, row.original.status);
        return (
          <span className={overdue ? "text-destructive font-semibold" : ""}>
            {format(new Date(row.original.due_date), "MMM dd, yyyy")}
            {overdue && <span className="ml-1 text-xs">(Overdue)</span>}
          </span>
        );
      },
    },
    {
      accessorKey: "total_amount",
      header: "Amount",
      cell: ({ row }: any) => <CurrencyDisplay amount={row.original.total_amount || 0} />,
    },
    {
      accessorKey: "wht_amount",
      header: "WHT",
      cell: ({ row }: any) => (
        <span className="text-orange-600">
          <CurrencyDisplay amount={row.original.wht_amount || 0} />
        </span>
      ),
    },
    {
      accessorKey: "balance",
      header: "Balance",
      cell: ({ row }: any) => (
        <span className={row.original.balance > 0 ? "text-destructive font-semibold" : "text-green-600"}>
          <CurrencyDisplay amount={row.original.balance || 0} />
        </span>
      ),
    },
    {
      accessorKey: "approval_status",
      header: "Approval",
      cell: ({ row }: any) => getApprovalBadge(row.original.approval_status),
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
          <Button size="sm" variant="ghost" title="View Details">
            <Eye className="h-4 w-4" />
          </Button>
          {row.original.balance > 0 && row.original.approval_status === "approved" && (
            <Button size="sm" variant="outline">
              <DollarSign className="h-4 w-4 mr-1" />
              Pay
            </Button>
          )}
        </div>
      ),
    },
  ];

  const totalOutstanding = invoices?.reduce((sum, inv) => sum + (inv.balance || 0), 0) || 0;
  const totalWHT = invoices?.reduce((sum, inv) => sum + (inv.wht_amount || 0), 0) || 0;
  const overdueCount = invoices?.filter(inv => isOverdue(inv.due_date, inv.status || "")).length || 0;
  const overdueAmount = invoices
    ?.filter(inv => isOverdue(inv.due_date, inv.status || ""))
    .reduce((sum, inv) => sum + (inv.balance || 0), 0) || 0;
  const pendingApproval = invoices?.filter(inv => inv.approval_status === "pending").length || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Invoices</p>
          <h3 className="text-2xl font-bold mt-1">{invoices?.length || 0}</h3>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Outstanding</p>
          <h3 className="text-2xl font-bold text-destructive mt-1">
            <CurrencyDisplay amount={totalOutstanding} />
          </h3>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total WHT</p>
          <h3 className="text-2xl font-bold text-orange-600 mt-1">
            <CurrencyDisplay amount={totalWHT} />
          </h3>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Overdue Amount</p>
          <h3 className="text-2xl font-bold text-destructive mt-1">
            <CurrencyDisplay amount={overdueAmount} />
          </h3>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Pending Approval</p>
          <h3 className="text-2xl font-bold text-yellow-600 mt-1">{pendingApproval}</h3>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Accounts Payable</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage vendor invoices and payment processing
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              AP Ageing Report
            </Button>
            <Button onClick={() => setInvoiceFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all" onClick={() => setStatusFilter(undefined)}>
              All Invoices
            </TabsTrigger>
            <TabsTrigger value="pending" onClick={() => setStatusFilter("pending")}>
              Pending
            </TabsTrigger>
            <TabsTrigger value="partial" onClick={() => setStatusFilter("partial")}>
              Partial
            </TabsTrigger>
            <TabsTrigger value="paid" onClick={() => setStatusFilter("paid")}>
              Paid
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <DataTable
              columns={columns}
              data={invoices || []}
              searchKey="invoice_number"
            />
          </TabsContent>
          <TabsContent value="pending">
            <DataTable columns={columns} data={invoices || []} searchKey="invoice_number" />
          </TabsContent>
          <TabsContent value="partial">
            <DataTable columns={columns} data={invoices || []} searchKey="invoice_number" />
          </TabsContent>
          <TabsContent value="paid">
            <DataTable columns={columns} data={invoices || []} searchKey="invoice_number" />
          </TabsContent>
        </Tabs>
      </Card>

      {/* AP Invoice Form Dialog */}
      <APInvoiceForm open={invoiceFormOpen} onOpenChange={setInvoiceFormOpen} />
    </div>
  );
};
