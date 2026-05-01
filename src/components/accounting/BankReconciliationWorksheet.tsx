import { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBankAccounts, useBankTransactionsForRecon, useLastReconciliation } from "@/hooks/useAccountingData";
import { useSaveBankReconciliation } from "@/hooks/useAccountingMutations";
import { Landmark, Save, X, SlidersHorizontal, FileText, AlertTriangle, Upload, CheckCircle, BookOpen, CreditCard } from "lucide-react";
import { toast } from "sonner";
import "./BankReconciliationWorksheet.css";
import { BankStatementImportModal } from "./BankStatementImportModal";

// ---------- Types ----------
type DisplayFilter = "all" | "not_cleared" | "cleared";
type ReconMode = "statement" | "book";

interface ClearedState {
  [transactionId: string]: {
    cleared: boolean;
    clearedAmount: number;
  };
}

// ---------- Helpers ----------
const fmt = (n: number) =>
  n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const typeLabel = (t: string): string => {
  switch (t?.toLowerCase()) {
    case "deposit": case "dp": case "receipt": return "DP";
    case "payment": case "ps": case "withdrawal": return "PS";
    case "transfer": case "ft": return "FT";
    case "fee": case "charge": return "FC";
    case "interest": return "IN";
    case "adjustment": return "AJ";
    default: return t?.substring(0, 3)?.toUpperCase() || "—";
  }
};

const typeVariant = (t: string): string => {
  switch (t?.toLowerCase()) {
    case "deposit": case "dp": case "receipt": case "interest": return "deposit";
    case "payment": case "ps": case "withdrawal": case "fee": case "charge": return "payment";
    default: return "other";
  }
};

const sourceLabel = (sourceType: string | null | undefined): { text: string; className: string } => {
  switch (sourceType) {
    case "ap_payment": return { text: "AP", className: "source-badge source-ap" };
    case "ar_receipt": return { text: "AR", className: "source-badge source-ar" };
    case "bank_fee": return { text: "FEE", className: "source-badge source-fee" };
    case "inter_bank_transfer": return { text: "IBT", className: "source-badge source-ibt" };
    case "statement_import": return { text: "STMT", className: "source-badge source-stmt" };
    default: return { text: "MAN", className: "source-badge source-man" };
  }
};

