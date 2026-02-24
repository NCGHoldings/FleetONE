import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Link,
  FileText,
  Package,
  Receipt,
} from "lucide-react";
import {
  usePurchaseOrders,
  useGoodsReceiptNotes,
  useAPInvoices,
} from "@/hooks/useAccountingData";
import { toast } from "sonner";
import { format } from "date-fns";

interface MatchItem {
  id: string;
  po_number: string;
  po_id: string;
  grn_number: string;
  grn_id: string;
  invoice_number: string;
  invoice_id: string;
  item_description: string;
  po_qty: number;
  grn_qty: number;
  invoice_qty: number;
  po_price: number;
  invoice_price: number;
  qty_variance: number;
  price_variance: number;
  match_status: "matched" | "qty_mismatch" | "price_mismatch" | "unmatched";
}

export const InvoiceMatchingView = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchItem | null>(null);

  const { data: purchaseOrders = [] } = usePurchaseOrders();
  const { data: grns = [] } = useGoodsReceiptNotes();
  const { data: apInvoices = [] } = useAPInvoices();

  // Build matching data from POs, GRNs, and Invoices
  const pendingMatches: MatchItem[] = apInvoices
    .filter((inv: any) => inv.grn_id && inv.approval_status === "pending")
    .map((inv: any) => {
      const grn = grns.find((g: any) => g.id === inv.grn_id);
      // Use po_id from GRN to find the PO
      const po = purchaseOrders.find((p: any) => p.id === grn?.po_id);
      
      // Use total_amount for comparison since total_quantity may not exist
      const priceVariance = po ? Math.abs((po.total_amount || 0) - (inv.total_amount || 0)) : 0;
      
      let matchStatus: MatchItem["match_status"] = "matched";
      if (!grn || !po) matchStatus = "unmatched";
      else if (priceVariance > 0.01) matchStatus = "price_mismatch";

      return {
        id: inv.id,
        po_number: po?.po_number || "-",
        po_id: po?.id || "",
        grn_number: grn?.grn_number || "-",
        grn_id: grn?.id || "",
        invoice_number: inv.invoice_number,
        invoice_id: inv.id,
        item_description: inv.notes || "Multiple items",
        po_qty: 1,
        grn_qty: 1,
        invoice_qty: 1,
        po_price: po?.total_amount || 0,
        invoice_price: inv.total_amount || 0,
        qty_variance: 0,
        price_variance: priceVariance,
        match_status: matchStatus,
      };
    });

  const filteredMatches = pendingMatches.filter(
    (item) =>
      item.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.grn_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const matchedCount = pendingMatches.filter((m) => m.match_status === "matched").length;
  const mismatchCount = pendingMatches.filter(
    (m) => m.match_status === "qty_mismatch" || m.match_status === "price_mismatch"
  ).length;
  const unmatchedCount = pendingMatches.filter((m) => m.match_status === "unmatched").length;

  const toggleSelectItem = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedItems.length === filteredMatches.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredMatches.map((m) => m.id));
    }
  };

  const handleApproveSelected = () => {
    if (selectedItems.length === 0) {
      toast.error("Please select items to approve");
      return;
    }
    // Filter only matched items
    const matchedItems = selectedItems.filter((id) => {
      const item = pendingMatches.find((m) => m.id === id);
      return item?.match_status === "matched";
    });

    if (matchedItems.length === 0) {
      toast.error("Only matched items can be approved");
      return;
    }

    toast.success(`${matchedItems.length} invoice(s) approved for payment`);
    setSelectedItems([]);
  };

  const getStatusBadge = (status: MatchItem["match_status"]) => {
    switch (status) {
      case "matched":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Matched
          </Badge>
        );
      case "qty_mismatch":
        return (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Qty Mismatch
          </Badge>
        );
      case "price_mismatch":
        return (
          <Badge variant="outline" className="text-orange-600 border-orange-600">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Price Mismatch
          </Badge>
        );
      case "unmatched":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Unmatched
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">3-Way Invoice Matching</h2>
          <p className="text-muted-foreground">
            Match Purchase Orders, Goods Receipts, and Vendor Invoices
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Match</CardTitle>
            <Link className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingMatches.length}</div>
            <p className="text-xs text-muted-foreground">invoices to review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matched</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{matchedCount}</div>
            <p className="text-xs text-muted-foreground">ready to approve</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Variance</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{mismatchCount}</div>
            <p className="text-xs text-muted-foreground">needs review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unmatched</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{unmatchedCount}</div>
            <p className="text-xs text-muted-foreground">missing documents</p>
          </CardContent>
        </Card>
      </div>

      {/* Matching Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by PO, GRN, or Invoice number..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              onClick={handleApproveSelected}
              disabled={selectedItems.length === 0}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Selected ({selectedItems.length})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={
                      selectedItems.length === filteredMatches.length &&
                      filteredMatches.length > 0
                    }
                    onCheckedChange={selectAll}
                  />
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    PO #
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    <Package className="h-4 w-4" />
                    GRN #
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    <Receipt className="h-4 w-4" />
                    Invoice #
                  </div>
                </TableHead>
                <TableHead className="text-right">PO Amount</TableHead>
                <TableHead className="text-right">Invoice Amount</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    No pending matches found
                  </TableCell>
                </TableRow>
              ) : (
                filteredMatches.map((match) => (
                  <TableRow key={match.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.includes(match.id)}
                        onCheckedChange={() => toggleSelectItem(match.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{match.po_number}</TableCell>
                    <TableCell>{match.grn_number}</TableCell>
                    <TableCell>{match.invoice_number}</TableCell>
                    <TableCell className="text-right font-mono">
                      {match.po_price.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {match.invoice_price.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {match.price_variance > 0 && (
                        <span className="text-destructive">
                          {match.price_variance.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      )}
                      {match.price_variance === 0 && (
                        <span className="text-green-600">0.00</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(match.match_status)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedMatch(match);
                          setDetailDialogOpen(true);
                        }}
                      >
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Match Details</DialogTitle>
          </DialogHeader>
          {selectedMatch && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Purchase Order
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-bold">{selectedMatch.po_number}</p>
                    <p className="text-sm text-muted-foreground">
                      Amount: Rs.{" "}
                      {selectedMatch.po_price.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Goods Receipt
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-bold">{selectedMatch.grn_number}</p>
                    <p className="text-sm text-muted-foreground">
                      Qty: {selectedMatch.grn_qty}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      Invoice
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-bold">{selectedMatch.invoice_number}</p>
                    <p className="text-sm text-muted-foreground">
                      Amount: Rs.{" "}
                      {selectedMatch.invoice_price.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Variance Analysis</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Price Variance</p>
                    <p
                      className={`font-bold ${
                        selectedMatch.price_variance > 0
                          ? "text-destructive"
                          : "text-green-600"
                      }`}
                    >
                      Rs.{" "}
                      {selectedMatch.price_variance.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Match Status</p>
                    {getStatusBadge(selectedMatch.match_status)}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                {selectedMatch.match_status === "matched" && (
                  <Button
                    onClick={() => {
                      toast.success("Invoice approved for payment");
                      setDetailDialogOpen(false);
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve for Payment
                  </Button>
                )}
                {(selectedMatch.match_status === "qty_mismatch" ||
                  selectedMatch.match_status === "price_mismatch") && (
                  <Button variant="outline">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Override & Approve
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
