import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, Search, Plus, Eye, FileCheck } from "lucide-react";
import { format } from "date-fns";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { useGoodsReceiptNotes } from "@/hooks/useAccountingData";
import { GoodsReceiptForm } from "./GoodsReceiptForm";

export const GoodsReceiptNoteView = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);

  const { data: grns = [], isLoading } = useGoodsReceiptNotes();

  const filteredGRNs = grns.filter((grn: any) => {
    const matchesSearch =
      grn.grn_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grn.vendors?.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grn.purchase_orders?.po_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || grn.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      received: "default",
      pending: "secondary",
      partially_received: "outline",
      inspected: "default",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status?.replace("_", " ").toUpperCase()}</Badge>;
  };

  // Summary stats
  const totalGRNs = grns.length;
  const thisMonthGRNs = grns.filter((g: any) => {
    const date = new Date(g.receipt_date);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;
  const totalValue = grns.reduce((sum: number, g: any) => sum + (g.total_value || 0), 0);
  const pendingInspection = grns.filter((g: any) => g.status === "pending").length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Goods Receipt Notes
            </CardTitle>
            <CardDescription>
              Record and manage goods received against purchase orders
            </CardDescription>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New GRN
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Total GRNs</p>
              <p className="text-2xl font-bold">{totalGRNs}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-2xl font-bold">{thisMonthGRNs}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold">
                <CurrencyDisplay amount={totalValue} />
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Pending Inspection</p>
              <p className="text-2xl font-bold">{pendingInspection}</p>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by GRN number, vendor, or PO..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inspected">Inspected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* GRN Table */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredGRNs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No goods receipt notes found
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>GRN Number</TableHead>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Receipt Date</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGRNs.map((grn: any) => (
                    <TableRow key={grn.id}>
                      <TableCell className="font-mono font-medium">
                        {grn.grn_number}
                      </TableCell>
                      <TableCell>
                        {grn.purchase_orders?.po_number || "-"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{grn.vendors?.vendor_name || "N/A"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(grn.receipt_date), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        <CurrencyDisplay amount={grn.total_value || 0} />
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(grn.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {grn.status === "received" && (
                            <Button size="sm" variant="outline">
                              <FileCheck className="h-4 w-4 mr-1" />
                              Inspect
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* GRN Form Dialog */}
      <GoodsReceiptForm open={showForm} onOpenChange={setShowForm} />
    </div>
  );
};
