import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBankAccounts, useBankTransactionsForRecon, useLastReconciliation, useDraftReconciliation } from "@/hooks/useAccountingData";
import { useSaveBankReconciliation, useSaveDraftReconciliation, useDeleteDraftReconciliation } from "@/hooks/useAccountingMutations";
import { Landmark, Save, X, SlidersHorizontal, FileText, AlertTriangle, Upload, CheckCircle, ArrowRightLeft, Search, Sparkles, BookOpen, Maximize, Minimize, Trash2, Printer } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import "./BankReconciliationWorksheet.css";
import { BankStatementImportModal } from "./BankStatementImportModal";
import { BankReconciliationReport } from "./BankReconciliationReport";

// ---------- Types ----------
type DisplayFilter = "all" | "not_cleared" | "cleared";

interface ClearedState {
  [transactionId: string]: {
    cleared: boolean;
    clearedAmount: number;
  };
}

// ---------- Helpers ----------
const fmt = (n: number) =>
  n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const sourceLabel = (sourceType: string | null | undefined): { text: string; className: string } => {
  switch (sourceType) {
    case "ap_payment": return { text: "AP", className: "source-badge source-ap" };
    case "ar_receipt": return { text: "AR", className: "source-badge source-ar" };
    case "bank_fee": return { text: "FEE", className: "source-badge source-fee" };
    case "inter_bank_transfer": return { text: "IBT", className: "source-badge source-ibt" };
    default: 
      if (sourceType?.startsWith('statement_import')) return { text: "STMT", className: "source-badge source-stmt" };
      return { text: "MAN", className: "source-badge source-man" };
  }
};

