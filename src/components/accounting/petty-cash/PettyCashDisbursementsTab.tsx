import { useState, useRef, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDownCircle, Plus, Loader2, FileText } from "lucide-react";
import { format } from "date-fns";
import { 
  usePettyCashFunds, useAllPettyCashTransactions, useCreatePettyCashTransaction,
  PettyCashFund
} from "@/hooks/usePettyCash";
import { useAllProfiles } from "@/hooks/useAccountingData";
import { EXPENSE_CATEGORIES, BUSINESS_UNITS, useCompanyExpenseCategories } from "@/hooks/useExpenseRequests";
import { useQuery } from "@tanstack/react-query";
import { CurrencyDisplay } from "../shared/CurrencyDisplay";
import { SearchableAccountSelector } from "../shared/SearchableAccountSelector";
import { FinanceDocumentPreviewModal } from "../shared/FinanceDocumentPreviewModal";
import { Printer, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const PettyCashDisbursementsTab = () => {
  const filteredCategories = useCompanyExpenseCategories();
  const [showForm, setShowForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [previewData, setPreviewData] = useState<any>(null);
  const submitLock = useRef(false);

  const { data: funds } = usePettyCashFunds();
  const { data: transactions, isLoading } = useAllPettyCashTransactions({ 
    transactionType: "disbursement",
    category: filterCategory,
    status: filterStatus,
  });
  const { data: profiles } = useAllProfiles();
  const createTransaction = useCreatePettyCashTransaction();

  const getCreatorName = (userId: string | null) => {
    if (!userId) return "System";
    const profile = profiles?.find((p: any) => p.user_id === userId || p.id === userId);
    if (profile) return `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Unknown User";
    return userId.substring(0, 8);
  };

  interface DisbursementLine {
    id: string;
    expense_category: string;
    gl_account_id: string;
    amount: number;
    description: string;
    vehicle_no: string;
  }

  // Form state
  const [form, setForm] = useState({
    petty_cash_fund_id: "",
    payee_name: "",
    transaction_date: new Date().toISOString().split("T")[0],
    reference_number: "",
    payment_method: "cash",
  });

  const [lines, setLines] = useState<DisbursementLine[]>([{
    id: "1", expense_category: "", gl_account_id: "", amount: 0, description: "", vehicle_no: ""
  }]);

  // Fetch buses for vehicle selection
  const { data: buses } = useQuery({
    queryKey: ["buses-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buses")
        .select("id, bus_no, vehicle_type")
        .eq("status", "Active")
        .order("bus_no");
      if (error) throw error;
      return data;
    },
  });

  const selectedFund = funds?.find((f) => f.id === form.petty_cash_fund_id);
  const totalAmount = lines.reduce((sum, line) => sum + (line.amount || 0), 0);

  const resetForm = () => {
    setForm({
      petty_cash_fund_id: "", payee_name: "", transaction_date: new Date().toISOString().split("T")[0],
      reference_number: "", payment_method: "cash",
    });
    setLines([{ id: "1", expense_category: "", gl_account_id: "", amount: 0, description: "", vehicle_no: "" }]);
  };

  const handleSubmit = async () => {
    if (!form.petty_cash_fund_id || totalAmount <= 0) return;
    if (submitLock.current) return;
    submitLock.current = true;

    try {
      const needsApproval = selectedFund && selectedFund.approval_required_above > 0 && totalAmount > selectedFund.approval_required_above;

      const { data: voucherNum } = await supabase.rpc("generate_petty_cash_voucher_number");

      for (const line of lines) {
        if (line.amount <= 0) continue;
        
        await createTransaction.mutateAsync({
          petty_cash_fund_id: form.petty_cash_fund_id,
          transaction_type: "disbursement",
          amount: line.amount,
          description: line.description || undefined,
          payee_name: form.payee_name,
          expense_category: line.expense_category || undefined,
          gl_account_id: line.gl_account_id || undefined,
          vehicle_no: line.vehicle_no || undefined,
          reference_number: form.reference_number || undefined,
          payment_method: form.payment_method,
          status: needsApproval ? "pending" : "approved",
          voucher_number: voucherNum || undefined,
          branch_id: selectedFund?.branch_id || undefined,
          created_at: new Date(form.transaction_date).toISOString(),
        } as any);
      }

      setShowForm(false);
      resetForm();
    } finally {
      submitLock.current = false;
    }
  };

  const getCategoryLabel = (value: string) => {
    return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label || value;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "default";
      case "pending": return "secondary";
      case "rejected": return "destructive";
      case "void": return "outline";
      default: return "secondary";
    }
  };

  const groupedTransactions = useMemo(() => {
    if (!transactions) return [];
    
    const map = new Map<string, any>();
    
    for (const txn of transactions) {
      const key = txn.voucher_number || txn.id;
      if (!map.has(key)) {
        map.set(key, { ...txn, lines: [txn] });
      } else {
        const existing = map.get(key);
        existing.amount += txn.amount;
        existing.lines.push(txn);
        if (existing.expense_category !== txn.expense_category) {
          existing.expense_category_display = "Multiple";
        }
      }
    }
    
    return Array.from(map.values());
  }, [transactions]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {filteredCategories.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="void">Void</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" /> New Petty Cash Voucher
        </Button>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Voucher #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Fund</TableHead>
              <TableHead>Payee</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell>
              </TableRow>
            ) : groupedTransactions?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No vouchers found</TableCell>
              </TableRow>
            ) : (
              groupedTransactions?.map((txn) => (
                <TableRow key={txn.id}>
                  <TableCell className="font-mono text-sm">{txn.voucher_number || "-"}</TableCell>
                  <TableCell>{format(new Date(txn.created_at), "MMM dd, yyyy")}</TableCell>
                  <TableCell>{txn.fund?.fund_name || "-"}</TableCell>
                  <TableCell>{txn.payee_name || "-"}</TableCell>
                  <TableCell>
                    {txn.expense_category_display === "Multiple" ? (
                      <Badge variant="outline">Multiple Categories</Badge>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <span>{txn.expense_category ? getCategoryLabel(txn.expense_category) : "-"}</span>
                        {txn.vehicle_no && <Badge variant="secondary" className="w-fit text-[10px] h-4 px-1">{txn.vehicle_no}</Badge>}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-destructive">
                    <CurrencyDisplay amount={txn.amount} />
                  </TableCell>
                  <TableCell><Badge variant="outline">{txn.payment_method || "cash"}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(txn.status || "approved") as any}>
                      {txn.status || "approved"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {getCreatorName(txn.created_by)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{txn.reference_number || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setPreviewData(txn)}>
                      <Printer className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Disbursement Form Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) resetForm(); setShowForm(o); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5 text-destructive" />
              Record Petty Cash Voucher
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Select Fund *</Label>
              <Select value={form.petty_cash_fund_id} onValueChange={(v) => setForm({ ...form, petty_cash_fund_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select fund" /></SelectTrigger>
                <SelectContent>
                  {funds?.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.fund_name} — Balance: Rs {f.current_balance.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedFund && (
                <p className="text-xs text-muted-foreground mt-1">
                  Current Balance: Rs {selectedFund.current_balance.toLocaleString()}
                  {selectedFund.approval_required_above > 0 && ` | Approval needed above Rs ${selectedFund.approval_required_above.toLocaleString()}`}
                </p>
              )}
            </div>
            <div>
              <Label>Voucher Number</Label>
              <Input value="Auto-generated" disabled className="text-muted-foreground" />
            </div>
            <div>
              <Label>Payee Name *</Label>
              <Input value={form.payee_name} onChange={(e) => setForm({ ...form, payee_name: e.target.value })} placeholder="Who received the money" />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reference Number</Label>
              <Input value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} placeholder="External ref" />
            </div>
            
            <div className="md:col-span-2 border rounded-md p-4 space-y-4 bg-muted/20">
              <div className="flex justify-between items-center mb-2">
                <Label className="text-base font-semibold">Voucher Lines</Label>
                <Button variant="outline" size="sm" onClick={() => setLines([...lines, { id: Date.now().toString(), expense_category: "", gl_account_id: "", amount: 0, description: "" }])}>
                  <Plus className="h-4 w-4 mr-2" /> Add Line
                </Button>
              </div>
              
              {lines.map((line, index) => (
                <div key={line.id} className="grid gap-3 md:grid-cols-12 items-start border-b pb-4 last:border-0 last:pb-0">
                  <div className="md:col-span-3 space-y-2">
                    <Label className="text-xs">Category</Label>
                    <Select value={line.expense_category || "none"} onValueChange={(v) => {
                      const newLines = [...lines];
                      newLines[index].expense_category = v === "none" ? "" : v;
                      setLines(newLines);
                    }}>
                      <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Category</SelectItem>
                        {filteredCategories.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {["fuel", "vehicle_hire", "repairs", "tyre", "body_wash", "emission", "temp_permits", "permits_renewal", "police_fines", "log_sheet", "ntc_charges", "accident"].includes(line.expense_category) && (
                      <div className="mt-2">
                        <Select 
                          value={line.vehicle_no || "none"} 
                          onValueChange={(v) => {
                            const newLines = [...lines];
                            newLines[index].vehicle_no = v === "none" ? "" : v;
                            setLines(newLines);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Vehicle (Optional)" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Vehicle</SelectItem>
                            {buses?.map((bus) => (
                              <SelectItem key={bus.id} value={bus.bus_no}>
                                {bus.bus_no} {bus.vehicle_type ? `(${bus.vehicle_type})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-3 space-y-2">
                    <Label className="text-xs">GL Account</Label>
                    <SearchableAccountSelector 
                      value={line.gl_account_id} 
                      onValueChange={(v) => {
                        const newLines = [...lines];
                        newLines[index].gl_account_id = v;
                        setLines(newLines);
                      }} 
                      placeholder="GL Account" 
                    />
                  </div>
                  <div className="md:col-span-3 space-y-2">
                    <Label className="text-xs">Description</Label>
                    <Input 
                      value={line.description} 
                      onChange={(e) => {
                        const newLines = [...lines];
                        newLines[index].description = e.target.value;
                        setLines(newLines);
                      }} 
                      placeholder="Details" 
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-xs">Amount</Label>
                    <Input 
                      type="number" 
                      value={line.amount || ""} 
                      onChange={(e) => {
                        const newLines = [...lines];
                        newLines[index].amount = parseFloat(e.target.value) || 0;
                        setLines(newLines);
                      }}
                    />
                  </div>
                  <div className="md:col-span-1 text-right pt-6">
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => {
                      if (lines.length > 1) {
                        setLines(lines.filter(l => l.id !== line.id));
                      }
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <div className="flex justify-between items-center pt-2">
                <div>
                  {selectedFund && totalAmount > selectedFund.current_balance && (
                    <p className="text-xs text-destructive font-medium">Amount exceeds fund balance!</p>
                  )}
                  {selectedFund && selectedFund.approval_required_above > 0 && totalAmount > selectedFund.approval_required_above && (
                    <p className="text-xs text-amber-600 font-medium">⚠ This will require approval</p>
                  )}
                </div>
                <div className="text-lg font-bold">
                  Total: LKR {totalAmount.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
            <Button 
              onClick={handleSubmit}
              disabled={!form.petty_cash_fund_id || !form.payee_name || totalAmount <= 0 || createTransaction.isPending || (selectedFund ? totalAmount > selectedFund.current_balance : false)}
              variant="destructive"
            >
              {createTransaction.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <ArrowDownCircle className="h-4 w-4 mr-2" />
              Issue Voucher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Print Document Modal */}
      <FinanceDocumentPreviewModal
        open={!!previewData}
        onOpenChange={(op) => !op && setPreviewData(null)}
        documentType="petty_cash_voucher"
        documentData={previewData}
      />
    </div>
  );
};

