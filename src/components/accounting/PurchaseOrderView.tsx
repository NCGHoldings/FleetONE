import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, FileText, CheckCircle, Package, ArrowRight } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePurchaseOrders, useGoodsReceiptNotes } from "@/hooks/useAccountingData";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { format } from "date-fns";
import { PurchaseOrderForm } from "./PurchaseOrderForm";
import { GoodsReceiptForm } from "./GoodsReceiptForm";
import { InvoiceMatchingView } from "./InvoiceMatchingView";

export const PurchaseOrderView = () => {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [activeMainTab, setActiveMainTab] = useState("po");
  const { data: purchaseOrders, isLoading } = usePurchaseOrders(statusFilter);
  const { data: grns } = useGoodsReceiptNotes();
  const [showPOForm, setShowPOForm] = useState(false);
  const [showGRNForm, setShowGRNForm] = useState(false);
  const [selectedPO, setSelectedPO] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "outline",
      pending_approval: "secondary",
      approved: "default",
      partially_received: "outline",
      fully_received: "default",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status?.replace("_", " ").toUpperCase()}</Badge>;
  };

  const poColumns = [
    {
      accessorKey: "po_number",
      header: "PO Number",
      cell: ({ row }: any) => (
        <span className="font-mono font-medium">{row.original.po_number}</span>
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
      accessorKey: "po_date",
      header: "PO Date",
      cell: ({ row }: any) => format(new Date(row.original.po_date), "MMM dd, yyyy"),
    },
    {
      accessorKey: "expected_date",
      header: "Expected Delivery",
      cell: ({ row }: any) => 
        row.original.expected_date 
          ? format(new Date(row.original.expected_date), "MMM dd, yyyy")
          : "-",
    },
    {
      accessorKey: "total_amount",
      header: "Total Amount",
      cell: ({ row }: any) => (
        <span className="font-semibold">
          <CurrencyDisplay amount={row.original.total_amount || 0} />
        </span>
      ),
    },
    {
      accessorKey: "received_amount",
      header: "Received",
      cell: ({ row }: any) => (
        <span className="text-green-600">
          <CurrencyDisplay amount={row.original.received_amount || 0} />
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
      cell: ({ row }: any) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost">
            <Eye className="h-4 w-4" />
          </Button>
          {(row.original.status === "approved" || row.original.status === "partially_received") && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                setSelectedPO(row.original.id);
                setShowGRNForm(true);
              }}
            >
              <Package className="h-4 w-4 mr-1" />
              Receive
            </Button>
          )}
        </div>
      ),
    },
  ];

  const grnColumns = [
    {
      accessorKey: "grn_number",
      header: "GRN Number",
      cell: ({ row }: any) => (
        <span className="font-mono font-medium">{row.original.grn_number}</span>
      ),
    },
    {
      accessorKey: "purchase_orders.po_number",
      header: "PO Number",
      cell: ({ row }: any) => row.original.purchase_orders?.po_number || "N/A",
    },
    {
      accessorKey: "vendors.vendor_name",
      header: "Vendor",
      cell: ({ row }: any) => row.original.vendors?.vendor_name || "N/A",
    },
    {
      accessorKey: "receipt_date",
      header: "Receipt Date",
      cell: ({ row }: any) => format(new Date(row.original.receipt_date), "MMM dd, yyyy"),
    },
    {
      accessorKey: "total_value",
      header: "Value",
      cell: ({ row }: any) => <CurrencyDisplay amount={row.original.total_value || 0} />,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => getStatusBadge(row.original.status),
    },
  ];

  const pendingCount = purchaseOrders?.filter(po => po.status === "pending_approval").length || 0;
  const approvedCount = purchaseOrders?.filter(po => po.status === "approved").length || 0;
  const totalValue = purchaseOrders?.reduce((sum, po) => sum + (po.total_amount || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Procurement & Purchase Orders</h2>
          <p className="text-sm text-muted-foreground">
            Manage purchase orders and goods receipts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowGRNForm(true)}>
            <Package className="h-4 w-4 mr-2" />
            Record GRN
          </Button>
          <Button onClick={() => setShowPOForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Purchase Order
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total POs</p>
          <h3 className="text-2xl font-bold mt-1">{purchaseOrders?.length || 0}</h3>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Pending Approval</p>
          <h3 className="text-2xl font-bold text-yellow-600 mt-1">{pendingCount}</h3>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Approved (Awaiting GRN)</p>
          <h3 className="text-2xl font-bold text-blue-600 mt-1">{approvedCount}</h3>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total PO Value</p>
          <h3 className="text-xl font-bold text-primary mt-1">
            <CurrencyDisplay amount={totalValue} />
          </h3>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="p-6">
        <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="po">Purchase Orders</TabsTrigger>
            <TabsTrigger value="grn">Goods Receipt Notes</TabsTrigger>
            <TabsTrigger value="matching">3-Way Matching</TabsTrigger>
          </TabsList>

          <TabsContent value="po" className="mt-4">
            <Tabs defaultValue="all" className="space-y-4">
              <TabsList>
                <TabsTrigger value="all" onClick={() => setStatusFilter(undefined)}>
                  All
                </TabsTrigger>
                <TabsTrigger value="draft" onClick={() => setStatusFilter("draft")}>
                  Draft
                </TabsTrigger>
                <TabsTrigger value="pending" onClick={() => setStatusFilter("pending_approval")}>
                  Pending Approval
                </TabsTrigger>
                <TabsTrigger value="approved" onClick={() => setStatusFilter("approved")}>
                  Approved
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <DataTable columns={poColumns} data={purchaseOrders || []} searchKey="po_number" />
              </TabsContent>
              <TabsContent value="draft">
                <DataTable columns={poColumns} data={purchaseOrders || []} searchKey="po_number" />
              </TabsContent>
              <TabsContent value="pending">
                <DataTable columns={poColumns} data={purchaseOrders || []} searchKey="po_number" />
              </TabsContent>
              <TabsContent value="approved">
                <DataTable columns={poColumns} data={purchaseOrders || []} searchKey="po_number" />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="grn" className="mt-4">
            <DataTable columns={grnColumns} data={grns || []} searchKey="grn_number" />
          </TabsContent>

          <TabsContent value="matching" className="mt-4">
            <InvoiceMatchingView />
          </TabsContent>
        </Tabs>
      </Card>

      <PurchaseOrderForm open={showPOForm} onOpenChange={setShowPOForm} />
      <GoodsReceiptForm 
        open={showGRNForm} 
        onOpenChange={setShowGRNForm}
        purchaseOrderId={selectedPO}
      />
    </div>
  );
};
