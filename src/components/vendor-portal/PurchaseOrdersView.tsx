import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClipboardList, Eye, Check, Search, FileText } from "lucide-react";
import { CurrencyDisplay } from "@/components/accounting/shared/CurrencyDisplay";
import { format } from "date-fns";
import { toast } from "sonner";

interface PurchaseOrdersViewProps {
  vendorId: string;
}

export const PurchaseOrdersView = ({ vendorId }: PurchaseOrdersViewProps) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Fetch purchase orders
  const { data: purchaseOrders, isLoading } = useQuery({
    queryKey: ["vendor_purchase_orders", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select(`
          *,
          purchase_order_lines(*)
        `)
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Acknowledge PO mutation
  const acknowledgePO = useMutation({
    mutationFn: async (poId: string) => {
      const { error } = await supabase
        .from("purchase_orders")
        .update({
          status: "acknowledged",
          updated_at: new Date().toISOString(),
        })
        .eq("id", poId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor_purchase_orders"] });
      toast.success("Purchase order acknowledged successfully");
    },
    onError: () => {
      toast.error("Failed to acknowledge purchase order");
    },
  });

  const filteredPOs = purchaseOrders?.filter((po) =>
    po.po_number?.toLowerCase().includes(search.toLowerCase()) ||
    po.status?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      submitted: "default",
      approved: "default",
      acknowledged: "outline",
      completed: "outline",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const viewDetails = (po: any) => {
    setSelectedPO(po);
    setDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Purchase Orders</h2>
        <p className="text-muted-foreground">View and acknowledge purchase orders from NCG FleetFlow</p>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by PO number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* PO List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Purchase Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading purchase orders...</p>
          ) : filteredPOs && filteredPOs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Expected Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPOs.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.po_number}</TableCell>
                    <TableCell>{format(new Date(po.order_date), "dd MMM yyyy")}</TableCell>
                    <TableCell>
                      {po.expected_date
                        ? format(new Date(po.expected_date), "dd MMM yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <CurrencyDisplay amount={po.total_amount || 0} />
                    </TableCell>
                    <TableCell>{getStatusBadge(po.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => viewDetails(po)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {(po.status === "approved" || po.status === "submitted") && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => acknowledgePO.mutate(po.id)}
                            disabled={acknowledgePO.isPending}
                            className="bg-orange-500 hover:bg-orange-600"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Acknowledge
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No purchase orders found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PO Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Purchase Order: {selectedPO?.po_number}</DialogTitle>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Order Date</p>
                  <p className="font-medium">{format(new Date(selectedPO.order_date), "dd MMM yyyy")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expected Date</p>
                  <p className="font-medium">
                    {selectedPO.expected_date
                      ? format(new Date(selectedPO.expected_date), "dd MMM yyyy")
                      : "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedPO.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="font-medium">
                    <CurrencyDisplay amount={selectedPO.total_amount || 0} />
                  </p>
                </div>
              </div>

              {selectedPO.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="font-medium">{selectedPO.notes}</p>
                </div>
              )}

              {/* Line Items */}
              {selectedPO.purchase_order_lines && selectedPO.purchase_order_lines.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Line Items</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPO.purchase_order_lines.map((line: any) => (
                        <TableRow key={line.id}>
                          <TableCell>{line.description}</TableCell>
                          <TableCell className="text-right">{line.quantity}</TableCell>
                          <TableCell className="text-right">
                            <CurrencyDisplay amount={line.unit_price || 0} />
                          </TableCell>
                          <TableCell className="text-right">
                            <CurrencyDisplay amount={line.line_total || 0} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
