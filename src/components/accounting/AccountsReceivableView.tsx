import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle, Eye, FileText, Printer, Search, Pencil, Trash2 } from "lucide-react";
import { ARInvoiceForm } from "./ARInvoiceForm";
import { ARReceiptForm } from "./ARReceiptForm";
import { ARAgeingReport } from "./ARAgeingReport";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useARInvoices } from "@/hooks/useAccountingData";
import { useDeleteARInvoice } from "@/hooks/useAccountingMutations";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { FinanceDocumentPreviewModal } from "./shared/FinanceDocumentPreviewModal";
import { Input } from "@/components/ui/input";

export const AccountsReceivableView = () => {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [invoiceFormOpen, setInvoiceFormOpen] = useState(false);
  const [receiptFormOpen, setReceiptFormOpen] = useState(false);
  const [selectedInvoiceForReceipt, setSelectedInvoiceForReceipt] = useState<any>(null);
  const [ageingReportOpen, setAgeingReportOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<any>(null);
  const [printDocumentOpen, setPrintDocumentOpen] = useState(false);
  const [printDocumentData, setPrintDocumentData] = useState<any>(null);
  const [printDocumentType, setPrintDocumentType] = useState<string>("ar_invoice");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const { data: invoices, isLoading } = useARInvoices(statusFilter);
  const deleteInvoice = useDeleteARInvoice();

  // Multi-field search filter
  const filteredInvoices = useMemo(() => {
    if (!invoices || !searchQuery.trim()) return invoices || [];
    const query = searchQuery.toLowerCase();
    return invoices.filter((inv) =>
      inv.invoice_number?.toLowerCase().includes(query) ||
      inv.customers?.customer_name?.toLowerCase().includes(query) ||
      inv.customers?.customer_code?.toLowerCase().includes(query) ||
      inv.status?.toLowerCase().includes(query) ||
      inv.reference?.toLowerCase().includes(query)
    );
  }, [invoices, searchQuery]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "outline",
      unpaid: "secondary",
      partial: "outline",
      paid: "default",
      overdue: "destructive",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status?.toUpperCase()}</Badge>;
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status === "paid" || status === "cancelled") return false;
    return new Date(dueDate) < new Date();
  };

  const canEdit = (status: string) => !["paid", "posted"].includes(status);
  const canDelete = (status: string) => ["draft", "cancelled"].includes(status);

  const handleReceiveClick = (invoice: any) => {
    setSelectedInvoiceForReceipt(invoice);
    setReceiptFormOpen(true);
  };

  const handleDelete = () => {
    if (deleteConfirmId) {
      deleteInvoice.mutate(deleteConfirmId);
      setDeleteConfirmId(null);
    }
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
      accessorKey: "customers.customer_name",
      header: "Customer",
      cell: ({ row }: any) => (
        <div>
          <p className="font-medium">{row.original.customers?.customer_name || "N/A"}</p>
          <p className="text-xs text-muted-foreground">{row.original.customers?.customer_code}</p>
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
      accessorKey: "paid_amount",
      header: "Paid",
      cell: ({ row }: any) => (
        <span className="text-green-600">
          <CurrencyDisplay amount={row.original.paid_amount || 0} />
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
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => getStatusBadge(row.original.status),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => {
        const status = row.original.status || "draft";
        return (
          <div className="flex gap-1">
            <Button 
              size="sm" 
              variant="ghost" 
              title="View Details"
              onClick={() => setViewInvoice(row.original)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {canEdit(status) && (
              <Button 
                size="sm" 
                variant="ghost"
                title="Edit Invoice"
                onClick={() => {
                  setEditingInvoice(row.original);
                  setInvoiceFormOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {canDelete(status) && (
              <Button 
                size="sm" 
                variant="ghost"
                title="Delete Invoice"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteConfirmId(row.original.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            {row.original.balance > 0 && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleReceiveClick(row.original)}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Receive
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const totalOutstanding = invoices?.reduce((sum, inv) => sum + (inv.balance || 0), 0) || 0;
  const overdueCount = invoices?.filter(inv => isOverdue(inv.due_date, inv.status || "")).length || 0;
  const overdueAmount = invoices
    ?.filter(inv => isOverdue(inv.due_date, inv.status || ""))
    .reduce((sum, inv) => sum + (inv.balance || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Invoices</p>
          <h3 className="text-2xl font-bold mt-1">{invoices?.length || 0}</h3>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Outstanding</p>
          <h3 className="text-2xl font-bold text-primary mt-1">
            <CurrencyDisplay amount={totalOutstanding} />
          </h3>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Overdue Invoices</p>
          <h3 className="text-2xl font-bold text-destructive mt-1">{overdueCount}</h3>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Overdue Amount</p>
          <h3 className="text-2xl font-bold text-destructive mt-1">
            <CurrencyDisplay amount={overdueAmount} />
          </h3>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Accounts Receivable</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Track customer invoices and collect payments
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAgeingReportOpen(true)}>
              <FileText className="h-4 w-4 mr-2" />
              AR Ageing Report
            </Button>
            <Button onClick={() => { setEditingInvoice(null); setInvoiceFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </Button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by invoice #, customer, status..."
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

      {/* AR Invoice Form Dialog */}
      <ARInvoiceForm open={invoiceFormOpen} onOpenChange={(open) => { setInvoiceFormOpen(open); if (!open) setEditingInvoice(null); }} />

      {/* AR Receipt Form Dialog */}
      <ARReceiptForm 
        open={receiptFormOpen} 
        onOpenChange={(open) => {
          setReceiptFormOpen(open);
          if (!open) setSelectedInvoiceForReceipt(null);
        }}
        preselectedCustomerId={selectedInvoiceForReceipt?.customer_id}
      />

      {/* AR Ageing Report Dialog */}
      <Dialog open={ageingReportOpen} onOpenChange={setAgeingReportOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AR Ageing Report</DialogTitle>
            <DialogDescription>
              View outstanding balances by ageing buckets
            </DialogDescription>
          </DialogHeader>
          <ARAgeingReport />
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
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{viewInvoice.customers?.customer_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(viewInvoice.status)}
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
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="font-bold text-lg">
                    <CurrencyDisplay amount={viewInvoice.total_amount || 0} />
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
                    setPrintDocumentType("ar_invoice");
                    setPrintDocumentOpen(true);
                  }}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Invoice
                </Button>
                {canEdit(viewInvoice.status) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setViewInvoice(null);
                      setEditingInvoice(viewInvoice);
                      setInvoiceFormOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
                {canDelete(viewInvoice.status) && (
                  <Button
                    variant="outline"
                    className="text-destructive border-destructive hover:bg-destructive/10"
                    onClick={() => {
                      setViewInvoice(null);
                      setDeleteConfirmId(viewInvoice.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
                {viewInvoice.balance > 0 && (
                  <Button 
                    className="flex-1"
                    onClick={() => {
                      setViewInvoice(null);
                      handleReceiveClick(viewInvoice);
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Record Receipt
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete AR Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this invoice and all associated line items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Document Print Preview Modal */}
      <FinanceDocumentPreviewModal
        open={printDocumentOpen}
        onOpenChange={setPrintDocumentOpen}
        documentType={printDocumentType}
        documentData={printDocumentData}
        companyId={printDocumentData?.company_id}
        businessUnitCode={printDocumentData?.business_unit_code}
      />
    </div>
  );
};
