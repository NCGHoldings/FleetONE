import { useState } from "react";
import { Card } from "@/components/ui/card";
import { CreateLandedCostVoucherModal } from "./CreateLandedCostVoucherModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, MoreHorizontal, DollarSign, FileText, TrendingUp } from "lucide-react";
import { useLandedCostVouchers, usePostLandedCostToGL } from "@/hooks/useInventoryEnhanced";
import { CurrencyDisplay } from "@/components/accounting/shared/CurrencyDisplay";
import { RelatedJournalEntries } from "@/components/accounting/shared/RelatedJournalEntries";
import { format } from "date-fns";

export const LandedCostView = () => {
  const [statusFilter, setStatusFilter] = useState<string>("_all");
  const [searchTerm, setSearchTerm] = useState("");
  const [postConfirmVoucherId, setPostConfirmVoucherId] = useState<string | null>(null);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  
  const { data: vouchers, isLoading } = useLandedCostVouchers(statusFilter === "_all" ? undefined : statusFilter);
  const postToGL = usePostLandedCostToGL();

  const filteredVouchers = vouchers?.filter(v => 
    v.voucher_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.goods_receipt_notes?.grn_number?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const totalAdditionalCost = vouchers?.reduce((sum, v) => sum + (v.total_additional_cost || 0), 0) || 0;
  const postedVouchers = vouchers?.filter(v => v.status === "posted").length || 0;
  const draftVouchers = vouchers?.filter(v => v.status === "draft").length || 0;

  const selectedVoucher = vouchers?.find(v => v.id === selectedVoucherId);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "posted":
        return <Badge className="bg-green-500 hover:bg-green-600">Posted</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAllocationMethodLabel = (method: string) => {
    switch (method) {
      case "by_value":
        return "By Value";
      case "by_quantity":
        return "By Quantity";
      case "by_weight":
        return "By Weight";
      default:
        return method;
    }
  };

  const handlePostToGL = () => {
    if (!postConfirmVoucherId) return;
    postToGL.mutate(postConfirmVoucherId, {
      onSettled: () => setPostConfirmVoucherId(null),
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total Vouchers</p>
              <p className="text-2xl font-bold">{vouchers?.length || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Landed Costs</p>
              <p className="text-2xl font-bold">
                <CurrencyDisplay amount={totalAdditionalCost} />
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Posted</p>
              <p className="text-2xl font-bold">{postedVouchers}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Drafts</p>
              <p className="text-2xl font-bold">{draftVouchers}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <div className="flex gap-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vouchers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="posted">Posted</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Landed Cost Voucher
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading vouchers...</div>
        ) : filteredVouchers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No landed cost vouchers found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Voucher Number</TableHead>
                <TableHead>GRN Reference</TableHead>
                <TableHead>Posting Date</TableHead>
                <TableHead>Allocation Method</TableHead>
                <TableHead className="text-right">Additional Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVouchers.map((voucher) => (
                <TableRow key={voucher.id}>
                  <TableCell className="font-medium">{voucher.voucher_number}</TableCell>
                  <TableCell>{voucher.goods_receipt_notes?.grn_number || "-"}</TableCell>
                  <TableCell>
                    {format(new Date(voucher.posting_date), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>{getAllocationMethodLabel(voucher.allocation_method)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    <CurrencyDisplay amount={voucher.total_additional_cost || 0} />
                  </TableCell>
                  <TableCell>{getStatusBadge(voucher.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedVoucherId(voucher.id)}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>View Items</DropdownMenuItem>
                        <DropdownMenuItem>View Charges</DropdownMenuItem>
                        {voucher.status === "draft" && (
                          <>
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setPostConfirmVoucherId(voucher.id)}>
                              Post to GL
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Cancel</DropdownMenuItem>
                          </>
                        )}
                        {voucher.status === "posted" && voucher.journal_entry_id && (
                          <DropdownMenuItem onClick={() => setSelectedVoucherId(voucher.id)}>
                            View Journal Entry
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Related Journal Entries for selected posted voucher */}
      {selectedVoucher && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Voucher Details — {selectedVoucher.voucher_number}
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div><span className="text-muted-foreground">Status:</span> {getStatusBadge(selectedVoucher.status)}</div>
            <div><span className="text-muted-foreground">Allocation:</span> {getAllocationMethodLabel(selectedVoucher.allocation_method)}</div>
            <div><span className="text-muted-foreground">Total Additional Cost:</span> <CurrencyDisplay amount={selectedVoucher.total_additional_cost || 0} /></div>
            <div><span className="text-muted-foreground">GRN:</span> {selectedVoucher.goods_receipt_notes?.grn_number || "-"}</div>
          </div>
          {(selectedVoucher as any).journal_entry_id && (
            <RelatedJournalEntries sourceId={selectedVoucher.id} sourceType="ap_invoice" />
          )}
        </Card>
      )}

      {/* Post to GL Confirmation Dialog */}
      <AlertDialog open={!!postConfirmVoucherId} onOpenChange={(open) => !open && setPostConfirmVoucherId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Post Landed Cost to General Ledger?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a journal entry with the following double-entry:
              <br /><br />
              <strong>DR</strong> Inventory Account (increases item valuation)<br />
              <strong>CR</strong> Expense/Payable Account (per charge)<br /><br />
              Item standard costs will be updated with the final landed cost. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePostToGL} disabled={postToGL.isPending}>
              {postToGL.isPending ? "Posting..." : "Post to GL"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
