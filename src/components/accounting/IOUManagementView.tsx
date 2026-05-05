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
  AlertTriangle, CheckCircle, Clock, Loader2, Printer, Trash2
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useIOURecords, useCreateIOU, useUpdateIOU, IOURecord, usePettyCashFunds } from "@/hooks/usePettyCash";
import { BUSINESS_UNITS } from "@/hooks/useExpenseRequests";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { FinanceDocumentPreviewModal } from "./shared/FinanceDocumentPreviewModal";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChartOfAccounts, useBankAccounts } from "@/hooks/useAccountingData";
import { DeleteIOUDialog } from "./petty-cash/DeleteIOUDialog";

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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [iouToDelete, setIouToDelete] = useState<IOURecord | null>(null);
  const [settleAmount, setSettleAmount] = useState(0);
  const [expenseAmount, setExpenseAmount] = useState(0);
  const [previewData, setPreviewData] = useState<any>(null);

  // New IOU form state
  const [newStaffName, setNewStaffName] = useState("");
  const [newAmount, setNewAmount] = useState(0);
  const [newPurpose, setNewPurpose] = useState("");
  const [newIssuedDate, setNewIssuedDate] = useState(new Date().toISOString().split("T")[0]);
  const [newDueDate, setNewDueDate] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [sourceType, setSourceType] = useState<"petty_cash" | "bank">("petty_cash");
  const [newFundId, setNewFundId] = useState<string>("");
  const [newBankAccountId, setNewBankAccountId] = useState<string>("");

  // Settlement Form State
  const [settlementType, setSettlementType] = useState<"expense" | "cash_return" | "mixed">("cash_return");
  const [expenseAccountId, setExpenseAccountId] = useState<string>("");
  const [returnSourceType, setReturnSourceType] = useState<"petty_cash" | "bank">("petty_cash");
  const [returnFundId, setReturnFundId] = useState<string>("none");
  const [returnBankAccountId, setReturnBankAccountId] = useState<string>("none");

  const { data: ious, isLoading, refetch } = useIOURecords({ status: statusFilter });
  const { data: pettyCashFunds } = usePettyCashFunds();
  const { data: bankAccounts } = useBankAccounts();
  const { data: accounts } = useChartOfAccounts();
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
    const matchedStaff = staff?.find(s => s.staff_name === newStaffName);
    await createIOU.mutateAsync({
      staff_id: matchedStaff ? matchedStaff.id : undefined,
      staff_name_draft: matchedStaff ? undefined : newStaffName,
      amount: newAmount,
      purpose: newPurpose,
      issued_date: newIssuedDate || undefined,
      due_date: newDueDate || undefined,
      business_unit_code: newUnit,
      petty_cash_fund_id: sourceType === "petty_cash" ? newFundId : undefined,
      bank_account_id: sourceType === "bank" ? newBankAccountId : undefined,
    });
    setShowCreateIOU(false);
    setNewStaffName("");
    setNewAmount(0);
    setNewPurpose("");
    setNewIssuedDate(new Date().toISOString().split("T")[0]);
    setNewDueDate("");
    setNewUnit("");
    setNewFundId("");
    setNewBankAccountId("");
  };

  const openSettleDialog = (iou: IOURecord) => {
    setSelectedIOU(iou);
    setSettleAmount(iou.balance);
    setExpenseAmount(iou.balance);
    setSettlementType("cash_return");
    setExpenseAccountId("");
    if (iou.petty_cash_fund_id) {
      setReturnSourceType("petty_cash");
      setReturnFundId(iou.petty_cash_fund_id);
    } else if (iou.bank_account_id) {
      setReturnSourceType("bank");
      setReturnBankAccountId(iou.bank_account_id);
    } else {
      setReturnSourceType("petty_cash");
      setReturnFundId("none");
    }
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
      settlement_type: settlementType,
      expense_account_id: expenseAccountId || undefined,
      return_fund_id: returnSourceType === "petty_cash" && returnFundId !== "none" ? returnFundId : undefined,
      return_bank_account_id: returnSourceType === "bank" && returnBankAccountId !== "none" ? returnBankAccountId : undefined,
      expense_amount: settlementType === "cash_return" ? undefined : expenseAmount,
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
                        {iou.staff?.staff_name || iou.staff_name_draft || "-"}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => {
                            setIouToDelete(iou);
                            setShowDeleteDialog(true);
                          }}
                          title="Reverse & Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
              <Label>Payee / Staff Member</Label>
              <Input
                list="staff-list"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                placeholder="Type name or select from list..."
              />
              <datalist id="staff-list">
                {staff?.map((s) => (
                  <option key={s.id} value={s.staff_name} />
                ))}
              </datalist>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Advance Source Type</Label>
                <Select value={sourceType} onValueChange={(val: any) => setSourceType(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="petty_cash">Petty Cash Float</SelectItem>
                    <SelectItem value="bank">Bank Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {sourceType === "petty_cash" && pettyCashFunds && pettyCashFunds.length > 0 && (
                <div>
                  <Label>Source Float <span className="text-destructive">*</span></Label>
                  <Select value={newFundId} onValueChange={setNewFundId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select float..." />
                    </SelectTrigger>
                    <SelectContent>
                      {pettyCashFunds.map((fund) => (
                        <SelectItem key={fund.id} value={fund.id}>
                          {fund.fund_name} (Bal: LKR {(fund.current_balance || 0).toLocaleString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {sourceType === "bank" && bankAccounts && bankAccounts.length > 0 && (
                <div>
                  <Label>Source Bank <span className="text-destructive">*</span></Label>
                  <Select value={newBankAccountId} onValueChange={setNewBankAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank..." />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.bank_name} - {account.account_name} (Bal: LKR {(account.current_balance || 0).toLocaleString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Issued Date</Label>
                <Input
                  type="date"
                  value={newIssuedDate}
                  onChange={(e) => setNewIssuedDate(e.target.value)}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateIOU(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateIOU}
              disabled={!newStaffName || !newUnit || newAmount <= 0 || (sourceType === "petty_cash" ? !newFundId : !newBankAccountId) || createIOU.isPending}
            >
              {createIOU.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Issue IOU
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settle IOU Dialog */}
      <Dialog open={showSettleDialog} onOpenChange={setShowSettleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Settle IOU</DialogTitle>
          </DialogHeader>
          {selectedIOU && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 p-3 rounded-md">
                <div>
                  <p className="text-muted-foreground text-xs">IOU Number</p>
                  <p className="font-mono font-semibold">{selectedIOU.iou_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Payee</p>
                  <p className="font-semibold">{selectedIOU.staff?.staff_name || selectedIOU.staff_name_draft || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Total Amount</p>
                  <p className="font-semibold"><CurrencyDisplay amount={selectedIOU.amount} /></p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Outstanding Balance</p>
                  <p className="font-semibold text-destructive"><CurrencyDisplay amount={selectedIOU.balance} /></p>
                </div>
              </div>

              <div>
                <Label>Settlement Type</Label>
                <Select value={settlementType} onValueChange={(val: any) => setSettlementType(val)}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash_return">Cash Return (Refund to Float/Bank)</SelectItem>
                    <SelectItem value="expense">Expense Receipts (Spent)</SelectItem>
                    <SelectItem value="mixed">Mixed (Cash + Expense)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Advance Cleared (LKR)</Label>
                <Input
                  type="number"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(parseFloat(e.target.value) || 0)}
                  className="text-lg font-semibold mt-1"
                  max={selectedIOU.balance}
                />
                <p className="text-xs text-muted-foreground mt-1">Amount of the IOU advance being settled.</p>
                {settleAmount < selectedIOU.balance && settleAmount > 0 && (
                  <p className="text-xs text-blue-600 mt-1">
                    Partial settlement — remaining balance: LKR {(selectedIOU.balance - settleAmount).toLocaleString()}
                  </p>
                )}
                {settleAmount > selectedIOU.balance && (
                  <p className="text-xs text-destructive mt-1">Amount exceeds outstanding balance</p>
                )}
              </div>

              {(settlementType === "expense" || settlementType === "mixed") && (
                <div className="bg-muted/30 p-3 rounded-md border mt-2">
                  <Label>Actual Expense Receipts (LKR)</Label>
                  <Input
                    type="number"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(parseFloat(e.target.value) || 0)}
                    className="text-lg font-semibold mt-1 border-primary"
                  />
                  {settlementType === "mixed" && settleAmount > expenseAmount && (
                    <p className="text-xs text-blue-600 mt-1 font-medium">
                      Underspend: Employee owes LKR {(settleAmount - expenseAmount).toLocaleString()} back.
                    </p>
                  )}
                  {settlementType === "mixed" && settleAmount < expenseAmount && (
                    <p className="text-xs text-destructive mt-1 font-medium">
                      Overspend: We owe employee LKR {(expenseAmount - settleAmount).toLocaleString()} extra.
                    </p>
                  )}
                </div>
              )}

              {(settlementType === "expense" || settlementType === "mixed") && (
                <div>
                  <Label>Expense Account (GL) <span className="text-destructive">*</span></Label>
                  <Select value={expenseAccountId} onValueChange={setExpenseAccountId}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Select expense account..." />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts?.filter(a => a.account_type === "expense").map(account => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.account_code} - {account.account_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(settlementType === "cash_return" || settlementType === "mixed") && (
                <div className="grid grid-cols-2 gap-4 border p-3 rounded-md mt-2">
                  <div>
                    <Label>Return Advance Source</Label>
                    <Select value={returnSourceType} onValueChange={(val: any) => setReturnSourceType(val)}>
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="petty_cash">Petty Cash Float</SelectItem>
                        <SelectItem value="bank">Bank Account</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {returnSourceType === "petty_cash" && pettyCashFunds && pettyCashFunds.length > 0 && (
                    <div>
                      <Label>Return to Petty Cash Float</Label>
                      <Select value={returnFundId} onValueChange={setReturnFundId}>
                        <SelectTrigger className="w-full mt-1">
                          <SelectValue placeholder="Select float to return cash to..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None (General GL)</SelectItem>
                          {pettyCashFunds.map((fund) => (
                            <SelectItem key={fund.id} value={fund.id}>
                              {fund.fund_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {returnSourceType === "bank" && bankAccounts && bankAccounts.length > 0 && (
                    <div>
                      <Label>Return to Bank Account</Label>
                      <Select value={returnBankAccountId} onValueChange={setReturnBankAccountId}>
                        <SelectTrigger className="w-full mt-1">
                          <SelectValue placeholder="Select bank to return cash to..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None (General GL)</SelectItem>
                          {bankAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.bank_name} - {account.account_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1 col-span-2">
                    Select the target if the cash is physically returned to a petty cash box or deposited to a bank.
                  </p>
                </div>
              )}

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
              disabled={
                settleAmount <= 0 || 
                (selectedIOU ? settleAmount > selectedIOU.balance : true) || 
                updateIOU.isPending ||
                ((settlementType === "expense" || settlementType === "mixed") && !expenseAccountId)
              }
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

      {/* Delete / Reverse IOU Dialog */}
      <DeleteIOUDialog
        iou={iouToDelete}
        open={showDeleteDialog}
        onOpenChange={(open) => {
          setShowDeleteDialog(open);
          if (!open) setIouToDelete(null);
        }}
      />
    </div>
  );
};
