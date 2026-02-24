import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wallet, Plus, RefreshCw, ArrowDownCircle, ArrowUpCircle, 
  User, Building2, Loader2, Eye
} from "lucide-react";
import { format } from "date-fns";
import { 
  usePettyCashFunds, 
  usePettyCashTransactions, 
  useCreatePettyCashFund,
  useCreatePettyCashTransaction,
  PettyCashFund 
} from "@/hooks/usePettyCash";
import { BUSINESS_UNITS } from "@/hooks/useExpenseRequests";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const PettyCashView = () => {
  const [showCreateFund, setShowCreateFund] = useState(false);
  const [showTransaction, setShowTransaction] = useState(false);
  const [selectedFund, setSelectedFund] = useState<PettyCashFund | null>(null);
  const [transactionType, setTransactionType] = useState<"disbursement" | "replenishment">("replenishment");
  const [transactionAmount, setTransactionAmount] = useState(0);
  const [transactionDescription, setTransactionDescription] = useState("");

  // New fund form state
  const [newFundName, setNewFundName] = useState("");
  const [newFundUnit, setNewFundUnit] = useState("");
  const [newFundBalance, setNewFundBalance] = useState(0);
  const [newFundCustodian, setNewFundCustodian] = useState("");

  const { data: funds, isLoading, refetch } = usePettyCashFunds();
  const { data: transactions } = usePettyCashTransactions(selectedFund?.id);
  const createFund = useCreatePettyCashFund();
  const createTransaction = useCreatePettyCashTransaction();

  // Fetch staff for custodian selection
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

  const handleCreateFund = async () => {
    await createFund.mutateAsync({
      fund_name: newFundName,
      business_unit_code: newFundUnit,
      opening_balance: newFundBalance,
      custodian_id: newFundCustodian || undefined,
    });
    setShowCreateFund(false);
    setNewFundName("");
    setNewFundUnit("");
    setNewFundBalance(0);
    setNewFundCustodian("");
  };

  const handleTransaction = async () => {
    if (!selectedFund) return;
    
    await createTransaction.mutateAsync({
      petty_cash_fund_id: selectedFund.id,
      transaction_type: transactionType,
      amount: transactionAmount,
      description: transactionDescription,
    });
    
    setShowTransaction(false);
    setTransactionAmount(0);
    setTransactionDescription("");
    refetch();
  };

  const openTransaction = (fund: PettyCashFund, type: "disbursement" | "replenishment") => {
    setSelectedFund(fund);
    setTransactionType(type);
    setShowTransaction(true);
  };

  const totalFunds = funds?.reduce((sum, f) => sum + f.current_balance, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6" />
            Petty Cash Management
          </h2>
          <p className="text-muted-foreground">
            Manage petty cash funds and track disbursements
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setShowCreateFund(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Fund
          </Button>
        </div>
      </div>

      {/* Summary */}
      <Card className="p-6 bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Petty Cash Balance</p>
            <p className="text-3xl font-bold">
              <CurrencyDisplay amount={totalFunds} />
            </p>
          </div>
          <Wallet className="h-12 w-12 text-primary opacity-50" />
        </div>
      </Card>

      {/* Funds Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <Card className="p-8 col-span-full flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </Card>
        ) : funds?.length === 0 ? (
          <Card className="p-8 col-span-full text-center text-muted-foreground">
            No petty cash funds created yet
          </Card>
        ) : (
          funds?.map((fund) => (
            <Card key={fund.id} className="p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold">{fund.fund_name}</h3>
                  <Badge variant="outline" className="mt-1">
                    {fund.business_unit_code}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    <CurrencyDisplay amount={fund.current_balance} />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Opening: <CurrencyDisplay amount={fund.opening_balance} />
                  </p>
                </div>
              </div>
              
              {fund.custodian && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <User className="h-4 w-4" />
                  {fund.custodian.staff_name}
                </div>
              )}
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => openTransaction(fund, "disbursement")}
                >
                  <ArrowDownCircle className="h-4 w-4 mr-1 text-red-500" />
                  Disburse
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => openTransaction(fund, "replenishment")}
                >
                  <ArrowUpCircle className="h-4 w-4 mr-1 text-green-500" />
                  Replenish
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setSelectedFund(fund)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Transaction History */}
      {selectedFund && transactions && (
        <Card>
          <div className="p-4 border-b">
            <h3 className="font-semibold">
              Transaction History - {selectedFund.fund_name}
            </h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance After</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No transactions yet
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell>{format(new Date(txn.created_at), "MMM dd, yyyy HH:mm")}</TableCell>
                    <TableCell>
                      <Badge variant={txn.transaction_type === "replenishment" ? "default" : "secondary"}>
                        {txn.transaction_type === "replenishment" ? (
                          <ArrowUpCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowDownCircle className="h-3 w-3 mr-1" />
                        )}
                        {txn.transaction_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{txn.description || "-"}</TableCell>
                    <TableCell className={`text-right font-semibold ${
                      txn.transaction_type === "replenishment" ? "text-green-600" : "text-red-600"
                    }`}>
                      {txn.transaction_type === "replenishment" ? "+" : "-"}
                      <CurrencyDisplay amount={txn.amount} />
                    </TableCell>
                    <TableCell className="text-right">
                      <CurrencyDisplay amount={txn.balance_after} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create Fund Dialog */}
      <Dialog open={showCreateFund} onOpenChange={setShowCreateFund}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Petty Cash Fund</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Fund Name</Label>
              <Input
                value={newFundName}
                onChange={(e) => setNewFundName(e.target.value)}
                placeholder="e.g., Main Office Petty Cash"
              />
            </div>
            <div>
              <Label>Business Unit</Label>
              <Select value={newFundUnit} onValueChange={setNewFundUnit}>
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
              <Label>Opening Balance (LKR)</Label>
              <Input
                type="number"
                value={newFundBalance}
                onChange={(e) => setNewFundBalance(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>Custodian</Label>
              <Select value={newFundCustodian} onValueChange={setNewFundCustodian}>
                <SelectTrigger>
                  <SelectValue placeholder="Select custodian" />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateFund(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateFund}
              disabled={!newFundName || !newFundUnit || createFund.isPending}
            >
              {createFund.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Fund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Dialog */}
      <Dialog open={showTransaction} onOpenChange={setShowTransaction}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {transactionType === "replenishment" ? "Replenish Fund" : "Record Disbursement"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Fund</Label>
              <Input value={selectedFund?.fund_name || ""} disabled />
            </div>
            <div>
              <Label>Current Balance</Label>
              <Input 
                value={`Rs ${selectedFund?.current_balance.toLocaleString()}`} 
                disabled 
              />
            </div>
            <div>
              <Label>Amount (LKR)</Label>
              <Input
                type="number"
                value={transactionAmount}
                onChange={(e) => setTransactionAmount(parseFloat(e.target.value) || 0)}
                className="text-lg font-semibold"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={transactionDescription}
                onChange={(e) => setTransactionDescription(e.target.value)}
                placeholder="Brief description..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransaction(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleTransaction}
              disabled={transactionAmount <= 0 || createTransaction.isPending}
              variant={transactionType === "replenishment" ? "default" : "secondary"}
            >
              {createTransaction.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {transactionType === "replenishment" ? (
                <>
                  <ArrowUpCircle className="h-4 w-4 mr-2" />
                  Replenish
                </>
              ) : (
                <>
                  <ArrowDownCircle className="h-4 w-4 mr-2" />
                  Disburse
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
