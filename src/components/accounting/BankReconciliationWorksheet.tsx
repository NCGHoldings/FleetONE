import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  CheckCircle,
  XCircle,
  Link,
  RefreshCw,
  FileSpreadsheet,
  AlertCircle,
  Save,
} from "lucide-react";
import {
  useBankAccounts,
  useBankTransactions,
  useBankReconciliations,
} from "@/hooks/useAccountingData";
import { useCreateBankReconciliation } from "@/hooks/useAccountingMutations";
import { toast } from "sonner";
import { format } from "date-fns";

interface StatementLine {
  id: string;
  date: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  matched: boolean;
  matchedTransactionId?: string;
}

export const BankReconciliationWorksheet = () => {
  const { data: bankAccounts = [] } = useBankAccounts();
  const { data: bankTransactions = [] } = useBankTransactions();
  const { data: reconciliations = [] } = useBankReconciliations();
  const createReconciliation = useCreateBankReconciliation();

  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [statementDate, setStatementDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [statementBalance, setStatementBalance] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Simulated statement lines - in production, these would come from imported bank statement
  const [statementLines, setStatementLines] = useState<StatementLine[]>([]);
  const [selectedBookItems, setSelectedBookItems] = useState<string[]>([]);
  const [selectedStatementItems, setSelectedStatementItems] = useState<string[]>([]);

  const selectedAccount = bankAccounts.find((a: any) => a.id === selectedAccountId);
  const accountTransactions = bankTransactions.filter(
    (t: any) => t.bank_account_id === selectedAccountId && !t.is_reconciled
  );

  const bookBalance = selectedAccount?.current_balance || 0;
  const parsedStatementBalance = parseFloat(statementBalance) || 0;

  // Calculate reconciling items
  const unmatchedDeposits = accountTransactions.filter(
    (t: any) => t.credit_amount > 0 && !statementLines.some((s) => s.matchedTransactionId === t.id)
  );
  const unmatchedWithdrawals = accountTransactions.filter(
    (t: any) => t.debit_amount > 0 && !statementLines.some((s) => s.matchedTransactionId === t.id)
  );
  const unmatchedStatementItems = statementLines.filter((s) => !s.matched);

  const depositsInTransit = unmatchedDeposits.reduce(
    (sum: number, t: any) => sum + (t.credit_amount || 0),
    0
  );
  const outstandingCheques = unmatchedWithdrawals.reduce(
    (sum: number, t: any) => sum + (t.debit_amount || 0),
    0
  );

  const adjustedBookBalance = bookBalance - outstandingCheques + depositsInTransit;
  const difference = adjustedBookBalance - parsedStatementBalance;

  const handleMatch = () => {
    if (selectedBookItems.length !== 1 || selectedStatementItems.length !== 1) {
      toast.error("Select exactly one item from each side to match");
      return;
    }

    const bookItem = accountTransactions.find((t: any) => t.id === selectedBookItems[0]);
    const statementItem = statementLines.find((s) => s.id === selectedStatementItems[0]);

    if (!bookItem || !statementItem) return;

    setStatementLines((prev) =>
      prev.map((s) =>
        s.id === statementItem.id
          ? { ...s, matched: true, matchedTransactionId: bookItem.id }
          : s
      )
    );

    setSelectedBookItems([]);
    setSelectedStatementItems([]);
    toast.success("Items matched successfully");
  };

  const handleUnmatch = (statementLineId: string) => {
    setStatementLines((prev) =>
      prev.map((s) =>
        s.id === statementLineId
          ? { ...s, matched: false, matchedTransactionId: undefined }
          : s
      )
    );
  };

  const handleImportStatement = () => {
    // Simulate importing a bank statement
    const mockLines: StatementLine[] = [
      {
        id: "stmt-1",
        date: format(new Date(), "yyyy-MM-dd"),
        description: "Customer Payment - ABC Corp",
        reference: "TRF123456",
        debit: 0,
        credit: 50000,
        matched: false,
      },
      {
        id: "stmt-2",
        date: format(new Date(), "yyyy-MM-dd"),
        description: "Supplier Payment - XYZ Ltd",
        reference: "CHQ001234",
        debit: 25000,
        credit: 0,
        matched: false,
      },
      {
        id: "stmt-3",
        date: format(new Date(), "yyyy-MM-dd"),
        description: "Bank Charges",
        reference: "BC-001",
        debit: 500,
        credit: 0,
        matched: false,
      },
    ];
    setStatementLines(mockLines);
    setImportDialogOpen(false);
    toast.success("Bank statement imported successfully");
  };

  const handleSaveReconciliation = async () => {
    if (!selectedAccountId) {
      toast.error("Please select a bank account");
      return;
    }

    if (Math.abs(difference) > 0.01) {
      toast.error("Reconciliation difference must be zero");
      return;
    }

    try {
      await createReconciliation.mutateAsync({
        bank_account_id: selectedAccountId,
        statement_date: statementDate,
        statement_balance: parsedStatementBalance,
        book_balance: bookBalance,
        adjusted_book_balance: adjustedBookBalance,
        difference: difference,
        reconciliation_date: format(new Date(), "yyyy-MM-dd"),
        status: "completed",
      } as any);
      toast.success("Reconciliation saved successfully");
    } catch (error) {
      toast.error("Failed to save reconciliation");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bank Reconciliation Worksheet</h2>
          <p className="text-muted-foreground">
            Match bank statement with book transactions
          </p>
        </div>
      </div>

      {/* Account Selection and Balance Entry */}
      <Card>
        <CardHeader>
          <CardTitle>Reconciliation Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Bank Account</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account: any) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_name} - {account.account_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Statement Date</Label>
              <Input
                type="date"
                value={statementDate}
                onChange={(e) => setStatementDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Statement Closing Balance</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={statementBalance}
                onChange={(e) => setStatementBalance(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Import Statement
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Import Bank Statement</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                      <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-4">
                        Upload CSV or Excel file with bank statement
                      </p>
                      <Button variant="outline" onClick={handleImportStatement}>
                        <Upload className="h-4 w-4 mr-2" />
                        Select File
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Supported formats: CSV, XLS, XLSX
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reconciliation Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Book Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rs. {bookBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Statement Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rs.{" "}
              {parsedStatementBalance.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Adjusted Book Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rs.{" "}
              {adjustedBookBalance.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Difference</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                Math.abs(difference) < 0.01 ? "text-green-600" : "text-destructive"
              }`}
            >
              Rs. {difference.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Matching Interface */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Book Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Book Transactions</CardTitle>
            <Badge variant="outline">{accountTransactions.length} unreconciled</Badge>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accountTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        No unreconciled transactions
                      </TableCell>
                    </TableRow>
                  ) : (
                    accountTransactions.map((txn: any) => (
                      <TableRow
                        key={txn.id}
                        className={
                          selectedBookItems.includes(txn.id)
                            ? "bg-primary/10"
                            : ""
                        }
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedBookItems.includes(txn.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedBookItems([...selectedBookItems, txn.id]);
                              } else {
                                setSelectedBookItems(
                                  selectedBookItems.filter((id) => id !== txn.id)
                                );
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {format(new Date(txn.transaction_date), "MMM dd")}
                        </TableCell>
                        <TableCell className="truncate max-w-[200px]">
                          {txn.description}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {txn.debit_amount?.toFixed(2) || "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {txn.credit_amount?.toFixed(2) || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Statement Lines */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Bank Statement</CardTitle>
            <Badge variant="outline">{statementLines.length} lines</Badge>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="w-[60px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statementLines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">
                        Import a bank statement to begin
                      </TableCell>
                    </TableRow>
                  ) : (
                    statementLines.map((line) => (
                      <TableRow
                        key={line.id}
                        className={
                          line.matched
                            ? "bg-green-50 dark:bg-green-950"
                            : selectedStatementItems.includes(line.id)
                            ? "bg-primary/10"
                            : ""
                        }
                      >
                        <TableCell>
                          {!line.matched && (
                            <Checkbox
                              checked={selectedStatementItems.includes(line.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedStatementItems([
                                    ...selectedStatementItems,
                                    line.id,
                                  ]);
                                } else {
                                  setSelectedStatementItems(
                                    selectedStatementItems.filter(
                                      (id) => id !== line.id
                                    )
                                  );
                                }
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(line.date), "MMM dd")}
                        </TableCell>
                        <TableCell className="truncate max-w-[200px]">
                          {line.description}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {line.debit > 0 ? line.debit.toFixed(2) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {line.credit > 0 ? line.credit.toFixed(2) : "-"}
                        </TableCell>
                        <TableCell>
                          {line.matched ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleUnmatch(line.id)}
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        <Button
          onClick={handleMatch}
          disabled={
            selectedBookItems.length !== 1 || selectedStatementItems.length !== 1
          }
        >
          <Link className="h-4 w-4 mr-2" />
          Match Selected
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setSelectedBookItems([]);
            setSelectedStatementItems([]);
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Clear Selection
        </Button>
        <Button
          onClick={handleSaveReconciliation}
          disabled={Math.abs(difference) > 0.01}
          className="bg-green-600 hover:bg-green-700"
        >
          <Save className="h-4 w-4 mr-2" />
          Complete Reconciliation
        </Button>
      </div>

      {/* Reconciling Items */}
      <Card>
        <CardHeader>
          <CardTitle>Reconciling Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h4 className="font-medium mb-2">Deposits in Transit</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Recorded in books but not yet in bank statement
              </p>
              <Table>
                <TableBody>
                  {unmatchedDeposits.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell>{format(new Date(d.transaction_date), "MMM dd")}</TableCell>
                      <TableCell>{d.description}</TableCell>
                      <TableCell className="text-right font-mono">
                        {d.credit_amount?.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell className="text-right font-mono">
                      {depositsInTransit.toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div>
              <h4 className="font-medium mb-2">Outstanding Cheques</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Issued but not yet cleared by bank
              </p>
              <Table>
                <TableBody>
                  {unmatchedWithdrawals.map((w: any) => (
                    <TableRow key={w.id}>
                      <TableCell>{format(new Date(w.transaction_date), "MMM dd")}</TableCell>
                      <TableCell>{w.cheque_number || w.description}</TableCell>
                      <TableCell className="text-right font-mono">
                        {w.debit_amount?.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell className="text-right font-mono">
                      {outstandingCheques.toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
