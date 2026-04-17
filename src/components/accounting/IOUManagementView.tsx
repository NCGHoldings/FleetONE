import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, Plus, RefreshCw, User, Calendar, 
  AlertTriangle, CheckCircle, Clock, Loader2, Printer
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useIOURecords, useCreateIOU, useUpdateIOU, IOURecord } from "@/hooks/usePettyCash";
import { BUSINESS_UNITS } from "@/hooks/useExpenseRequests";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { FinanceDocumentPreviewModal } from "./shared/FinanceDocumentPreviewModal";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const statusConfig = {
  pending: { label: "Pending", color: "bg-yellow-500", icon: Clock },
  partially_settled: { label: "Partial", color: "bg-blue-500", icon: Clock },
  settled: { label: "Settled", color: "bg-green-500", icon: CheckCircle },
  overdue: { label: "Overdue", color: "bg-red-500", icon: AlertTriangle },
};

export const IOUManagementView = () => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateIOU, setShowCreateIOU] = useState(false);
  const [selectedIOU, setSelectedIOU] = useState<IOURecord | null>(null);
  const [showSettleDialog, setShowSettleDialog] = useState(false);
  const [settleAmount, setSettleAmount] = useState(0);
  const [previewData, setPreviewData] = useState<any>(null);

  // New IOU form state
  const [newStaffId, setNewStaffId] = useState("");
  const [newAmount, setNewAmount] = useState(0);
  const [newPurpose, setNewPurpose] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newUnit, setNewUnit] = useState("");

  const { data: ious, isLoading, refetch } = useIOURecords({ status: statusFilter });
  const createIOU = useCreateIOU();
  const updateIOU = useUpdateIOU();

  // Fetch staff
  const { data: staff } = useQuery({
    queryKey: ["staff-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_registry")
        .select("id, staff_name")
        .eq("is_active", true)
        .order("staff_name");
      if (error) throw error;
      return data;
    },
  });

  const handleCreateIOU = async () => {
    await createIOU.mutateAsync({
      staff_id: newStaffId,
      amount: newAmount,
      purpose: newPurpose,
      due_date: newDueDate || undefined,
      business_unit_code: newUnit,
    });
    setShowCreateIOU(false);
    setNewStaffId("");
    setNewAmount(0);
    setNewPurpose("");
    setNewDueDate("");
    setNewUnit("");
  };

  const openSettleDialog = (iou: IOURecord) => {
    setSelectedIOU(iou);
    setSettleAmount(iou.balance);
    setShowSettleDialog(true);
  };

  const handleSettle = async () => {
    if (!selectedIOU || settleAmount <= 0) return;
    const newSettledAmount = (selectedIOU.settled_amount || 0) + settleAmount;
    const newBalance = selectedIOU.amount - newSettledAmount;
    const newStatus = newBalance <= 0 ? "settled" : "partially_settled";
    
    await updateIOU.mutateAsync({
      id: selectedIOU.id,
      settled_amount: newSettledAmount,
      status: newStatus,
    });
    setShowSettleDialog(false);
    setSelectedIOU(null);
  };

  // Stats
  const stats = {
    total: ious?.length || 0,
    pending: ious?.filter((i) => i.status === "pending").length || 0,
    overdue: ious?.filter((i) => i.status === "overdue").length || 0,
    totalOutstanding: ious?.reduce((sum, i) => sum + i.balance, 0) || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            IOU Management
          </h2>
          <p className="text-muted-foreground">
            Track staff advances and settlements
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setShowCreateIOU(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Issue IOU
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total IOUs</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4 border-yellow-500/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>
        <Card className="p-4 border-red-500/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </Card>
        <Card className="p-4 border-primary/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Outstanding</p>
              <p className="text-2xl font-bold">
                <CurrencyDisplay amount={stats.totalOutstanding} />
              </p>
            </div>
            <FileText className="h-8 w-8 text-primary" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="partially_settled">Partially Settled</SelectItem>
              <SelectItem value="settled">Settled</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* IOU Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>IOU #</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : ious?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  No IOU records found
                </TableCell>
              </TableRow>
            ) : (
              ious?.map((iou) => {
                const config = statusConfig[iou.status as keyof typeof statusConfig];
                const StatusIcon = config?.icon || Clock;
                const progress = ((iou.amount - iou.balance) / iou.amount) * 100;
                const daysOverdue = iou.due_date 
                  ? differenceInDays(new Date(), new Date(iou.due_date)) 
                  : 0;
                
                return (
                  <TableRow key={iou.id}>
                    <TableCell className="font-mono text-sm">{iou.iou_number}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {iou.staff?.staff_name || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{iou.business_unit_code}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">{iou.purpose}</TableCell>
                    <TableCell>{format(new Date(iou.issued_date), "MMM dd")}</TableCell>
                    <TableCell>
                      {iou.due_date ? (
                        <div className="flex items-center gap-1">
                          {format(new Date(iou.due_date), "MMM dd")}
                          {daysOverdue > 0 && iou.status !== "settled" && (
                            <Badge variant="destructive" className="text-xs">
                              +{daysOverdue}d
                            </Badge>
                          )}
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <CurrencyDisplay amount={iou.amount} />
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      <CurrencyDisplay amount={iou.balance} />
                    </TableCell>
                    <TableCell className="w-[100px]">
                      <Progress value={progress} className="h-2" />
                    </TableCell>
                    <TableCell>
                      <Badge className={config?.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {config?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPreviewData(iou)}
                          title="Print / View"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        {iou.status !== "settled" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openSettleDialog(iou)}
                            disabled={updateIOU.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Settle
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create IOU Dialog */}
      <Dialog open={showCreateIOU} onOpenChange={setShowCreateIOU}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue New IOU</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Staff Member</Label>
              <Select value={newStaffId} onValueChange={setNewStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staff?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.staff_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Business Unit</Label>
              <Select value={newUnit} onValueChange={setNewUnit}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_UNITS.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount (LKR)</Label>
              <Input
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(parseFloat(e.target.value) || 0)}
                className="text-lg font-semibold"
              />
            </div>
            <div>
              <Label>Purpose</Label>
              <Textarea
                value={newPurpose}
                onChange={(e) => setNewPurpose(e.target.value)}
                placeholder="Reason for advance..."
                rows={2}
              />
            </div>
            <div>
              <Label>Due Date (Optional)</Label>
              <Input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateIOU(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateIOU}
              disabled={!newStaffId || !newUnit || newAmount <= 0 || createIOU.isPending}
            >
              {createIOU.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Issue IOU
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settle IOU Dialog */}
      <Dialog open={showSettleDialog} onOpenChange={setShowSettleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settle IOU</DialogTitle>
          </DialogHeader>
          {selectedIOU && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">IOU Number</p>
                  <p className="font-mono font-semibold">{selectedIOU.iou_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Staff</p>
                  <p className="font-semibold">{selectedIOU.staff?.staff_name || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Amount</p>
                  <p className="font-semibold"><CurrencyDisplay amount={selectedIOU.amount} /></p>
                </div>
                <div>
                  <p className="text-muted-foreground">Outstanding Balance</p>
                  <p className="font-semibold text-destructive"><CurrencyDisplay amount={selectedIOU.balance} /></p>
                </div>
              </div>
              <div>
                <Label>Settlement Amount (LKR)</Label>
                <Input
                  type="number"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(parseFloat(e.target.value) || 0)}
                  className="text-lg font-semibold"
                  max={selectedIOU.balance}
                />
                {settleAmount < selectedIOU.balance && settleAmount > 0 && (
                  <p className="text-xs text-blue-600 mt-1">
                    Partial settlement — remaining balance: LKR {(selectedIOU.balance - settleAmount).toLocaleString()}
                  </p>
                )}
                {settleAmount > selectedIOU.balance && (
                  <p className="text-xs text-destructive mt-1">Amount exceeds outstanding balance</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSettleAmount(selectedIOU.balance)}>
                  Full Settlement
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettleDialog(false)}>Cancel</Button>
            <Button
              onClick={handleSettle}
              disabled={settleAmount <= 0 || (selectedIOU ? settleAmount > selectedIOU.balance : true) || updateIOU.isPending}
            >
              {updateIOU.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <CheckCircle className="h-4 w-4 mr-1" />
              Confirm Settlement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Print Document Modal */}
      <FinanceDocumentPreviewModal
        open={!!previewData}
        onOpenChange={(op) => !op && setPreviewData(null)}
        documentType="iou_voucher"
        documentData={previewData}
      />
    </div>
  );
};