// ================ COMPONENT ================
const BankReconciliationWorksheet = () => {
  const queryClient = useQueryClient();
  // --- Data hooks ---
  const { data: bankAccounts = [], isLoading: acctLoading } = useBankAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const { data: transactions = [], isLoading: txnLoading } = useBankTransactionsForRecon(
    selectedAccountId || undefined,
    fromDate || undefined,
    toDate || undefined
  );
  const { data: lastRecon } = useLastReconciliation(selectedAccountId);
  const { data: draftRecon } = useDraftReconciliation(selectedAccountId);
  const saveReconciliation = useSaveBankReconciliation();
  const saveDraft = useSaveDraftReconciliation();
  const deleteDraft = useDeleteDraftReconciliation();

  // --- UI State ---
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [statementNo, setStatementNo] = useState("");
  const [statementDate, setStatementDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [statementBalance, setStatementBalance] = useState<string>("");
  const [displayFilter, setDisplayFilter] = useState<DisplayFilter>("not_cleared");
  const [clearedState, setClearedState] = useState<ClearedState>({});
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHydratingRef = useRef(false);
  const lastHydratedAccountRef = useRef<string | null>(null);

  // --- Draft Hydration: restore cleared state from DB on account change ---
  useEffect(() => {
    if (!draftRecon || !selectedAccountId) return;
    // Prevent re-hydration if we already hydrated this account
    if (lastHydratedAccountRef.current === selectedAccountId) return;
    lastHydratedAccountRef.current = selectedAccountId;

    isHydratingRef.current = true;

    // Restore header fields
    if (draftRecon.header.statement_no) setStatementNo(draftRecon.header.statement_no);
    if (draftRecon.header.draft_statement_balance != null) {
      setStatementBalance(String(draftRecon.header.draft_statement_balance));
    }
    if (draftRecon.header.statement_date) setStatementDate(draftRecon.header.statement_date);

    // Restore cleared items
    if (draftRecon.items.length > 0) {
      const restored: ClearedState = {};
      draftRecon.items.forEach((item: any) => {
        restored[item.bank_transaction_id] = {
          cleared: true,
          clearedAmount: item.statement_amount || 0,
        };
      });
      setClearedState(restored);
      toast.info(`Restored ${draftRecon.items.length} saved matches from your last session.`);
    }

    // Allow auto-save after a short delay to prevent immediate re-save
    setTimeout(() => { isHydratingRef.current = false; }, 1000);
  }, [draftRecon, selectedAccountId]);

  // --- Debounced Auto-Save: persist cleared state to DB ---
  useEffect(() => {
    if (!selectedAccountId || isHydratingRef.current) return;

    // Clear previous timer
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);

    draftSaveTimerRef.current = setTimeout(() => {
      const clearedItems = Object.entries(clearedState)
        .filter(([, v]) => v.cleared)
        .map(([id, v]) => ({
          bank_transaction_id: id,
          cleared_amount: v.clearedAmount,
        }));

      // Only save if there's actual state to persist (or we had items before)
      if (clearedItems.length > 0 || draftRecon?.items?.length) {
        saveDraft.mutate({
          bank_account_id: selectedAccountId,
          statement_date: statementDate,
          statement_no: statementNo,
          statement_balance: statementBalance,
          cleared_items: clearedItems,
        });
      }
    }, 800);

    return () => {
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearedState, selectedAccountId, statementDate, statementNo, statementBalance]);

  // --- Clear imported statement handler ---
  const handleClearStatement = useCallback(async () => {
    if (!selectedAccountId) return;
    setIsClearing(true);
    try {
      const { error, count } = await (supabase as any)
        .from('bank_transactions')
        .delete({ count: 'exact' })
        .eq('bank_account_id', selectedAccountId)
        .like('source_type', 'statement_import%');

      if (error) throw error;
      toast.success(`Cleared ${count || 0} imported statement entries. You can now re-import a fresh statement.`);
      setClearedState({});
      setSuggestedMatches({});
      queryClient.invalidateQueries({ queryKey: ['bank-transactions-recon'] });
    } catch (err: any) {
      toast.error(`Failed to clear: ${err.message}`);
    } finally {
      setIsClearing(false);
      setShowClearConfirm(false);
    }
  }, [selectedAccountId, queryClient]);

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
  const targetBalance = parseFloat(statementBalance) || 0;

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

  // Group by Date
  const groupedByDate = useMemo(() => {
    const dates = new Set<string>();
    const byDate: Record<string, { statement: any[]; book: any[] }> = {};

    filteredTransactions.forEach(t => {
      const dateStr = format(new Date(t.transaction_date), "yyyy-MM-dd");
      dates.add(dateStr);
      if (!byDate[dateStr]) byDate[dateStr] = { statement: [], book: [] };

      if (t.source_type?.startsWith('statement_import')) {
         byDate[dateStr].statement.push(t);
      } else {
         byDate[dateStr].book.push(t);
      }
    });

    const sortedDates = Array.from(dates).sort();
    return sortedDates.map(date => ({
       date,
       statement: byDate[date].statement,
       book: byDate[date].book
    }));
  }, [filteredTransactions]);

  // Split into Statement and Book (just for Auto-match logic)
  const statementTxns = useMemo(() => filteredTransactions.filter(t => t.source_type?.startsWith('statement_import')), [filteredTransactions]);
  const bookTxns = useMemo(() => filteredTransactions.filter(t => !t.source_type?.startsWith('statement_import')), [filteredTransactions]);

  // --- Auto Match Logic ---
  const [suggestedMatches, setSuggestedMatches] = useState<Record<string, string>>({});

  const runAutoMatch = useCallback(() => {
    const matches: Record<string, string> = {};
    const usedBookIds = new Set<string>();

    statementTxns.forEach(st => {
      if (clearedState[st.id]?.cleared) return;

      const stAmount = (st.debit_amount || 0) > 0 ? (st.debit_amount || 0) : -(st.credit_amount || 0);
      
      const bestMatch = bookTxns.find(bt => {
        if (usedBookIds.has(bt.id) || clearedState[bt.id]?.cleared) return false;
        
        const btAmount = (bt.debit_amount || 0) > 0 ? (bt.debit_amount || 0) : -(bt.credit_amount || 0);
        if (stAmount !== btAmount) return false;
        
        const diffDays = Math.abs((new Date(st.transaction_date).getTime() - new Date(bt.transaction_date).getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 5) return false;

        if (diffDays > 2) {
           const stRef = (st.reference || '').toLowerCase().replace(/\s/g, '');
           const btRef = (bt.reference || '').toLowerCase().replace(/\s/g, '');
           if (stRef && btRef && (stRef.includes(btRef) || btRef.includes(stRef))) return true;
           return false;
        }

        return true; 
      });

      if (bestMatch) {
        matches[st.id] = bestMatch.id;
        usedBookIds.add(bestMatch.id);
      }
    });
    setSuggestedMatches(matches);
    toast.success(`Auto-Match completed. Found ${Object.keys(matches).length} possible matches.`);
  }, [statementTxns, bookTxns, clearedState]);

  const acceptAllMatches = useCallback(() => {
    setClearedState(prev => {
      const next = { ...prev };
      Object.entries(suggestedMatches).forEach(([stId, bkId]) => {
         const stTxn = statementTxns.find(t => t.id === stId);
         const bkTxn = bookTxns.find(t => t.id === bkId);
         if (stTxn && bkTxn) {
            next[stId] = { cleared: true, clearedAmount: (stTxn.debit_amount || 0) > 0 ? (stTxn.debit_amount || 0) : (stTxn.credit_amount || 0) };
            next[bkId] = { cleared: true, clearedAmount: (bkTxn.debit_amount || 0) > 0 ? (bkTxn.debit_amount || 0) : (bkTxn.credit_amount || 0) };
         }
      });
      return next;
    });
    setSuggestedMatches({});
    toast.success("Matches accepted and added to cleared selections.");
  }, [suggestedMatches, statementTxns, bookTxns]);

  const [adjustments, setAdjustments] = useState<Array<{
    type: string;
    amount: number;
    description: string;
  }>>([]);

  // Compute summaries
  const summary = useMemo(() => {
    let paymentCount = 0, paymentTotal = 0;
    let depositCount = 0, depositTotal = 0;
    let clearedPaymentTotal = 0, clearedDepositTotal = 0;

    bookTxns.forEach((t) => {
      const deposit = t.debit_amount || 0;
      const payment = t.credit_amount || 0;
      if (payment > 0) { paymentCount++; paymentTotal += payment; }
      if (deposit > 0) { depositCount++; depositTotal += deposit; }
    });

    Object.keys(clearedState).forEach(id => {
       const cs = clearedState[id];
       if (cs.cleared) {
         const t = bookTxns.find(tx => tx.id === id);
         if (t) {
            const deposit = t.debit_amount || 0;
            const payment = t.credit_amount || 0;
            if (payment > 0) clearedPaymentTotal += cs.clearedAmount;
            if (deposit > 0) clearedDepositTotal += cs.clearedAmount;
         }
       }
    });

    let adjDepositTotal = 0;
    let adjPaymentTotal = 0;
    adjustments.forEach(adj => {
      if (adj.type === "interest_earned") adjDepositTotal += adj.amount;
      else adjPaymentTotal += adj.amount;
    });

    const bookBalance = lastStatementBalance + depositTotal - paymentTotal;
    const clearedBookBalance = lastStatementBalance + clearedDepositTotal - clearedPaymentTotal + adjDepositTotal - adjPaymentTotal;
    const stmtEndBal = targetBalance;
    const difference = clearedBookBalance - stmtEndBal;

    return {
      paymentCount, paymentTotal,
      depositCount, depositTotal,
      clearedPaymentTotal, clearedDepositTotal,
      adjDepositTotal, adjPaymentTotal,
      bookBalance,
      clearedBookBalance,
      stmtEndBal,
      difference,
    };
  }, [bookTxns, clearedState, lastStatementBalance, targetBalance, adjustments]);

  // Derived Match Tally
  const matchTally = useMemo(() => {
    let selectedStatementVal = 0;
    let selectedBookVal = 0;

    Object.keys(clearedState).forEach(id => {
       if (clearedState[id].cleared) {
          const stTxn = statementTxns.find(t => t.id === id);
          if (stTxn) {
             const amt = (stTxn.debit_amount || 0) > 0 ? (stTxn.debit_amount || 0) : -(stTxn.credit_amount || 0);
             selectedStatementVal += amt;
          }
          const bkTxn = bookTxns.find(t => t.id === id);
          if (bkTxn) {
             const amt = (bkTxn.debit_amount || 0) > 0 ? (bkTxn.debit_amount || 0) : -(bkTxn.credit_amount || 0);
             selectedBookVal += amt;
          }
       }
    });
    return { selectedStatementVal, selectedBookVal, diff: selectedStatementVal - selectedBookVal };
  }, [clearedState, statementTxns, bookTxns]);

  // --- Handlers ---
  const handleAccountChange = useCallback((accountId: string) => {
    // Reset hydration tracker so draft can be loaded for new account
    lastHydratedAccountRef.current = null;
    isHydratingRef.current = true;
    setSelectedAccountId(accountId);
    setClearedState({});
    setSuggestedMatches({});
    setStatementNo("");
    setStatementBalance("");
    // Allow hydration after state clears
    setTimeout(() => { isHydratingRef.current = false; }, 200);
  }, []);

  const toggleCleared = useCallback((txnId: string, payment: number, deposit: number) => {
    setClearedState((prev) => {
      const current = prev[txnId];
      const fullAmount = payment > 0 ? payment : deposit;
      
      // UN-CLEARING logic
      if (current?.cleared) {
        const next = { ...prev };
        delete next[txnId];
        return next;
      }
      
      // CLEARING logic (with smart auto-match)
      const next = { ...prev, [txnId]: { cleared: true, clearedAmount: fullAmount } };
      
      // Find which side this transaction belongs to
      const isStatement = statementTxns.some(t => t.id === txnId);
      const sourceTxn = isStatement ? statementTxns.find(t => t.id === txnId) : bookTxns.find(t => t.id === txnId);
      
      if (sourceTxn) {
         const targetList = isStatement ? bookTxns : statementTxns;
         const sourceDate = new Date(sourceTxn.transaction_date).getTime();
         
         // Find potential matches on the opposite side
         const matches = targetList.filter(t => {
            // Skip already cleared or reconciled ones
            if (t.is_reconciled || next[t.id]?.cleared) return false;
            
            // Exact amount match is required
            const targetPayment = t.credit_amount || 0;
            const targetDeposit = t.debit_amount || 0;
            if (payment > 0 && targetPayment !== payment) return false;
            if (deposit > 0 && targetDeposit !== deposit) return false;
            
            // Date must be within 3 days
            const targetDate = new Date(t.transaction_date).getTime();
            const diffDays = Math.abs(targetDate - sourceDate) / (1000 * 60 * 60 * 24);
            if (diffDays > 3) return false;
            
            return true;
         });
         
         if (matches.length > 0) {
            // Sort by closest date
            matches.sort((a, b) => {
               const aDiff = Math.abs(new Date(a.transaction_date).getTime() - sourceDate);
               const bDiff = Math.abs(new Date(b.transaction_date).getTime() - sourceDate);
               return aDiff - bDiff;
            });
            
            const bestMatch = matches[0];
            const matchFullAmount = (bestMatch.credit_amount || 0) > 0 ? (bestMatch.credit_amount || 0) : (bestMatch.debit_amount || 0);
            next[bestMatch.id] = { cleared: true, clearedAmount: matchFullAmount };
            
            toast.success(`Smart Auto-Match: Selected matching LKR ${fullAmount.toLocaleString()} on the ${isStatement ? 'Book' : 'Statement'} side!`);
         }
      }
      
      return next;
    });
  }, [statementTxns, bookTxns]);

  const handleSave = useCallback(async () => {
    if (!selectedAccountId) return toast.error("Select a bank account");
    if (!statementBalance) return toast.error("Enter statement ending balance");
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
      adjustments: adjustments,
    });

    setClearedState({});
    setSuggestedMatches({});
    setAdjustments([]);
    setStatementNo("");
    setStatementBalance("");
  }, [selectedAccountId, statementDate, statementNo, statementBalance, clearedState, summary, saveReconciliation, adjustments]);

  const handleCancel = useCallback(async () => {
    isHydratingRef.current = true;
    setClearedState({});
    setSuggestedMatches({});
    // Delete the draft from DB so it doesn't come back on refresh
    if (selectedAccountId) {
      await deleteDraft.mutateAsync(selectedAccountId);
    }
    toast.info("Cleared selections reset and draft discarded");
    setTimeout(() => { isHydratingRef.current = false; }, 500);
  }, [selectedAccountId, deleteDraft]);

  const handleAddAdjustment = useCallback(() => {
    const amount = parseFloat(adjAmount);
    if (!amount || !adjDescription) {
      return toast.error("Enter amount and description");
    }
    
    setAdjustments(prev => [...prev, {
      type: adjType,
      amount,
      description: adjDescription
    }]);

    setShowAdjustments(false);
    setAdjAmount("");
    setAdjDescription("");
    setAdjType("bank_charge");
    toast.success("Adjustment added to reconciliation list");
  }, [adjAmount, adjDescription, adjType]);

  const removeAdjustment = (index: number) => {
    setAdjustments(prev => prev.filter((_, i) => i !== index));
  };

  const isSaveDisabled = useMemo(() => {
    if (saveReconciliation.isPending) return true;
    if (Object.keys(clearedState).length === 0 && adjustments.length === 0) return true;
    if (!statementBalance) return true;
    return false;
  }, [saveReconciliation.isPending, clearedState, statementBalance, adjustments]);

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

  const rootClass = isFullscreen 
    ? "bank-recon-root flex flex-col fixed inset-0 z-[100] bg-background shadow-2xl rounded-none border-0" 
    : "bank-recon-root flex flex-col h-[calc(100vh-140px)]";

  return (
    <Card className={rootClass}>
      {/* ========================= HEADER ========================= */}
      <CardHeader className="p-0 flex-shrink-0 z-20 border-b bg-background shadow-sm">
        <div className="bank-recon-header flex-wrap">
          <div className="bank-recon-header-field min-w-[200px]">
            <label>Bank Account</label>
            <Select value={selectedAccountId || ""} onValueChange={handleAccountChange}>
              <SelectTrigger className="w-full">
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

          <div className="bank-recon-header-field">
            <label>Statement No.</label>
            <Input
              value={statementNo}
              onChange={(e) => setStatementNo(e.target.value)}
              placeholder="e.g. 202602"
              className="w-[120px]"
            />
          </div>

          <div className="bank-recon-header-field">
            <label>Statement Date</label>
            <Input
              type="date"
              value={statementDate}
              onChange={(e) => setStatementDate(e.target.value)}
              className="w-[140px]"
            />
          </div>

          <div className="bank-recon-header-field">
            <label>Ending Balance</label>
            <Input
              type="number"
              step="0.01"
              value={statementBalance}
              onChange={(e) => setStatementBalance(e.target.value)}
              placeholder="0.00"
              className="w-[140px]"
            />
          </div>

          <div className="bank-recon-header-field border-l pl-4 border-muted">
            <label>Last Reconciled Bal.</label>
            <span className="value">LKR {fmt(lastStatementBalance)}</span>
          </div>

          <div className="ml-auto flex items-center gap-2 pr-4 pt-1">
             <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)}>
               <Upload className="w-4 h-4 mr-1" /> Import Statement
             </Button>
             {statementTxns.length > 0 && (
               <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" onClick={() => setShowClearConfirm(true)}>
                 <Trash2 className="w-4 h-4 mr-1" /> Clear
               </Button>
             )}
             <Button variant="secondary" size="sm" onClick={runAutoMatch} disabled={statementTxns.length === 0 || bookTxns.length === 0}>
               <Sparkles className="w-4 h-4 mr-1" /> Auto Match
             </Button>
             <Button variant="outline" size="sm" onClick={() => setShowReport(true)} disabled={Object.keys(clearedState).length === 0}>
               <Printer className="w-4 h-4 mr-1" /> Report
             </Button>
             <Button variant="ghost" size="icon" className="w-8 h-8 ml-2 hover:bg-muted" onClick={() => setIsFullscreen(!isFullscreen)}>
               {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
             </Button>
          </div>
        </div>
      </CardHeader>

      {selectedAccountId && (matchTally.selectedStatementVal !== 0 || matchTally.selectedBookVal !== 0) && (
         <div className="bg-primary/5 border-b border-primary/20 px-6 py-2 flex items-center justify-between text-sm flex-shrink-0 z-10">
            <div className="flex items-center gap-6">
               <span className="font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> Selected Statement: LKR {fmt(matchTally.selectedStatementVal)}
               </span>
               <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
               <span className="font-semibold flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" /> Selected Book: LKR {fmt(matchTally.selectedBookVal)}
               </span>
               {matchTally.diff === 0 ? (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full font-semibold flex items-center gap-1 text-xs">
                     <CheckCircle className="w-3 h-3" /> MATCHED
                  </span>
               ) : (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full font-semibold flex items-center gap-1 text-xs">
                     <AlertTriangle className="w-3 h-3" /> DIFF: LKR {fmt(Math.abs(matchTally.diff))}
                  </span>
               )}
            </div>
            {Object.keys(suggestedMatches).length > 0 && (
               <Button size="sm" variant="default" onClick={acceptAllMatches} className="h-7 text-xs">
                  Accept All Auto-Matches
               </Button>
            )}
         </div>
      )}

      {/* ========================= SPLIT VIEW TABLES ========================= */}
      <CardContent className="p-0 flex flex-1 overflow-hidden relative">
        {!selectedAccountId ? (
          <div className="bank-recon-empty m-auto">
            <Landmark />
            <p className="text-lg font-medium">Select a Bank Account</p>
            <p className="text-sm text-muted-foreground">Choose an account above to begin reconciliation</p>
          </div>
        ) : txnLoading ? (
          <div className="bank-recon-empty m-auto">
            <Search className="animate-pulse" />
            <p>Loading transactions…</p>
          </div>
        ) : (
          <div className="flex flex-col w-full h-full relative">
            {/* Headers row (Sticky) */}
            <div className="flex w-full divide-x divide-border border-b sticky top-0 z-10 bg-background shadow-sm flex-shrink-0">
                <div className="flex-1 flex justify-between items-center px-4 py-2 bg-muted/10">
                   <span className="flex items-center gap-2 font-semibold text-sm"><FileText className="w-4 h-4 text-blue-600" /> Bank Statement</span>
                   <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">{statementTxns.length} items</span>
                </div>
                <div className="flex-1 flex justify-between items-center px-4 py-2">
                   <span className="flex items-center gap-2 font-semibold text-sm"><BookOpen className="w-4 h-4 text-emerald-600" /> System Records (Book)</span>
                   <div className="flex gap-2">
                      <Select value={displayFilter} onValueChange={(v) => setDisplayFilter(v as DisplayFilter)}>
                        <SelectTrigger className="h-6 text-xs w-[120px] bg-muted/50 border-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="not_cleared">Unreconciled</SelectItem>
                          <SelectItem value="cleared">Cleared Only</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">{bookTxns.length} items</span>
                   </div>
                </div>
            </div>

            {/* Scrollable Container */}
            <div className="flex-1 overflow-auto bg-muted/5">
                {groupedByDate.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground text-sm">No transactions found for the selected criteria.</div>
                ) : (
                  <div className="pb-12">
                     {groupedByDate.map((group) => (
                        <div key={group.date} className="flex flex-col border-b border-border shadow-sm">
                           {/* Date Header Badge */}
                           <div className="w-full bg-accent/40 py-1.5 px-4 text-[11px] font-bold text-muted-foreground tracking-wider uppercase border-y flex items-center justify-center sticky top-0 z-10 backdrop-blur">
                              {format(new Date(group.date), "dd MMM yyyy")}
                           </div>
                           
                           {/* Row Content */}
                           <div className="flex w-full divide-x divide-border">
                              {/* Left side (Statement) */}
                              <div className="flex-1 bg-background flex flex-col">
                                 {group.statement.length === 0 ? (
                                    <div className="flex-1 flex items-center justify-center text-[10px] text-muted-foreground/40 italic py-4 bg-muted/5">No statement entries</div>
                                 ) : (
                                    <table className="w-full text-xs table-fixed">
                                       <tbody>
                                          {group.statement.map(t => {
                                             const isCleared = clearedState[t.id]?.cleared || t.is_reconciled;
                                             const isSuggested = suggestedMatches[t.id];
                                             // Guard: if both are non-zero (bad data), use transaction_type to pick one
                                             let deposit = t.debit_amount || 0;
                                             let payment = t.credit_amount || 0;
                                             if (deposit > 0 && payment > 0) {
                                               if (t.transaction_type === 'deposit') { payment = 0; }
                                               else { deposit = 0; }
                                             }
                                             const rowClass = isCleared ? "bg-blue-50/50 dark:bg-blue-900/10" : isSuggested ? "bg-green-50/50 dark:bg-green-900/10 border-l-2 border-green-500" : "hover:bg-accent/50";
                                             return (
                                                <tr key={t.id} className={`border-b border-border/50 cursor-pointer transition-colors ${rowClass}`} onClick={() => toggleCleared(t.id, payment, deposit)}>
                                                   <td className="w-[30px] p-2 align-top text-center"><input type="checkbox" checked={isCleared} onChange={() => {}} className="cursor-pointer" /></td>
                                                   <td className="p-2 align-top">
                                                      <div className="font-medium text-[11px] leading-tight truncate" title={t.description}>{t.description}</div>
                                                      {t.reference && <div className="text-[9px] font-mono text-muted-foreground mt-0.5">{t.reference}</div>}
                                                   </td>
                                                   <td className="w-[80px] p-2 align-top text-right text-red-600 font-medium">{payment > 0 ? fmt(payment) : ""}</td>
                                                   <td className="w-[80px] p-2 align-top text-right text-green-600 font-medium">{deposit > 0 ? fmt(deposit) : ""}</td>
                                                </tr>
                                             );
                                          })}
                                       </tbody>
                                    </table>
                                 )}
                              </div>

                              {/* Right side (Book) */}
                              <div className="flex-1 bg-background flex flex-col">
                                 {group.book.length === 0 ? (
                                    <div className="flex-1 flex items-center justify-center text-[10px] text-muted-foreground/40 italic py-4 bg-muted/5">No system entries</div>
                                 ) : (
                                    <table className="w-full text-xs table-fixed">
                                       <tbody>
                                          {group.book.map(t => {
                                             const isCleared = clearedState[t.id]?.cleared || t.is_reconciled;
                                             const isSuggested = Object.values(suggestedMatches).includes(t.id);
                                             // Guard: if both are non-zero (bad data), use transaction_type to pick one
                                             let deposit = t.debit_amount || 0;
                                             let payment = t.credit_amount || 0;
                                             if (deposit > 0 && payment > 0) {
                                               if (t.transaction_type === 'deposit') { payment = 0; }
                                               else { deposit = 0; }
                                             }
                                             const source = sourceLabel(t.source_type);
                                             const rowClass = isCleared ? "bg-blue-50/50 dark:bg-blue-900/10" : isSuggested ? "bg-green-50/50 dark:bg-green-900/10 border-r-2 border-green-500" : "hover:bg-accent/50";
                                             return (
                                                <tr key={t.id} className={`border-b border-border/50 cursor-pointer transition-colors ${rowClass}`} onClick={() => !t.is_reconciled && toggleCleared(t.id, payment, deposit)}>
                                                   <td className="w-[30px] p-2 align-top text-center"><input type="checkbox" checked={isCleared} disabled={t.is_reconciled} onChange={() => {}} className="cursor-pointer" /></td>
                                                   <td className="w-[40px] p-2 align-top"><span className={`${source.className} scale-75 origin-top-left inline-block`}>{source.text}</span></td>
                                                   <td className="p-2 align-top">
                                                      <div className="font-medium text-[11px] leading-tight truncate" title={t.description || ''}>{t.description || t.transaction_type}</div>
                                                      <div className="text-[9px] font-mono text-muted-foreground mt-0.5">{t.reference || t.cheque_number || t.id.substring(0,8)}</div>
                                                   </td>
                                                   <td className="w-[80px] p-2 align-top text-right text-red-600 font-medium">{payment > 0 ? fmt(payment) : ""}</td>
                                                   <td className="w-[80px] p-2 align-top text-right text-emerald-600 font-medium">{deposit > 0 ? fmt(deposit) : ""}</td>
                                                </tr>
                                             );
                                          })}
                                       </tbody>
                                    </table>
                                 )}
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
                )}
            </div>
          </div>
        )}
      </CardContent>

      {/* ========================= SUMMARY FOOTER ========================= */}
      {selectedAccountId && (
        <div className="bank-recon-summary flex-shrink-0 z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
          {/* LEFT: Adjustments */}
          <div className="bank-recon-summary-left flex-1 border-r border-border pr-6">
             <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Adjustments</span>
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setShowAdjustments(true)}>
                  <SlidersHorizontal className="w-3 h-3 mr-1" /> Add
                </Button>
             </div>
            
            {adjustments.length === 0 ? (
               <div className="text-xs text-muted-foreground italic">No manual adjustments</div>
            ) : (
               <div className="bank-recon-adjustments-list mt-1 space-y-1">
                 {adjustments.map((adj, i) => (
                   <div key={i} className="flex justify-between items-center text-[11px] py-0.5 group bg-muted/30 px-2 rounded">
                     <div className="flex gap-2 items-center">
                       <span className={`w-1.5 h-1.5 rounded-full ${adj.type === 'interest_earned' ? 'bg-green-500' : 'bg-red-500'}`} />
                       <span className="font-medium text-foreground/80 truncate max-w-[150px]">{adj.description}</span>
                     </div>
                     <div className="flex gap-2 items-center">
                       <span className={adj.type === 'interest_earned' ? 'text-green-600 font-mono' : 'text-red-600 font-mono'}>
                         {adj.type === 'interest_earned' ? '+' : '-'} {fmt(adj.amount)}
                       </span>
                       <button 
                         onClick={() => removeAdjustment(i)}
                         className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                       >
                         <X className="w-3 h-3" />
                       </button>
                     </div>
                   </div>
                 ))}
               </div>
            )}
          </div>

          {/* RIGHT: Cleared Book Balance / Target Balance / Difference */}
          <div className="bank-recon-summary-right flex-[1.5] pl-6 py-1">
            <div className="bank-recon-balance-row text-sm py-0.5">
              <span className="balance-label text-muted-foreground">Cleared Book Balance</span>
              <span className={`balance-value font-mono ${summary.clearedBookBalance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                LKR {fmt(summary.clearedBookBalance)}
              </span>
            </div>
            <div className="bank-recon-balance-row text-sm py-0.5 border-b border-muted pb-1 mb-1">
              <span className="balance-label font-medium">Statement Ending Balance</span>
              <span className="balance-value neutral font-mono font-bold">
                LKR {fmt(summary.stmtEndBal)}
              </span>
            </div>
            <div className="bank-recon-balance-row difference-row text-base">
              <span className="balance-label font-bold uppercase tracking-wide">Difference</span>
              <span className={`balance-value font-mono font-bold ${summary.difference === 0 ? "text-green-600" : "text-red-600"}`}>
                {summary.difference === 0 ? (
                  <><CheckCircle className="inline w-5 h-5 mr-1" />LKR 0.00</>
                ) : (
                  <><AlertTriangle className="inline w-5 h-5 mr-1" />LKR {fmt(Math.abs(summary.difference))}</>
                )}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 mt-3 pt-2">
               <Button variant="outline" size="sm" onClick={handleCancel}>Cancel</Button>
               <Button size="sm" onClick={handleSave} disabled={isSaveDisabled || summary.difference !== 0} className={summary.difference === 0 ? "bg-green-600 hover:bg-green-700 text-white" : ""}>
                 <Save className="w-4 h-4 mr-2" />
                 {saveReconciliation.isPending ? "Saving…" : summary.difference === 0 ? "Complete Reconcile" : "Save Draft"}
               </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================= ADJUSTMENTS DIALOG ========================= */}
      <Dialog open={showAdjustments} onOpenChange={setShowAdjustments}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Adjustment</DialogTitle>
          </DialogHeader>
          <div className="adjustments-form space-y-4 py-4">
            <div className="space-y-2">
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
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={adjAmount}
                onChange={(e) => setAdjAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
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
          setSuggestedMatches({});
          queryClient.invalidateQueries({ queryKey: ["bank-transactions-recon"] });
        }}
      />

      {/* ========================= CLEAR STATEMENT CONFIRMATION ========================= */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" /> Clear Imported Statement?
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              This will permanently delete <strong className="text-foreground">{statementTxns.length} imported statement entries</strong> for this bank account.
            </p>
            <p className="text-sm text-muted-foreground">
              System-generated records (AP payments, AR receipts, etc.) on the Book side will <strong className="text-foreground">NOT</strong> be affected.
            </p>
            <p className="text-sm font-medium">After clearing, you can import a fresh bank statement file.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearConfirm(false)} disabled={isClearing}>Cancel</Button>
            <Button variant="destructive" onClick={handleClearStatement} disabled={isClearing}>
              <Trash2 className="w-4 h-4 mr-2" />
              {isClearing ? "Clearing..." : `Clear ${statementTxns.length} Entries`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================= RECONCILIATION REPORT ========================= */}
      <BankReconciliationReport
        open={showReport}
        onOpenChange={setShowReport}
        bankAccount={selectedAccount}
        statementDate={statementDate}
        statementNo={statementNo}
        statementBalance={parseFloat(statementBalance) || 0}
        lastStatementBalance={lastStatementBalance}
        clearedState={clearedState}
        transactions={transactions}
        adjustments={adjustments}
        summary={summary}
      />
    </Card>
  );
};

export { BankReconciliationWorksheet };
