import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle, Eye, FileText, Printer, Search, Pencil, Trash2 } from "lucide-react";
import { ARInvoiceForm } from "./ARInvoiceForm";
import { ARReceiptForm } from "./ARReceiptForm";
import { ARAgeingReport } from "./ARAgeingReport";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useARInvoices, useAllProfiles } from "@/hooks/useAccountingData";
import { useDeleteARInvoice } from "@/hooks/useAccountingMutations";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { DataExportMenu } from "@/components/ui/DataExportMenu";
import { supabase } from "@/integrations/supabase/client";
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
import { RelatedJournalEntries } from "./shared/RelatedJournalEntries";
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
  const { data: profiles } = useAllProfiles();
  const deleteInvoice = useDeleteARInvoice();

  const getCreatorName = (userId: string | null) => {
    if (!userId) return "System";
    const profile = profiles?.find((p: any) => p.user_id === userId || p.id === userId);
    if (profile) return `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Unknown User";
    return userId.substring(0, 8);
  };

  // ── TEMPORARY PATCH: Backfill bus_no for School Bus AR Invoices ──
  useEffect(() => {
    const patchOldInvoices = async () => {
      try {
        const { data: arInvoices } = await supabase
          .from('ar_invoices')
          .select('id, reference, bus_no')
          .ilike('invoice_number', 'SBS-INV-%');
          
        console.log("PATCH: Found SBO invoices:", arInvoices?.length);
        if (!arInvoices || arInvoices.length === 0) return;

        const { data: students } = await supabase.from('school_students').select('id, student_name, bus_reg_no');
        const { data: buses } = await supabase.from('buses').select('id, bus_no, category_id');
        
        const busMap = new Map();
        buses?.forEach((b: any) => { if (b.bus_no) busMap.set(b.bus_no, b); });

        const studentMap = new Map();
        students?.forEach((s: any) => {
          if (s.student_name && s.bus_reg_no) {
            const bus = busMap.get(s.bus_reg_no);
            if (bus) {
              studentMap.set(s.student_name.trim(), { bus_no: s.bus_reg_no, ...bus });
            } else {
              studentMap.set(s.student_name.trim(), { bus_no: s.bus_reg_no, id: null, category_id: null });
            }
          }
        });

        let updated = 0;
        for (const inv of arInvoices) {
          if (!inv.bus_no && inv.reference) {
            const studentName = inv.reference.split(' - ')[0].trim();
            const busInfo = studentMap.get(studentName);
            if (busInfo) {
              await supabase.from('ar_invoices').update({
                bus_no: busInfo.bus_no,
                bus_id: busInfo.id,
                bus_category_id: busInfo.category_id
              }).eq('id', inv.id);
              updated++;
            }
          }
        }
        console.log("PATCH: Successfully updated:", updated);
        if (updated > 0) {
          // Force a refetch to show the updated data!
          window.location.reload();
        }
      } catch (err) {
        console.error("Patch failed", err);
      }
    };
    patchOldInvoices();
  }, []);
  // ──────────────────────────────────────────────────────────────────

  // ── SELF-HEALING PATCH: Fix mismatched customer_id on Vehicle AR Invoices ──
  // When createVehicleCustomer previously matched a customer from the wrong module
  // (e.g. Light Vehicle "E R T PERERA" linked to Yutong orders), this patch
  // auto-corrects the customer_id to match the actual quotation customer.
  useEffect(() => {
    const patchVehicleARCustomers = async () => {
      try {
        // Find all vehicle AR invoices (Yutong + Sinotruk)
        const { data: vehicleARInvoices } = await supabase
          .from('ar_invoices')
          .select('id, invoice_number, customer_id, reference')
          .or('invoice_number.ilike.NCGH-YT-%,invoice_number.ilike.NCGH-SNT-%');

        if (!vehicleARInvoices || vehicleARInvoices.length === 0) return;

        // Determine module type for each invoice
        const modules = [
          { prefix: 'NCGH-YT-', module: 'yutong', orderTable: 'yutong_orders', quotationJoin: 'yutong_quotations(customer_name, customer_phone, customer_email, customer_category_id)', buCode: 'YUT' },
          { prefix: 'NCGH-SNT-', module: 'sinotruck', orderTable: 'sinotruck_orders', quotationJoin: 'sinotruck_quotations(customer_name, customer_phone, customer_email, customer_category_id)', buCode: 'SNT' },
        ];

        let fixedCount = 0;

        for (const modInfo of modules) {
          const modInvoices = vehicleARInvoices.filter(inv => inv.invoice_number?.startsWith(modInfo.prefix));
          if (modInvoices.length === 0) continue;

          // Find orders linked to these AR invoices
          const arInvoiceIds = modInvoices.map(inv => inv.id);
          const { data: orders } = await supabase
            .from(modInfo.orderTable as any)
            .select(`id, order_no, ar_invoice_id, finance_customer_id, ${modInfo.quotationJoin}`)
            .in('ar_invoice_id', arInvoiceIds);

          if (!orders) continue;

          for (const order of orders) {
            const quotation = (order as any)[`${modInfo.module}_quotations`];
            const expectedName = quotation?.customer_name;
            if (!expectedName) continue;

            const arInv = modInvoices.find(inv => inv.id === (order as any).ar_invoice_id);
            if (!arInv?.customer_id) continue;

            // Check current customer name
            const { data: currentCustomer } = await supabase
              .from('customers')
              .select('id, customer_name, business_unit_code')
              .eq('id', arInv.customer_id)
              .single();

            if (!currentCustomer) continue;

            // Compare names (case-insensitive)
            if (currentCustomer.customer_name?.toLowerCase().trim() === expectedName.toLowerCase().trim()) continue;

            // MISMATCH DETECTED — fix it
            console.log(`[AR PATCH] Customer mismatch on ${arInv.invoice_number}: "${currentCustomer.customer_name}" should be "${expectedName}"`);

            // Find or create the correct customer (module-scoped)
            let correctCustomerId: string | null = null;

            // Try module-scoped match first
            const { data: scopedMatch } = await supabase
              .from('customers')
              .select('id')
              .eq('company_id', 'a0000000-0000-0000-0000-000000000001')
              .eq('business_unit_code', modInfo.buCode)
              .ilike('customer_name', expectedName)
              .limit(1)
              .maybeSingle();

            if (scopedMatch?.id) {
              correctCustomerId = scopedMatch.id;
            } else {
              // Create new module-scoped customer
              const customerCode = `${modInfo.buCode}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
              const { data: newCustomer } = await supabase
                .from('customers')
                .insert({
                  company_id: 'a0000000-0000-0000-0000-000000000001',
                  customer_code: customerCode,
                  customer_name: expectedName,
                  phone: quotation?.customer_phone || null,
                  email: quotation?.customer_email || null,
                  customer_type: 'individual',
                  customer_category_id: quotation?.customer_category_id || null,
                  business_unit_code: modInfo.buCode,
                  is_active: true,
                })
                .select('id')
                .single();

              correctCustomerId = newCustomer?.id || null;
            }

            if (correctCustomerId) {
              // Update AR Invoice customer_id
              await supabase
                .from('ar_invoices')
                .update({ customer_id: correctCustomerId })
                .eq('id', arInv.id);

              // Update order's finance_customer_id
              await supabase
                .from(modInfo.orderTable as any)
                .update({ finance_customer_id: correctCustomerId } as any)
                .eq('id', (order as any).id);

              console.log(`[AR PATCH] Fixed ${arInv.invoice_number}: customer_id updated to ${correctCustomerId} ("${expectedName}")`);
              fixedCount++;
            }
          }
        }

        if (fixedCount > 0) {
          console.log(`[AR PATCH] Fixed ${fixedCount} vehicle AR invoice(s) with wrong customer mapping.`);
          window.location.reload();
        }
      } catch (err) {
        console.error('[AR PATCH] Vehicle customer fix failed:', err);
      }
    };
    patchVehicleARCustomers();
  }, []);
  // ──────────────────────────────────────────────────────────────────

  // Multi-field search filter
  const filteredInvoices = useMemo(() => {
    if (!invoices || !searchQuery.trim()) return invoices || [];
    const query = searchQuery.toLowerCase();
    return invoices.filter((inv) =>
      inv.invoice_number?.toLowerCase().includes(query) ||
      inv.customers?.customer_name?.toLowerCase().includes(query) ||
      inv.customers?.customer_code?.toLowerCase().includes(query) ||
      inv.status?.toLowerCase().includes(query) ||
      inv.reference?.toLowerCase().includes(query) ||
      inv.bus_no?.toLowerCase().includes(query) ||
      inv.school_ar_invoices?.[0]?.school_students?.bus_reg_no?.toLowerCase().includes(query) ||
      inv.school_ar_invoices?.[0]?.school_students?.route?.toLowerCase().includes(query) ||
      inv.school_ar_invoices?.[0]?.school_students?.school_location?.toLowerCase().includes(query) ||
      inv.bus_categories?.name?.toLowerCase().includes(query)
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
  const canDelete = (_status: string) => true; // Force delete enabled for testing

  const handleReceiveClick = (invoice: any) => {
    setSelectedInvoiceForReceipt(invoice);
    setReceiptFormOpen(true);
  };

  const handleDelete = () => {
    if (deleteConfirmId) {
      deleteInvoice.mutate(deleteConfirmId);
      setDeleteConfirmId(null);
      setViewInvoice(null);
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
      accessorKey: "bus_no",
      header: "Bus No.",
      cell: ({ row }: any) => {
        const busNo = row.original.bus_no || row.original.school_ar_invoices?.[0]?.school_students?.bus_reg_no;
        if (!busNo) return <span className="text-muted-foreground text-xs">—</span>;
        return <span className="font-mono text-sm">{busNo}</span>;
      },
    },
    {
      id: "bus_category",
      accessorFn: (row: any) => row.bus_categories?.name,
      header: "Category",
      cell: ({ row }: any) => {
        const cat = row.original.bus_categories;
        if (!cat) return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <Badge
            variant="outline"
            className="text-xs"
            style={{
              borderColor: cat.color,
              color: cat.color,
            }}
          >
            {cat.name}
          </Badge>
        );
      },
    },
    {
      id: "route_branch",
      header: "Route / Branch",
      cell: ({ row }: any) => {
        const schInfo = row.original.school_ar_invoices?.[0]?.school_students;
        if (!schInfo) return <span className="text-muted-foreground text-xs">—</span>;
        
        return (
          <div className="flex flex-col">
            {schInfo.route && <span className="font-medium text-xs">{schInfo.route}</span>}
            {schInfo.school_location && <span className="text-muted-foreground text-[10px]">{schInfo.school_location}</span>}
            {(!schInfo.route && !schInfo.school_location) && <span className="text-muted-foreground text-xs">—</span>}
          </div>
        );
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

  const totalOutstanding = filteredInvoices?.reduce((sum: number, inv: any) => sum + (inv.balance || 0), 0) || 0;
  const totalPaid = filteredInvoices?.reduce((sum: number, inv: any) => sum + (inv.paid_amount || 0), 0) || 0;
  const overdueCount = filteredInvoices?.filter((inv: any) => isOverdue(inv.due_date, inv.status || "")).length || 0;
  const overdueAmount = filteredInvoices
    ?.filter((inv: any) => isOverdue(inv.due_date, inv.status || ""))
    .reduce((sum: number, inv: any) => sum + (inv.balance || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Invoices</p>
          <h3 className="text-2xl font-bold mt-1">{filteredInvoices?.length || 0}</h3>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Outstanding</p>
          <h3 className="text-2xl font-bold text-primary mt-1">
            <CurrencyDisplay amount={totalOutstanding} />
          </h3>
        </Card>
        <Card className="p-4 bg-green-50/50 border-green-100">
          <p className="text-sm text-green-700 font-medium">Total Collected</p>
          <h3 className="text-2xl font-bold text-green-700 mt-1">
            <CurrencyDisplay amount={totalPaid} />
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
            <DataExportMenu 
              data={filteredInvoices || []}
              title="Accounts Receivable"
              filename="ar_invoices"
              headers={["Invoice #", "Customer", "Bus No.", "Category", "Date", "Due Date", "Amount", "Paid", "Balance", "Status"]}
              transformData={(data) => data.map(inv => [
                inv.invoice_number || 'N/A',
                inv.customers?.customer_name || 'N/A',
                inv.bus_no || inv.school_ar_invoices?.[0]?.school_students?.bus_reg_no || 'N/A',
                inv.bus_categories?.name || 'N/A',
                inv.invoice_date ? format(new Date(inv.invoice_date), "MMM dd, yyyy") : 'N/A',
                inv.due_date ? format(new Date(inv.due_date), "MMM dd, yyyy") : 'N/A',
                inv.total_amount?.toString() || '0',
                inv.paid_amount?.toString() || '0',
                inv.balance?.toString() || '0',
                inv.status || 'N/A'
              ])}
            />
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
            placeholder="Search by invoice #, customer, bus no., category, status..."
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
            <DataTable enableColumnFilters columns={columns} data={filteredInvoices} variant="professional" />
          </TabsContent>
          <TabsContent value="unpaid">
            <DataTable enableColumnFilters columns={columns} data={filteredInvoices} variant="professional" />
          </TabsContent>
          <TabsContent value="partial">
            <DataTable enableColumnFilters columns={columns} data={filteredInvoices} variant="professional" />
          </TabsContent>
          <TabsContent value="paid">
            <DataTable enableColumnFilters columns={columns} data={filteredInvoices} variant="professional" />
          </TabsContent>
        </Tabs>
      </Card>

      {/* AR Invoice Form Dialog */}
      <ARInvoiceForm open={invoiceFormOpen} onOpenChange={(open) => { setInvoiceFormOpen(open); if (!open) setEditingInvoice(null); }} editingInvoice={editingInvoice} />

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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                {(viewInvoice.bus_no || viewInvoice.school_ar_invoices?.[0]?.school_students?.bus_reg_no) && (
                  <div>
                    <p className="text-sm text-muted-foreground">Bus Number</p>
                    <p className="font-medium font-mono">{viewInvoice.bus_no || viewInvoice.school_ar_invoices?.[0]?.school_students?.bus_reg_no}</p>
                  </div>
                )}
                {viewInvoice.school_ar_invoices?.[0]?.school_students?.route && (
                  <div>
                    <p className="text-sm text-muted-foreground">Route</p>
                    <p className="font-medium">{viewInvoice.school_ar_invoices[0].school_students.route}</p>
                  </div>
                )}
                {viewInvoice.school_ar_invoices?.[0]?.school_students?.school_location && (
                  <div>
                    <p className="text-sm text-muted-foreground">School Branch</p>
                    <p className="font-medium">{viewInvoice.school_ar_invoices[0].school_students.school_location}</p>
                  </div>
                )}
                {viewInvoice.bus_categories?.name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Bus Category</p>
                    <Badge variant="outline" style={{ borderColor: viewInvoice.bus_categories.color, color: viewInvoice.bus_categories.color }}>
                      {viewInvoice.bus_categories.name}
                    </Badge>
                  </div>
                )}
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

              <RelatedJournalEntries sourceId={viewInvoice.id} sourceType="ar_invoice" />

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
