import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, DollarSign, Eye, FileText, Printer, Search, CheckCircle, Pencil, Trash2 } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useAPInvoices, useAllProfiles } from "@/hooks/useAccountingData";
import { useApproveAPInvoice, useDeleteAPInvoice } from "@/hooks/useAccountingMutations";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APInvoiceForm } from "./APInvoiceForm";
import { APPaymentForm } from "./APPaymentForm";
import { APAgeingReport } from "./APAgeingReport";
import { ArrowRightLeft } from "lucide-react";
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
import { RelatedJournalEntries } from "./shared/RelatedJournalEntries";
import { MergeToPaymentDialog } from "./MergeToPaymentDialog";
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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [mergeInvoice, setMergeInvoice] = useState<any>(null);
  const { data: invoices, isLoading } = useAPInvoices(statusFilter);
  const { data: profiles } = useAllProfiles();
  const approveInvoice = useApproveAPInvoice();
  const deleteInvoice = useDeleteAPInvoice();

  const getCreatorName = (userId: string | null) => {
    if (!userId) return "System";
    const profile = profiles?.find((p: any) => p.user_id === userId || p.id === userId);
    if (profile) return `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Unknown User";
    return userId.substring(0, 8);
  };

  const filteredInvoices = useMemo(() => {
    if (!invoices || !searchQuery.trim()) return invoices || [];
    const query = searchQuery.toLowerCase();
    return invoices.filter((inv) =>
      inv.invoice_number?.toLowerCase().includes(query) ||
      (inv as any).vendor_bill_number?.toLowerCase().includes(query) ||
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

  const canEdit = (status: string) => !["paid", "posted"].includes(status);
  const canDelete = (_status: string) => true; // Force delete enabled for testing

  const handlePayClick = (invoice: any) => {
    setSelectedInvoiceForPayment(invoice);
    setPaymentFormOpen(true);
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
        <div>
          <span className="font-mono font-medium">{row.original.invoice_number}</span>
          {row.original.legacy_number && row.original.legacy_number !== row.original.invoice_number && (
            <div className="text-[10px] text-muted-foreground/60 mt-0.5 font-mono">was: {row.original.legacy_number}</div>
          )}
        </div>
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
      accessorKey: "vendor_bill_number",
      header: "Vendor Bill #",
      cell: ({ row }: any) => {
        const billNo = row.original.vendor_bill_number;
        return billNo ? <span className="font-mono text-xs">{billNo}</span> : <span className="text-xs text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "routes.route_name",
      header: "Route",
      cell: ({ row }: any) => {
        const route = row.original.routes;
        const schoolRoute = row.original.school_routes;
        if (route) return <span className="text-xs">{route.route_no ? `${route.route_no} - ` : ""}{route.route_name}</span>;
        if (schoolRoute) return <span className="text-xs text-primary">{schoolRoute.route_code ? `${schoolRoute.route_code} - ` : ""}{schoolRoute.route_name}</span>;
        return <span className="text-xs text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "buses.bus_no",
      header: "Bus",
      cell: ({ row }: any) => {
        const bus = row.original.buses;
        if (bus) return <span className="text-xs font-mono">{bus.bus_no}</span>;
        return <span className="text-xs text-muted-foreground">—</span>;
      },
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
      accessorKey: "created_by",
      header: "Created By",
      cell: ({ row }: any) => (
        <span className="text-xs text-muted-foreground">
          {getCreatorName(row.original.created_by)}
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
            {row.original.approval_status === "pending" && (
              <Button 
                size="sm" 
                variant="outline"
                className="text-green-600 border-green-600 hover:bg-green-50"
                onClick={() => approveInvoice.mutate(row.original.id)}
                disabled={approveInvoice.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
            )}
            {row.original.balance > 0 && row.original.approval_status === "approved" && (
              <>
                <Button 
                  size="sm" 
                  variant="outline"
                  title="Merge into Payment"
                  onClick={() => setMergeInvoice(row.original)}
                >
                  <ArrowRightLeft className="h-4 w-4 mr-1" />
                  Merge
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handlePayClick(row.original)}
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  Pay
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  const totalOutstanding = filteredInvoices?.reduce((sum: number, inv: any) => sum + (inv.balance || 0), 0) || 0;
  const totalWHT = filteredInvoices?.reduce((sum: number, inv: any) => sum + (inv.wht_amount || 0), 0) || 0;
  const overdueCount = filteredInvoices?.filter((inv: any) => isOverdue(inv.due_date, inv.status || "")).length || 0;
  const overdueAmount = filteredInvoices
    ?.filter((inv: any) => isOverdue(inv.due_date, inv.status || ""))
    .reduce((sum: number, inv: any) => sum + (inv.balance || 0), 0) || 0;
  const pendingApproval = filteredInvoices?.filter((inv: any) => inv.approval_status === "pending").length || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Invoices</p>
          <h3 className="text-2xl font-bold mt-1">{filteredInvoices?.length || 0}</h3>
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
            <DataTable columns={columns} data={filteredInvoices} />
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
      <APInvoiceForm open={invoiceFormOpen} onOpenChange={(open) => { setInvoiceFormOpen(open); if (!open) setEditingInvoice(null); }} editingInvoice={editingInvoice} />

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
                  <p className="text-sm text-muted-foreground">Vendor Bill #</p>
                  <p className="font-medium font-mono">{viewInvoice.vendor_bill_number || "—"}</p>
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

              <RelatedJournalEntries sourceId={viewInvoice.id} sourceType="ap_invoice" />

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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete AP Invoice?</AlertDialogTitle>
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

      {/* Document Print Preview Modal - only mount when open */}
      {printDocumentOpen && (
        <FinanceDocumentPreviewModal
          open={printDocumentOpen}
          onOpenChange={setPrintDocumentOpen}
          documentType={printDocumentType}
          documentData={printDocumentData}
          companyId={printDocumentData?.company_id}
          businessUnitCode={printDocumentData?.business_unit_code}
        />
      )}

      {/* Merge Invoice into Payment Dialog */}
      <MergeToPaymentDialog
        open={!!mergeInvoice}
        onOpenChange={(open) => { if (!open) setMergeInvoice(null); }}
        invoice={mergeInvoice}
      />
    </div>
  );
};
