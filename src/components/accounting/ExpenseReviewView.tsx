import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Receipt, Plus, Search, Filter, Eye, CheckCircle, 
  XCircle, FileText, Building2, Bus, Loader2, RefreshCw, BookOpen
} from "lucide-react";
import { format } from "date-fns";
import { useExpenseRequests, useUpdateExpenseRequest, EXPENSE_CATEGORIES, BUSINESS_UNITS, ExpenseRequest } from "@/hooks/useExpenseRequests";
import { useVendors } from "@/hooks/useAccountingData";
import { useExpenseRequestFinanceSettings, usePostExpenseRequestToGL, useExpenseGLMappings } from "@/hooks/useExpenseRequestFinance";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { ExpenseRequestForm } from "./ExpenseRequestForm";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  draft: "bg-gray-500",
  pending_finance: "bg-yellow-500",
  pending_approval: "bg-blue-500",
  approved: "bg-green-500",
  rejected: "bg-red-500",
  paid: "bg-emerald-600",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  pending_finance: "Pending Finance",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  paid: "Paid",
};

export const ExpenseReviewView = () => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [unitFilter, setUnitFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRequest | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewVendorId, setReviewVendorId] = useState("");

  const { data: expenses, isLoading, refetch } = useExpenseRequests({
    status: statusFilter,
    businessUnit: unitFilter,
  });
  const { data: vendors } = useVendors();
  const updateExpense = useUpdateExpenseRequest();

  // Finance integration
  const { data: expenseFinanceSettings } = useExpenseRequestFinanceSettings();
  const { data: expenseGLMappings } = useExpenseGLMappings();
  const postExpenseToGL = usePostExpenseRequestToGL();

  const filteredExpenses = expenses?.filter((exp) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        exp.request_number.toLowerCase().includes(search) ||
        exp.description?.toLowerCase().includes(search) ||
        exp.vendor_name_draft?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const getCategoryLabel = (value: string) => {
    return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label || value;
  };

  const getUnitLabel = (value: string) => {
    return BUSINESS_UNITS.find((u) => u.value === value)?.label || value;
  };

  const handleReview = (expense: ExpenseRequest) => {
    setSelectedExpense(expense);
    setReviewVendorId(expense.vendor_id || "");
    setShowReviewDialog(true);
  };

  const handleApprove = async () => {
    if (!selectedExpense) return;
    
    await updateExpense.mutateAsync({
      id: selectedExpense.id,
      vendor_id: reviewVendorId || undefined,
      status: "approved",
    });

    // Auto-post to GL if auto_post_on_approve is enabled and finance settings configured
    if ((expenseFinanceSettings as Record<string, any>)?.auto_post_on_approve && expenseGLMappings && selectedExpense.amount > 0) {
      postExpenseToGL.mutate({
        expense: {
          id: selectedExpense.id,
          requestNumber: selectedExpense.request_number,
          requestDate: selectedExpense.request_date,
          businessUnitCode: selectedExpense.business_unit_code || 'HQ',
          expenseCategory: selectedExpense.expense_category,
          description: selectedExpense.description || `Expense ${selectedExpense.request_number}`,
          amount: selectedExpense.amount,
          paymentMethod: selectedExpense.payment_method || 'bank',
          vendorName: selectedExpense.vendor?.vendor_name || selectedExpense.vendor_name_draft || undefined,
          vendorId: reviewVendorId || undefined,
          additionalDocs: selectedExpense.additional_docs,
        },
        settings: expenseFinanceSettings as Record<string, any>,
        mappings: expenseGLMappings || [],
      });
    }
    
    setShowReviewDialog(false);
    setSelectedExpense(null);
  };

  const handleReject = async () => {
    if (!selectedExpense) return;
    
    await updateExpense.mutateAsync({
      id: selectedExpense.id,
      status: "rejected",
    });
    
    setShowReviewDialog(false);
    setSelectedExpense(null);
  };

  const handlePassToApproval = async () => {
    if (!selectedExpense) return;
    
    await updateExpense.mutateAsync({
      id: selectedExpense.id,
      vendor_id: reviewVendorId || undefined,
      status: "pending_approval",
    });
    
    setShowReviewDialog(false);
    setSelectedExpense(null);
  };

  // Summary stats
  const stats = {
    total: expenses?.length || 0,
    pendingFinance: expenses?.filter((e) => e.status === "pending_finance").length || 0,
    pendingApproval: expenses?.filter((e) => e.status === "pending_approval").length || 0,
    approved: expenses?.filter((e) => e.status === "approved").length || 0,
    totalAmount: expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0,
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Requests</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Receipt className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4 border-yellow-500/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Finance</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pendingFinance}</p>
            </div>
            <FileText className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>
        <Card className="p-4 border-blue-500/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Approval</p>
              <p className="text-2xl font-bold text-blue-600">{stats.pendingApproval}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-4 border-green-500/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold text-green-600">
                <CurrencyDisplay amount={stats.totalAmount} />
              </p>
            </div>
            <Receipt className="h-8 w-8 text-green-600" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={unitFilter} onValueChange={setUnitFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Business Unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Units</SelectItem>
              {BUSINESS_UNITS.map((unit) => (
                <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Expense
          </Button>
        </div>
      </Card>

      {/* Expense Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>GL</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredExpenses?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No expense requests found
                </TableCell>
              </TableRow>
            ) : (
              filteredExpenses?.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-mono text-sm">{expense.request_number}</TableCell>
                  <TableCell>{format(new Date(expense.request_date), "MMM dd, yyyy")}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{expense.business_unit_code}</Badge>
                  </TableCell>
                  <TableCell>{getCategoryLabel(expense.expense_category)}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{expense.description}</TableCell>
                  <TableCell className="text-right font-semibold">
                    <CurrencyDisplay amount={expense.amount} />
                  </TableCell>
                  <TableCell>
                    {expense.vendor?.vendor_name || expense.vendor_name_draft || (
                      <span className="text-muted-foreground text-sm">Not assigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[expense.status]}>
                      {statusLabels[expense.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {expense.gl_posted ? (
                      <Badge variant="outline" className="text-xs text-green-600">Posted</Badge>
                    ) : expense.status === 'approved' && !expense.gl_posted ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-blue-600 h-7 text-xs"
                        disabled={postExpenseToGL.isPending}
                        onClick={() => {
                          if (expenseFinanceSettings && expenseGLMappings) {
                            postExpenseToGL.mutate({
                              expense: {
                                id: expense.id,
                                requestNumber: expense.request_number,
                                requestDate: expense.request_date,
                                businessUnitCode: expense.business_unit_code || 'HQ',
                                expenseCategory: expense.expense_category,
                                description: expense.description || `Expense ${expense.request_number}`,
                                amount: expense.amount,
                                paymentMethod: expense.payment_method || 'bank',
                                vendorName: expense.vendor?.vendor_name || expense.vendor_name_draft || undefined,
                                vendorId: expense.vendor_id || undefined,
                                additionalDocs: expense.additional_docs,
                              },
                              settings: expenseFinanceSettings as Record<string, any>,
                              mappings: expenseGLMappings || [],
                            });
                          } else {
                            toast.error('Configure Finance Settings first');
                          }
                        }}
                      >
                        <BookOpen className="h-3 w-3 mr-1" />Post GL
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleReview(expense)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {expense.status === "pending_finance" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-green-600"
                          onClick={() => handleReview(expense)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create Form Dialog */}
      <ExpenseRequestForm
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
      />

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Expense Request</DialogTitle>
          </DialogHeader>
          
          {selectedExpense && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Request #</p>
                  <p className="font-mono">{selectedExpense.request_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p>{format(new Date(selectedExpense.request_date), "MMM dd, yyyy")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Business Unit</p>
                  <p>{getUnitLabel(selectedExpense.business_unit_code)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Category</p>
                  <p>{getCategoryLabel(selectedExpense.expense_category)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Description</p>
                  <p>{selectedExpense.description}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Amount</p>
                  <p className="text-xl font-bold">
                    <CurrencyDisplay amount={selectedExpense.amount} />
                  </p>
                </div>
                {selectedExpense.vendor_name_draft && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Draft Vendor Name</p>
                    <p className="text-yellow-600">{selectedExpense.vendor_name_draft}</p>
                  </div>
                )}
              </div>

              {/* Vendor Assignment */}
              <div className="space-y-2">
                <Label>Assign Vendor</Label>
                <Select value={reviewVendorId} onValueChange={setReviewVendorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors?.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.vendor_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={updateExpense.isPending}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            {selectedExpense?.status === "pending_finance" && (
              <Button 
                variant="secondary" 
                onClick={handlePassToApproval}
                disabled={updateExpense.isPending}
              >
                Pass to Approval
              </Button>
            )}
            <Button 
              onClick={handleApprove}
              disabled={updateExpense.isPending}
            >
              {updateExpense.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
