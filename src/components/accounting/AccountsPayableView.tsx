import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, DollarSign, Eye, FileText, Printer, Search } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useAPInvoices } from "@/hooks/useAccountingData";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APInvoiceForm } from "./APInvoiceForm";
import { APPaymentForm } from "./APPaymentForm";
import { APAgeingReport } from "./APAgeingReport";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { FinanceDocumentPreviewModal } from "./shared/FinanceDocumentPreviewModal";
import { Input } from "@/components/ui/input";

export const AccountsPayableView = () => {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [invoiceFormOpen, setInvoiceFormOpen] = useState(false);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<any>(null);
  const [ageingReportOpen, setAgeingReportOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<any>(null);
  const [printDocumentOpen, setPrintDocumentOpen] = useState(false);
  const [printDocumentData, setPrintDocumentData] = useState<any>(null);
  const [printDocumentType, setPrintDocumentType] = useState<string>("ap_invoice");
  const [searchQuery, setSearchQuery] = useState("");
  const { data: invoices, isLoading } = useAPInvoices(statusFilter);

  // Multi-field search filter
  const filteredInvoices = useMemo(() => {
    if (!invoices || !searchQuery.trim()) return invoices || [];
    const query = searchQuery.toLowerCase();
    return invoices.filter((inv) =>
      inv.invoice_number?.toLowerCase().includes(query) ||
      inv.vendors?.vendor_name?.toLowerCase().includes(query) ||
      inv.vendors?.vendor_code?.toLowerCase().includes(query) ||
      inv.status?.toLowerCase().includes(query) ||
      inv.reference?.toLowerCase().includes(query)
    );
  }, [invoices, searchQuery]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "outline",
      unpaid: "secondary",
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

  const handlePayClick = (invoice: any) => {
    setSelectedInvoiceForPayment(invoice);
    setPaymentFormOpen(true);
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
          <Button 
            size="sm" 
            variant="ghost" 
            title="View Details"
            onClick={() => setViewInvoice(row.original)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {row.original.balance > 0 && row.original.approval_status === "approved" && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handlePayClick(row.original)}
            >
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
            <Button variant="outline" onClick={() => setAgeingReportOpen(true)}>
              <FileText className="h-4 w-4 mr-2" />
              AP Ageing Report
            </Button>
            <Button onClick={() => setInvoiceFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </Button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by invoice #, vendor, status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 max-w-md"
          />
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all" onClick={() => setStatusFilter(undefined)}>
              All Invoices
            </TabsTrigger>
            <TabsTrigger value="unpaid" onClick={() => setStatusFilter("unpaid")}>
              Unpaid
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
              data={filteredInvoices}
            />
          </TabsContent>
          <TabsContent value="unpaid">
            <DataTable columns={columns} data={filteredInvoices} />
          </TabsContent>
          <TabsContent value="partial">
            <DataTable columns={columns} data={filteredInvoices} />
          </TabsContent>
          <TabsContent value="paid">
            <DataTable columns={columns} data={filteredInvoices} />
          </TabsContent>
        </Tabs>
      </Card>

      {/* AP Invoice Form Dialog */}
      <APInvoiceForm open={invoiceFormOpen} onOpenChange={setInvoiceFormOpen} />

      {/* AP Payment Form Dialog */}
      <APPaymentForm 
        open={paymentFormOpen} 
        onOpenChange={(open) => {
          setPaymentFormOpen(open);
          if (!open) setSelectedInvoiceForPayment(null);
        }}
        preselectedVendorId={selectedInvoiceForPayment?.vendor_id}
      />

      {/* AP Ageing Report Dialog */}
      <Dialog open={ageingReportOpen} onOpenChange={setAgeingReportOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AP Ageing Report</DialogTitle>
            <DialogDescription>
              View outstanding payables by ageing buckets
            </DialogDescription>
          </DialogHeader>
          <APAgeingReport />
        </DialogContent>
      </Dialog>

      {/* Invoice Detail View Dialog */}
      <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              {viewInvoice?.invoice_number}
            </DialogDescription>
          </DialogHeader>
          {viewInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Vendor</p>
                  <p className="font-medium">{viewInvoice.vendors?.vendor_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="flex gap-2">
                    {getStatusBadge(viewInvoice.status)}
                    {getApprovalBadge(viewInvoice.approval_status)}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Date</p>
                  <p className="font-medium">{format(new Date(viewInvoice.invoice_date), "MMM dd, yyyy")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className={`font-medium ${isOverdue(viewInvoice.due_date, viewInvoice.status) ? "text-destructive" : ""}`}>
                    {format(new Date(viewInvoice.due_date), "MMM dd, yyyy")}
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="font-bold text-lg">
                    <CurrencyDisplay amount={viewInvoice.total_amount || 0} />
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">WHT Amount</p>
                  <p className="font-bold text-lg text-orange-600">
                    <CurrencyDisplay amount={viewInvoice.wht_amount || 0} />
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Paid Amount</p>
                  <p className="font-bold text-lg text-green-600">
                    <CurrencyDisplay amount={viewInvoice.paid_amount || 0} />
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Balance</p>
                  <p className={`font-bold text-lg ${viewInvoice.balance > 0 ? "text-destructive" : "text-green-600"}`}>
                    <CurrencyDisplay amount={viewInvoice.balance || 0} />
                  </p>
                </div>
              </div>

              {viewInvoice.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="text-sm">{viewInvoice.notes}</p>
                  </div>
                </>
              )}

              <div className="pt-4 flex gap-2">
                <Button 
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setPrintDocumentData(viewInvoice);
                    setPrintDocumentType("ap_invoice");
                    setPrintDocumentOpen(true);
                  }}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Invoice
                </Button>
                {viewInvoice.balance > 0 && viewInvoice.approval_status === "approved" && (
                  <Button 
                    className="flex-1"
                    onClick={() => {
                      setViewInvoice(null);
                      handlePayClick(viewInvoice);
                    }}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Process Payment
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Document Print Preview Modal */}
      <FinanceDocumentPreviewModal
        open={printDocumentOpen}
        onOpenChange={setPrintDocumentOpen}
        documentType={printDocumentType}
        documentData={printDocumentData}
      />
    </div>
  );
};