// ================ COMPONENT ================
const BankReconciliationWorksheet = () => {
  // --- Data hooks ---
  const { data: bankAccounts = [], isLoading: acctLoading } = useBankAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [reconMode, setReconMode] = useState<ReconMode>("statement");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const { data: transactions = [], isLoading: txnLoading } = useBankTransactionsForRecon(
    selectedAccountId || undefined,
    fromDate || undefined,
    toDate || undefined
  );
  const { data: lastRecon } = useLastReconciliation(selectedAccountId);
  const saveReconciliation = useSaveBankReconciliation();

  // --- UI State ---
  const [statementNo, setStatementNo] = useState("");
  const [statementDate, setStatementDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [statementBalance, setStatementBalance] = useState<string>("");
  const [displayFilter, setDisplayFilter] = useState<DisplayFilter>("all");
  const [clearedState, setClearedState] = useState<ClearedState>({});
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // --- Adjustment form state ---
  const [adjType, setAdjType] = useState("bank_charge");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjDescription, setAdjDescription] = useState("");

  // --- Derived ---
  const selectedAccount = useMemo(
    () => bankAccounts.find((a) => a.id === selectedAccountId) || null,
    [bankAccounts, selectedAccountId]
  );

  const lastStatementBalance = lastRecon?.statement_balance ?? selectedAccount?.opening_balance ?? 0;

  // In book recon mode, use bank account current_balance as the target
  const targetBalance = useMemo(() => {
    if (reconMode === "book") {
      return selectedAccount?.current_balance ?? 0;
    }
    return parseFloat(statementBalance) || 0;
  }, [reconMode, selectedAccount, statementBalance]);

  // Only show unreconciled transactions (or all if user wants to see previously cleared)
  const filteredTransactions = useMemo(() => {
    const base = transactions.filter((t) => {
      if (!t.is_reconciled) return true;
      return displayFilter === "all" || displayFilter === "cleared";
    });

    if (displayFilter === "cleared") {
      return base.filter((t) => clearedState[t.id]?.cleared || t.is_reconciled);
    }
    if (displayFilter === "not_cleared") {
      return base.filter((t) => !clearedState[t.id]?.cleared && !t.is_reconciled);
    }
    return base;
  }, [transactions, displayFilter, clearedState]);

  // Compute summaries
  const summary = useMemo(() => {
    let paymentCount = 0, paymentTotal = 0;
    let depositCount = 0, depositTotal = 0;
    let clearedPaymentTotal = 0, clearedDepositTotal = 0;

    transactions.forEach((t) => {
      const deposit = t.debit_amount || 0;
      const payment = t.credit_amount || 0;

      if (payment > 0) { paymentCount++; paymentTotal += payment; }
      if (deposit > 0) { depositCount++; depositTotal += deposit; }

      const cs = clearedState[t.id];
      if (cs?.cleared) {
        if (payment > 0) clearedPaymentTotal += cs.clearedAmount;
        if (deposit > 0) clearedDepositTotal += cs.clearedAmount;
      }
    });

    const bookBalance = lastStatementBalance + depositTotal - paymentTotal;
    const clearedBookBalance = lastStatementBalance + clearedDepositTotal - clearedPaymentTotal;
    const stmtEndBal = targetBalance;
    const difference = clearedBookBalance - stmtEndBal;

    return {
      paymentCount, paymentTotal,
      depositCount, depositTotal,
      clearedPaymentTotal, clearedDepositTotal,
      bookBalance,
      clearedBookBalance,
      stmtEndBal,
      difference,
    };
  }, [transactions, clearedState, lastStatementBalance, targetBalance]);

  // --- Handlers ---
  const handleAccountChange = useCallback((accountId: string) => {
    setSelectedAccountId(accountId);
    setClearedState({});
    setStatementNo("");
    setStatementBalance("");
  }, []);

  const toggleCleared = useCallback((txnId: string, payment: number, deposit: number) => {
    setClearedState((prev) => {
      const current = prev[txnId];
      const fullAmount = payment > 0 ? payment : deposit;
      if (current?.cleared) {
        const next = { ...prev };
        delete next[txnId];
        return next;
      }
      return { ...prev, [txnId]: { cleared: true, clearedAmount: fullAmount } };
    });
  }, []);

  const updateClearedAmount = useCallback((txnId: string, amount: number) => {
    setClearedState((prev) => ({
      ...prev,
      [txnId]: { ...prev[txnId], cleared: true, clearedAmount: amount },
    }));
  }, []);

  const handleSelectAll = useCallback(() => {
    const allCleared = filteredTransactions.every((t) => clearedState[t.id]?.cleared || t.is_reconciled);
    if (allCleared) {
      const next: ClearedState = {};
      Object.keys(clearedState).forEach((id) => {
        if (!filteredTransactions.find((t) => t.id === id)) {
          next[id] = clearedState[id];
        }
      });
      setClearedState(next);
    } else {
      const next = { ...clearedState };
      filteredTransactions.forEach((t) => {
        if (!t.is_reconciled && !next[t.id]) {
          const fullAmount = (t.debit_amount || 0) > 0 ? (t.debit_amount || 0) : (t.credit_amount || 0);
          next[t.id] = { cleared: true, clearedAmount: fullAmount };
        }
      });
      setClearedState(next);
    }
  }, [filteredTransactions, clearedState]);

  const handleSave = useCallback(async () => {
    if (!selectedAccountId) return toast.error("Select a bank account");
    if (reconMode === "statement" && !statementBalance) return toast.error("Enter statement ending balance");
    if (!statementDate) return toast.error("Enter statement date");

    const clearedIds = Object.entries(clearedState)
      .filter(([, v]) => v.cleared)
      .map(([id]) => id);
    const clearedAmounts: Record<string, number> = {};
    clearedIds.forEach((id) => { clearedAmounts[id] = clearedState[id].clearedAmount; });

    if (clearedIds.length === 0) {
      return toast.error("No transactions are cleared for this reconciliation");
    }

    await saveReconciliation.mutateAsync({
      bank_account_id: selectedAccountId,
      statement_date: statementDate,
      statement_no: statementNo,
      statement_balance: summary.stmtEndBal,
      book_balance: summary.bookBalance,
      adjusted_book_balance: summary.clearedBookBalance,
      difference: summary.difference,
      cleared_transaction_ids: clearedIds,
      cleared_amounts: clearedAmounts,
    });

    setClearedState({});
    setStatementNo("");
    setStatementBalance("");
  }, [selectedAccountId, reconMode, statementDate, statementNo, statementBalance, clearedState, summary, saveReconciliation]);

  const handleCancel = useCallback(() => {
    setClearedState({});
    toast.info("Cleared selections reset");
  }, []);

  const handleAddAdjustment = useCallback(() => {
    const amount = parseFloat(adjAmount);
    if (!amount || !adjDescription) {
      return toast.error("Enter amount and description");
    }
    toast.info(`Adjustment "${adjDescription}" for LKR ${fmt(amount)} noted. (Full JE posting coming soon)`);
    setShowAdjustments(false);
    setAdjAmount("");
    setAdjDescription("");
    setAdjType("bank_charge");
  }, [adjAmount, adjDescription]);

  const isSaveDisabled = useMemo(() => {
    if (saveReconciliation.isPending) return true;
    if (Object.keys(clearedState).length === 0) return true;
    if (reconMode === "statement" && !statementBalance) return true;
    return false;
  }, [saveReconciliation.isPending, clearedState, reconMode, statementBalance]);

  // --- Loading ---
  if (acctLoading) {
    return (
      <Card className="bank-recon-root">
        <CardContent className="bank-recon-empty">
          <Landmark />
          <p>Loading bank accounts…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bank-recon-root">
      {/* ========================= HEADER ========================= */}
      <CardHeader className="p-0">
        <div className="bank-recon-header">
          {/* Recon Mode Tabs */}
          <div className="bank-recon-header-field" style={{ minWidth: 240 }}>
            <label>Reconciliation Mode</label>
            <Tabs value={reconMode} onValueChange={(v) => setReconMode(v as ReconMode)}>
              <TabsList className="h-8">
                <TabsTrigger value="statement" className="text-xs gap-1 px-2">
                  <CreditCard className="w-3 h-3" /> Statement
                </TabsTrigger>
                <TabsTrigger value="book" className="text-xs gap-1 px-2">
                  <BookOpen className="w-3 h-3" /> Book
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Account Code */}
          <div className="bank-recon-header-field">
            <label>Account Code</label>
            <Select value={selectedAccountId || ""} onValueChange={handleAccountChange}>
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder="Select Bank Account" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.account_code} — {a.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Statement No. (only in statement mode) */}
          {reconMode === "statement" && (
            <div className="bank-recon-header-field">
              <label>Statement No.</label>
              <Input
                value={statementNo}
                onChange={(e) => setStatementNo(e.target.value)}
                placeholder="e.g. 202602"
                className="w-[140px]"
              />
            </div>
          )}

          {/* Statement Date */}
          <div className="bank-recon-header-field">
            <label>{reconMode === "statement" ? "Statement Date" : "Recon Date"}</label>
            <Input
              type="date"
              value={statementDate}
              onChange={(e) => setStatementDate(e.target.value)}
              className="w-[160px]"
            />
          </div>

          {/* Statement Ending Balance (only in statement mode) */}
          {reconMode === "statement" && (
            <div className="bank-recon-header-field">
              <label>Statement Ending Balance</label>
              <Input
                type="number"
                step="0.01"
                value={statementBalance}
                onChange={(e) => setStatementBalance(e.target.value)}
                placeholder="0.00"
                className="w-[160px]"
              />
            </div>
          )}

          {/* Book mode: show bank account balance */}
          {reconMode === "book" && selectedAccount && (
            <div className="bank-recon-header-field">
              <label>Bank Account Balance</label>
              <span className="value">LKR {fmt(selectedAccount.current_balance || 0)}</span>
            </div>
          )}

          {/* Last Statement Balance */}
          <div className="bank-recon-header-field">
            <label>Last Statement Bal.</label>
            <span className="value">LKR {fmt(lastStatementBalance)}</span>
          </div>

          {/* Date Range Filters */}
          <div className="bank-recon-header-field">
            <label>From Date</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-[140px]"
            />
          </div>
          <div className="bank-recon-header-field">
            <label>To Date</label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-[140px]"
            />
          </div>

          {/* Display Filter */}
          <div className="bank-recon-header-field">
            <label>Display</label>
            <Select value={displayFilter} onValueChange={(v) => setDisplayFilter(v as DisplayFilter)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="not_cleared">Not Cleared</SelectItem>
                <SelectItem value="cleared">Cleared</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      {/* ========================= TABLE ========================= */}
      <CardContent className="p-0 bank-recon-table-wrap">
        {!selectedAccountId ? (
          <div className="bank-recon-empty">
            <Landmark />
            <p className="text-lg font-medium">Select a Bank Account</p>
            <p className="text-sm">Choose an account above to begin reconciliation</p>
          </div>
        ) : txnLoading ? (
          <div className="bank-recon-empty">
            <FileText />
            <p>Loading transactions…</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="bank-recon-empty">
            <FileText />
            <p className="text-lg font-medium">No Transactions Found</p>
            <p className="text-sm">
              {displayFilter === "cleared"
                ? "No cleared transactions"
                : displayFilter === "not_cleared"
                  ? "All transactions are cleared"
                  : "No transactions for this account"}
            </p>
          </div>
        ) : (
          <table className="bank-recon-table">
            <thead>
              <tr>
                <th className="w-[40px]">#</th>
                <th className="w-[50px]">
                  <input
                    type="checkbox"
                    className="cleared-checkbox"
                    checked={filteredTransactions.length > 0 && filteredTransactions.every((t) => clearedState[t.id]?.cleared || t.is_reconciled)}
                    onChange={handleSelectAll}
                    title="Select / Deselect All"
                  />
                </th>
                <th className="w-[60px]">Type</th>
                <th className="w-[60px]">Source</th>
                <th className="w-[100px]">Date</th>
                <th>Trans. No.</th>
                <th>Ref. 1</th>
                <th className="num-col">Deposit</th>
                <th className="num-col">Payment</th>
                <th className="num-col w-[120px]">Cleared Amt</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((t, idx) => {
                const deposit = t.debit_amount || 0;
                const payment = t.credit_amount || 0;
                const cs = clearedState[t.id];
                const isCleared = cs?.cleared || t.is_reconciled;
                const isAlreadyReconciled = !!t.is_reconciled;
                const source = sourceLabel(t.source_type);

                const rowClass = [
                  isCleared ? "row-cleared" : "",
                  deposit > 0 ? "row-deposit" : payment > 0 ? "row-payment" : "",
                ].filter(Boolean).join(" ");

                return (
                  <tr key={t.id} className={rowClass}>
                    <td>{idx + 1}</td>
                    <td>
                      <input
                        type="checkbox"
                        className="cleared-checkbox"
                        checked={isCleared}
                        disabled={isAlreadyReconciled}
                        onChange={() => toggleCleared(t.id, payment, deposit)}
                        title="Toggle cleared"
                      />
                    </td>
                    <td>
                      <span className={`type-badge ${typeVariant(t.transaction_type)}`}>
                        {typeLabel(t.transaction_type)}
                      </span>
                    </td>
                    <td>
                      <span className={source.className}>{source.text}</span>
                    </td>
                    <td>{t.transaction_date ? format(new Date(t.transaction_date), "dd/MM/yyyy") : "—"}</td>
                    <td className="font-mono text-xs">{t.reference || t.id.substring(0, 8)}</td>
                    <td>{t.cheque_number || "—"}</td>
                    <td className="num-col">{deposit > 0 ? `LKR ${fmt(deposit)}` : "—"}</td>
                    <td className="num-col">{payment > 0 ? `LKR ${fmt(payment)}` : "—"}</td>
                    <td className="num-col">
                      {isCleared ? (
                        isAlreadyReconciled ? (
                          <span className="font-semibold" style={{ color: "hsl(142 76% 30%)" }}>
                            LKR {fmt(payment > 0 ? payment : deposit)}
                          </span>
                        ) : (
                          <input
                            type="number"
                            step="0.01"
                            className="cleared-amount-input"
                            value={cs?.clearedAmount ?? ""}
                            onChange={(e) => updateClearedAmount(t.id, parseFloat(e.target.value) || 0)}
                            title="Cleared amount"
                          />
                        )
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="text-sm text-muted-foreground">{t.description || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CardContent>

      {/* ========================= SUMMARY FOOTER ========================= */}
      {selectedAccountId && (
        <div className="bank-recon-summary">
          {/* LEFT: Payment & Deposit totals (SAP-style) */}
          <div className="bank-recon-summary-left">
            <div className="bank-recon-summary-row">
              <span className="summary-label">Payment</span>
              <span className="summary-count">{summary.paymentCount}</span>
              <span className="summary-amount negative">LKR {fmt(summary.paymentTotal)}</span>
            </div>
            <div className="bank-recon-summary-row">
              <span className="summary-label">Deposit</span>
              <span className="summary-count">{summary.depositCount}</span>
              <span className="summary-amount positive">LKR {fmt(summary.depositTotal)}</span>
            </div>
          </div>

          {/* RIGHT: Cleared Book Balance / Target Balance / Difference */}
          <div className="bank-recon-summary-right">
            <div className="bank-recon-balance-row">
              <span className="balance-label">Cleared Book Balance</span>
              <span className={`balance-value ${summary.clearedBookBalance >= 0 ? "positive" : "negative"}`}>
                LKR {fmt(summary.clearedBookBalance)}
              </span>
            </div>
            <div className="bank-recon-balance-row">
              <span className="balance-label">
                {reconMode === "statement" ? "Statement Ending Balance" : "Bank Account Balance"}
              </span>
              <span className="balance-value neutral">
                LKR {fmt(summary.stmtEndBal)}
              </span>
            </div>
            <div className="bank-recon-balance-row difference-row">
              <span className="balance-label">Difference</span>
              <span className={`balance-value ${summary.difference === 0 ? "match" : "negative"}`}>
                {summary.difference === 0 ? (
                  <><CheckCircle className="inline w-4 h-4 mr-1" />LKR 0.00</>
                ) : (
                  <><AlertTriangle className="inline w-4 h-4 mr-1" />LKR {fmt(Math.abs(summary.difference))}</>
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================= ACTION BUTTONS ========================= */}
      {selectedAccountId && (
        <div className="bank-recon-actions">
          {reconMode === "statement" && (
            <Button variant="outline" onClick={() => setShowImportModal(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Import Statement
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowAdjustments(true)}>
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Adjustments
          </Button>
          <Button variant="outline" onClick={handleCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaveDisabled}>
            <Save className="w-4 h-4 mr-2" />
            {saveReconciliation.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      )}

      {/* ========================= ADJUSTMENTS DIALOG ========================= */}
      <Dialog open={showAdjustments} onOpenChange={setShowAdjustments}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Adjustment</DialogTitle>
          </DialogHeader>
          <div className="adjustments-form">
            <div className="field-row">
              <Label>Adjustment Type</Label>
              <Select value={adjType} onValueChange={setAdjType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_charge">Bank Charge / Fee</SelectItem>
                  <SelectItem value="interest_earned">Interest Earned</SelectItem>
                  <SelectItem value="interest_paid">Interest Paid</SelectItem>
                  <SelectItem value="other">Other Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="field-row">
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={adjAmount}
                onChange={(e) => setAdjAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="field-row">
              <Label>Description</Label>
              <Textarea
                value={adjDescription}
                onChange={(e) => setAdjDescription(e.target.value)}
                placeholder="Bank charges for Feb 2026"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleAddAdjustment}>Add Adjustment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================= IMPORT MODAL ========================= */}
      <BankStatementImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        bankAccountId={selectedAccountId}
        onImportComplete={() => {
          setClearedState({});
        }}
      />
    </Card>
  );
};

export { BankReconciliationWorksheet };
