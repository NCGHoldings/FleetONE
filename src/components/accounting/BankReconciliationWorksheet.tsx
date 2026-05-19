import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBankAccounts, useBankTransactionsForRecon, useLastReconciliation, useDraftReconciliation, useChartOfAccounts } from "@/hooks/useAccountingData";
import { useSaveBankReconciliation, useSaveDraftReconciliation, useDeleteDraftReconciliation } from "@/hooks/useAccountingMutations";
import { Landmark, Save, X, SlidersHorizontal, FileText, AlertTriangle, Upload, CheckCircle, ArrowRightLeft, Search, Sparkles, BookOpen, Maximize, Minimize, Trash2, Printer, Plus, Pencil, Zap, BarChart3, Eye, EyeOff, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
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

/** Extract payee name from description patterns like "AP Payment to Vendor Name - PAY-001" or "AR Receipt from Customer - REC-001" */
const extractPayee = (description: string | null | undefined): string => {
  if (!description) return "—";
  // Pattern: "AP Payment to <Payee> - <DocNo>" or "AP Payment to <Payee> (Payment: ...)"
  const apMatch = description.match(/(?:Payment|Refund)\s+(?:to|from)\s+(.+?)(?:\s+-\s+|\s+\()/i);
  if (apMatch) return apMatch[1].trim();
  // Pattern: "AR Receipt from <Payee> - <DocNo>"
  const arMatch = description.match(/Receipt\s+(?:from|to)\s+(.+?)(?:\s+-\s+|\s+\()/i);
  if (arMatch) return arMatch[1].trim();
  // Pattern: "Bank fee (...) - AR Receipt <DocNo> from <Payee>"
  const feeMatch = description.match(/from\s+(.+?)$/i);
  if (feeMatch && description.toLowerCase().includes('fee')) return feeMatch[1].trim();
  // Petty cash / manual: just use first meaningful segment
  const dashSplit = description.split(' - ');
  if (dashSplit.length > 1) return dashSplit[0].trim();
  return description.length > 30 ? description.substring(0, 30) + '…' : description;
};

/** Extract document number from description patterns like "AP Payment to Vendor - PAY-001" */
const extractDocNo = (t: any): string => {
  // Prefer the reference field directly (most reliable)
  if (t.reference) return t.reference;
  // Fallback: extract from description after the last " - "
  const desc = t.description || '';
  const match = desc.match(/\s+-\s+([A-Z]{2,5}-\d[\w-]*)/);
  if (match) return match[1];
  // Last fallback: source_type prefix + short ID
  return t.id?.substring(0, 8) || '—';
};

const sourceLabel = (sourceType: string | null | undefined): { text: string; className: string } => {
  switch (sourceType) {
    case "ap_payment": return { text: "AP", className: "source-badge source-ap" };
    case "ar_receipt": return { text: "AR", className: "source-badge source-ar" };
    case "bank_fee": return { text: "FEE", className: "source-badge source-fee" };
    case "inter_bank_transfer": return { text: "IBT", className: "source-badge source-ibt" };
    case "journal_entry": return { text: "JE", className: "source-badge source-je" };
    case "reversal": return { text: "REV", className: "source-badge source-rev" };
    default: 
      if (sourceType?.startsWith('statement_import')) return { text: "STMT", className: "source-badge source-stmt" };
      return { text: "MAN", className: "source-badge source-man" };
  }
};

// ================ COMPONENT ================
const BankReconciliationWorksheet = () => {
  const queryClient = useQueryClient();
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  // --- Data hooks ---
  const { data: bankAccounts = [], isLoading: acctLoading } = useBankAccounts();
  const { data: chartOfAccounts = [] } = useChartOfAccounts();
  const coaList = (chartOfAccounts || []) as Array<{ id: string; account_code: string; account_name: string; account_type: string; is_active: boolean }>;
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
  const [openingBalanceInput, setOpeningBalanceInput] = useState<string>("");
  const [displayFilter, setDisplayFilter] = useState<DisplayFilter>("not_cleared");
  const [clearedState, setClearedState] = useState<ClearedState>({});
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddType, setQuickAddType] = useState<"payment" | "deposit">("payment");
  const [quickAddAmount, setQuickAddAmount] = useState("");
  const [quickAddDesc, setQuickAddDesc] = useState("");
  const [quickAddRef, setQuickAddRef] = useState("");
  const [quickAddDate, setQuickAddDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [editingTxnId, setEditingTxnId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState("");
  const [showGapsPanel, setShowGapsPanel] = useState(false);
  const [quickAddGLAccountId, setQuickAddGLAccountId] = useState<string>("");
  const [quickAddGLSearch, setQuickAddGLSearch] = useState("");
  const [suggestedGLAccount, setSuggestedGLAccount] = useState<{ id: string; code: string; name: string } | null>(null);
  const [showReversalDialog, setShowReversalDialog] = useState(false);
  const [reversalTarget, setReversalTarget] = useState<any>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [reversalDate, setReversalDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isReversing, setIsReversing] = useState(false);
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
  const statementOpeningBalance = openingBalanceInput !== "" ? parseFloat(openingBalanceInput) : lastStatementBalance;
  const targetBalance = parseFloat(statementBalance) || 0;

  // Build a set of "fully paired" IDs — both statement+book sides cleared
  const pairedClearedIds = useMemo(() => {
    const allTxns = transactions;
    const clearedIds = Object.keys(clearedState).filter(id => clearedState[id]?.cleared);
    const clearedStmtIds = clearedIds.filter(id => allTxns.find(t => t.id === id)?.source_type?.startsWith('statement_import'));
    const clearedBookIds = clearedIds.filter(id => { const t = allTxns.find(tx => tx.id === id); return t && !t.source_type?.startsWith('statement_import'); });
    // A pair is "complete" if both sides have at least one cleared entry
    // For not_cleared filter: hide individual items only if they are cleared
    // But the user wants: hide BOTH sides only when BOTH are ticked
    // We'll track which cleared items have a counterpart on the other side
    const paired = new Set<string>();
    clearedStmtIds.forEach(stId => {
      // Find if there's a matched book entry in cleared state
      const stTxn = allTxns.find(t => t.id === stId);
      if (!stTxn) return;
      const stAmt = (stTxn.debit_amount || 0) > 0 ? (stTxn.debit_amount || 0) : -(stTxn.credit_amount || 0);
      const matchedBook = clearedBookIds.find(bkId => {
        if (paired.has(bkId)) return false;
        const bkTxn = allTxns.find(t => t.id === bkId);
        if (!bkTxn) return false;
        const bkAmt = (bkTxn.debit_amount || 0) > 0 ? (bkTxn.debit_amount || 0) : -(bkTxn.credit_amount || 0);
        return stAmt === bkAmt;
      });
      if (matchedBook) {
        paired.add(stId);
        paired.add(matchedBook);
      }
    });
    return paired;
  }, [transactions, clearedState]);

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
      // Hide only fully paired items (both sides ticked)
      return base.filter((t) => !pairedClearedIds.has(t.id) && !t.is_reconciled);
    }
    return base;
  }, [transactions, displayFilter, clearedState, pairedClearedIds]);

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

    const bookBalance = statementOpeningBalance + depositTotal - paymentTotal;
    const clearedBookBalance = statementOpeningBalance + clearedDepositTotal - clearedPaymentTotal + adjDepositTotal - adjPaymentTotal;
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
  }, [bookTxns, clearedState, statementOpeningBalance, targetBalance, adjustments]);

  // --- Gap Detection: find unmatched items on each side ---
  const gapAnalysis = useMemo(() => {
    const usedBookIds = new Set<string>();
    const usedStmtIds = new Set<string>();

    // First pass: find exact matches (amount + date within 3 days)
    statementTxns.forEach(st => {
      if (clearedState[st.id]?.cleared || st.is_reconciled) { usedStmtIds.add(st.id); return; }
      const stAmt = (st.debit_amount || 0) > 0 ? (st.debit_amount || 0) : (st.credit_amount || 0);
      const stDate = new Date(st.transaction_date).getTime();

      const match = bookTxns.find(bt => {
        if (usedBookIds.has(bt.id) || clearedState[bt.id]?.cleared || bt.is_reconciled) return false;
        const btAmt = (bt.debit_amount || 0) > 0 ? (bt.debit_amount || 0) : (bt.credit_amount || 0);
        if (stAmt !== btAmt) return false;
        const diffDays = Math.abs(new Date(bt.transaction_date).getTime() - stDate) / (1000 * 60 * 60 * 24);
        return diffDays <= 5;
      });

      if (match) {
        usedStmtIds.add(st.id);
        usedBookIds.add(match.id);
      }
    });

    const unmatchedStatement = statementTxns.filter(t => !usedStmtIds.has(t.id) && !clearedState[t.id]?.cleared && !t.is_reconciled);
    const unmatchedBook = bookTxns.filter(t => !usedBookIds.has(t.id) && !clearedState[t.id]?.cleared && !t.is_reconciled);

    const matchedCount = usedStmtIds.size;
    const totalItems = statementTxns.length + bookTxns.length;
    const matchedItems = matchedCount * 2; // both sides
    const matchPct = totalItems > 0 ? Math.round((matchedItems / totalItems) * 100) : 0;

    const unmatchedStmtTotal = unmatchedStatement.reduce((s, t) => s + ((t.debit_amount || 0) > 0 ? (t.debit_amount || 0) : (t.credit_amount || 0)), 0);
    const unmatchedBookTotal = unmatchedBook.reduce((s, t) => s + ((t.debit_amount || 0) > 0 ? (t.debit_amount || 0) : (t.credit_amount || 0)), 0);

    return { unmatchedStatement, unmatchedBook, matchedCount, matchPct, unmatchedStmtTotal, unmatchedBookTotal, totalItems };
  }, [statementTxns, bookTxns, clearedState]);

  // Pre-fill Quick Add from an unmatched statement item
  const handleQuickAddFromStatement = useCallback(async (stmtTxn: any) => {
    const deposit = stmtTxn.debit_amount || 0;
    const payment = stmtTxn.credit_amount || 0;
    setQuickAddType(deposit > 0 ? 'deposit' : 'payment');
    setQuickAddAmount(String(deposit > 0 ? deposit : payment));
    setQuickAddDesc(stmtTxn.description || extractPayee(stmtTxn.description) || '');
    setQuickAddRef(stmtTxn.reference || stmtTxn.cheque_number || '');
    setQuickAddDate(format(new Date(stmtTxn.transaction_date), 'yyyy-MM-dd'));
    setQuickAddGLAccountId('');
    setSuggestedGLAccount(null);

    // Pattern lookup: find previously used GL account for similar descriptions
    if (effectiveCompanyId && stmtTxn.description) {
      try {
        const descKey = (stmtTxn.description || '').substring(0, 30).replace(/[^a-zA-Z0-9 ]/g, '%');
        const { data: patterns } = await (supabase as any)
          .from('bank_reconciliation_patterns')
          .select('gl_account_id, description_pattern, confidence_count')
          .eq('company_id', effectiveCompanyId)
          .ilike('description_pattern', `%${descKey.substring(0, 15)}%`)
          .order('confidence_count', { ascending: false })
          .limit(1);

        if (patterns && patterns.length > 0 && patterns[0].gl_account_id) {
          const matchedAccount = coaList.find(a => a.id === patterns[0].gl_account_id);
          if (matchedAccount) {
            setQuickAddGLAccountId(matchedAccount.id);
            setSuggestedGLAccount({
              id: matchedAccount.id,
              code: matchedAccount.account_code,
              name: matchedAccount.account_name
            });
          }
        }
      } catch {
        // Pattern table may not exist yet — ignore
      }
    }

    setShowQuickAdd(true);
  }, [effectiveCompanyId, coaList]);

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
      
      // CLEARING logic
      const next = { ...prev, [txnId]: { cleared: true, clearedAmount: fullAmount } };
      
      // 1. Calculate the current running totals of selected items
      let stmtSelected = 0;
      let bookSelected = 0;
      Object.keys(next).forEach(id => {
         if (next[id].cleared) {
            const stTxn = statementTxns.find(t => t.id === id);
            if (stTxn) stmtSelected += ((stTxn.debit_amount || 0) > 0 ? (stTxn.debit_amount || 0) : -(stTxn.credit_amount || 0));
            const bkTxn = bookTxns.find(t => t.id === id);
            if (bkTxn) bookSelected += ((bkTxn.debit_amount || 0) > 0 ? (bkTxn.debit_amount || 0) : -(bkTxn.credit_amount || 0));
         }
      });
      
      const diff = stmtSelected - bookSelected;
      
      // 2. If there's a difference, see if EXACTLY ONE unselected item can close the gap
      if (diff !== 0) {
         let matchCandidate = null;
         const targetAmount = Math.abs(diff);
         
         // Helper to find a candidate in a list
         const findCandidate = (list: any[], needDeposit: boolean) => {
            const matches = list.filter(t => {
               if (t.is_reconciled || next[t.id]?.cleared) return false;
               const d = t.debit_amount || 0;
               const p = t.credit_amount || 0;
               if (needDeposit && d === targetAmount) return true;
               if (!needDeposit && p === targetAmount) return true;
               return false;
            });
            // Only auto-match if there is exactly 1 obvious candidate, or pick the closest by date
            if (matches.length > 0) {
               // sort by date
               matches.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
               return matches[0];
            }
            return null;
         };

         if (diff > 0) {
            // Statement is larger. We need a Book Deposit OR a Statement Payment
            matchCandidate = findCandidate(bookTxns, true) || findCandidate(statementTxns, false);
         } else {
            // Book is larger. We need a Statement Deposit OR a Book Payment
            matchCandidate = findCandidate(statementTxns, true) || findCandidate(bookTxns, false);
         }
         
         if (matchCandidate) {
             const amt = (matchCandidate.credit_amount || 0) > 0 ? (matchCandidate.credit_amount || 0) : (matchCandidate.debit_amount || 0);
             next[matchCandidate.id] = { cleared: true, clearedAmount: amt };
             toast.success(`Smart Auto-Match: Found remaining LKR ${amt.toLocaleString()} to balance the selection!`);
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

  // --- Quick-Add Missing Entry ---
  const handleQuickAdd = useCallback(async () => {
    if (!selectedAccountId) return toast.error("Select a bank account first");
    const amount = parseFloat(quickAddAmount);
    if (!amount || amount <= 0) return toast.error("Enter a valid amount");
    if (!quickAddDesc.trim()) return toast.error("Enter a description");

    try {
      const insertData: any = {
        bank_account_id: selectedAccountId,
        transaction_date: quickAddDate,
        description: quickAddDesc.trim(),
        reference: quickAddRef.trim() || null,
        transaction_type: quickAddType,
        source_type: 'manual',
        debit_amount: quickAddType === 'deposit' ? amount : 0,
        credit_amount: quickAddType === 'payment' ? amount : 0,
        is_reconciled: false,
        company_id: effectiveCompanyId,
      };

      const { error } = await (supabase as any)
        .from('bank_transactions')
        .insert([insertData]);
      if (error) throw error;

      toast.success(`Added ${quickAddType} of LKR ${fmt(amount)} to book records`);

      // Save pattern for future auto-suggestions
      if (quickAddGLAccountId && quickAddDesc.trim() && effectiveCompanyId) {
        try {
          const descPattern = quickAddDesc.trim().substring(0, 50);
          const { data: existing } = await (supabase as any)
            .from('bank_reconciliation_patterns')
            .select('id, confidence_count')
            .eq('company_id', effectiveCompanyId)
            .eq('bank_account_id', selectedAccountId)
            .eq('description_pattern', descPattern)
            .eq('transaction_type', quickAddType)
            .maybeSingle();

          if (existing) {
            await (supabase as any)
              .from('bank_reconciliation_patterns')
              .update({
                gl_account_id: quickAddGLAccountId,
                confidence_count: (existing.confidence_count || 1) + 1,
                last_used_at: new Date().toISOString(),
              })
              .eq('id', existing.id);
          } else {
            await (supabase as any)
              .from('bank_reconciliation_patterns')
              .insert({
                company_id: effectiveCompanyId,
                bank_account_id: selectedAccountId,
                description_pattern: descPattern,
                reference_pattern: quickAddRef.trim() || null,
                gl_account_id: quickAddGLAccountId,
                transaction_type: quickAddType,
              });
          }
        } catch {
          // Pattern save is best-effort — don't block the main operation
        }
      }

      setShowQuickAdd(false);
      setQuickAddAmount("");
      setQuickAddDesc("");
      setQuickAddRef("");
      setQuickAddGLAccountId("");
      setSuggestedGLAccount(null);
      queryClient.invalidateQueries({ queryKey: ['bank-transactions-recon'] });
    } catch (err: any) {
      toast.error(`Failed to add entry: ${err.message}`);
    }
  }, [selectedAccountId, quickAddAmount, quickAddDesc, quickAddRef, quickAddDate, quickAddType, queryClient]);

  // --- Reverse Transaction ---
  const handleReverseTransaction = useCallback(async () => {
    if (!reversalTarget || !selectedAccountId) return;
    if (!reversalReason.trim()) return toast.error("Please enter a reason for the reversal");

    setIsReversing(true);
    try {
      const orig = reversalTarget;
      const origDebit = orig.debit_amount || 0;
      const origCredit = orig.credit_amount || 0;

      // 1. Create offsetting bank_transaction with swapped debit/credit
      const reversalInsert: any = {
        bank_account_id: selectedAccountId,
        transaction_date: reversalDate,
        transaction_type: origDebit > 0 ? 'payment' : 'deposit', // opposite of original
        description: `REVERSAL: ${orig.description || 'N/A'} — Reason: ${reversalReason.trim()}`,
        debit_amount: origCredit,   // swap
        credit_amount: origDebit,   // swap
        reference: `REV-${orig.reference || orig.id?.substring(0, 8) || ''}`,
        cheque_number: orig.cheque_number ? `REV-${orig.cheque_number}` : null,
        source_type: 'reversal',
        source_id: orig.id,
        is_reconciled: false,
        company_id: effectiveCompanyId,
      };

      const { data: reversalTxn, error: revError } = await (supabase as any)
        .from('bank_transactions')
        .insert([reversalInsert])
        .select()
        .single();
      if (revError) throw revError;

      // 2. Un-reconcile the original transaction if it was reconciled
      if (orig.is_reconciled) {
        await (supabase as any)
          .from('bank_transactions')
          .update({
            is_reconciled: false,
            reconciled_at: null,
            reconciliation_id: null,
          })
          .eq('id', orig.id);
      }

      // 3. Auto-post reversing Journal Entry via GL
      try {
        // Fetch bank account's GL link
        const { data: bankAcct } = await supabase
          .from('bank_accounts')
          .select('gl_account_id, account_name')
          .eq('id', selectedAccountId)
          .single();

        const bankGLId = bankAcct?.gl_account_id;

        if (bankGLId) {
          // Determine the contra GL account from the original JE if possible
          let contraGLId: string | null = null;

          if (orig.journal_entry_id) {
            // Fetch the original JE lines and find the non-bank line
            const { data: jeLines } = await supabase
              .from('journal_entry_lines')
              .select('account_id, debit, credit')
              .eq('journal_entry_id', orig.journal_entry_id);

            if (jeLines && jeLines.length > 0) {
              const contraLine = jeLines.find((l: any) => l.account_id !== bankGLId);
              if (contraLine) contraGLId = contraLine.account_id;
            }
          }

          // Fallback: use suspense/expense account from gl_settings
          if (!contraGLId) {
            const { data: glSettings } = await supabase
              .from('gl_settings')
              .select('expense_account_id')
              .eq('company_id', effectiveCompanyId!)
              .maybeSingle();
            contraGLId = glSettings?.expense_account_id || null;
          }

          if (contraGLId) {
            const { createAndPostJournalEntry } = await import('@/lib/gl-posting-utils');
            const { getBusinessUnitCode } = await import('@/contexts/CompanyContext').then(m => {
              // Use the already-available company context values
              return { getBusinessUnitCode: () => null };
            });

            await createAndPostJournalEntry({
              entry_date: reversalDate,
              description: `Bank Reversal: ${orig.description || 'N/A'} — ${reversalReason.trim()}`,
              reference: `REV-BANK-${orig.reference || orig.id?.substring(0, 8) || ''}`,
              company_id: effectiveCompanyId!,
              source_module: 'bank_reconciliation',
              lines: [
                {
                  account_id: bankGLId,
                  description: `Reversal of ${orig.description || 'bank transaction'}`,
                  debit: origCredit,   // swap
                  credit: origDebit,   // swap
                },
                {
                  account_id: contraGLId,
                  description: `Reversal of ${orig.description || 'bank transaction'}`,
                  debit: origDebit,    // swap (opposite of bank line)
                  credit: origCredit,  // swap
                },
              ],
            });
          } else {
            console.warn('[BankReversal] No contra GL account found — skipping JE reversal');
            toast.warning('Reversal created but no GL journal entry was posted (missing contra account).');
          }
        } else {
          console.warn('[BankReversal] Bank account has no GL link — skipping JE');
          toast.warning('Reversal created but no GL journal entry was posted (bank account not linked to GL).');
        }
      } catch (glErr: any) {
        // GL posting is best-effort — don't block the bank reversal
        console.warn('[BankReversal] GL reversal failed (non-fatal):', glErr);
        toast.warning('Bank reversal created but GL journal entry failed: ' + (glErr?.message || 'Unknown'));
      }

      toast.success(`Reversal entry created for LKR ${fmt(origDebit > 0 ? origDebit : origCredit)}`);

      // Reset dialog state
      setShowReversalDialog(false);
      setReversalTarget(null);
      setReversalReason("");
      setReversalDate(format(new Date(), "yyyy-MM-dd"));

      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: ['bank-transactions-recon'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['bank-reconciliations'] });
    } catch (err: any) {
      toast.error(`Reversal failed: ${err.message}`);
    } finally {
      setIsReversing(false);
    }
  }, [reversalTarget, selectedAccountId, reversalReason, reversalDate, effectiveCompanyId, queryClient]);

  // --- Inline Edit Amount ---
  const handleInlineAmountSave = useCallback(async (txnId: string, originalPayment: number, originalDeposit: number) => {
    const newAmount = parseFloat(editingAmount);
    if (!newAmount || newAmount <= 0) {
      setEditingTxnId(null);
      return toast.error("Invalid amount");
    }

    try {
      const updateData: any = originalPayment > 0
        ? { credit_amount: newAmount }
        : { debit_amount: newAmount };

      const { error } = await (supabase as any)
        .from('bank_transactions')
        .update(updateData)
        .eq('id', txnId);
      if (error) throw error;

      // Update cleared state if this txn was cleared
      if (clearedState[txnId]?.cleared) {
        setClearedState(prev => ({
          ...prev,
          [txnId]: { cleared: true, clearedAmount: newAmount }
        }));
      }

      toast.success(`Amount updated to LKR ${fmt(newAmount)}`);
      setEditingTxnId(null);
      queryClient.invalidateQueries({ queryKey: ['bank-transactions-recon'] });
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
    }
  }, [editingAmount, clearedState, queryClient]);

  // --- Explicit Manual Save Draft ---
  const handleManualSaveDraft = useCallback(() => {
    if (!selectedAccountId) return toast.error("Select a bank account");
    const clearedItems = Object.entries(clearedState)
      .filter(([, v]) => v.cleared)
      .map(([id, v]) => ({
        bank_transaction_id: id,
        cleared_amount: v.clearedAmount,
      }));

    saveDraft.mutate({
      bank_account_id: selectedAccountId,
      statement_date: statementDate,
      statement_no: statementNo,
      statement_balance: statementBalance,
      cleared_items: clearedItems,
    });
    toast.success("Draft saved successfully!");
  }, [selectedAccountId, clearedState, statementDate, statementNo, statementBalance, saveDraft]);

  const isSaveDisabled = useMemo(() => {
    if (saveReconciliation.isPending) return true;
    if (Object.keys(clearedState).length === 0 && adjustments.length === 0) return true;
    if (!statementBalance) return true;
    return false;
  }, [saveReconciliation.isPending, clearedState, statementBalance, adjustments]);

  const hasClearedItems = Object.values(clearedState).some(v => v.cleared);

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
            <label>Opening Balance</label>
            <Input
              type="number"
              step="0.01"
              value={openingBalanceInput}
              onChange={(e) => setOpeningBalanceInput(e.target.value)}
              placeholder={`${fmt(lastStatementBalance)}`}
              className="w-[120px]"
            />
          </div>

          <div className="bank-recon-header-field border-l pl-4 border-muted">
            <label>Last Reconciled Bal.</label>
            <span className="value text-xs text-muted-foreground pt-2">LKR {fmt(lastStatementBalance)}</span>
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
             <Button variant="outline" size="sm" onClick={() => setShowQuickAdd(true)} disabled={!selectedAccountId}>
               <Plus className="w-4 h-4 mr-1" /> Quick Add
             </Button>
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

      {/* ========================= HEALTH DASHBOARD ========================= */}
      {selectedAccountId && !txnLoading && (statementTxns.length > 0 || bookTxns.length > 0) && (
        <div className="flex-shrink-0 z-10 border-b bg-gradient-to-r from-background to-muted/20 px-6 py-3">
          <div className="flex items-center gap-6">
            {/* Progress bar */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
                  <BarChart3 className="w-3.5 h-3.5" /> Reconciliation Health
                </span>
                <span className={`text-xs font-bold ${gapAnalysis.matchPct >= 90 ? 'text-green-600' : gapAnalysis.matchPct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                  {gapAnalysis.matchPct}% Matched
                </span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${gapAnalysis.matchPct >= 90 ? 'bg-green-500' : gapAnalysis.matchPct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${gapAnalysis.matchPct}%` }}
                />
              </div>
            </div>

            {/* KPI chips */}
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold">
                <CheckCircle className="w-3 h-3" /> {gapAnalysis.matchedCount} Matched
              </span>
              {gapAnalysis.unmatchedStatement.length > 0 && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-semibold">
                  <AlertTriangle className="w-3 h-3" /> {gapAnalysis.unmatchedStatement.length} Missing from Book
                </span>
              )}
              {gapAnalysis.unmatchedBook.length > 0 && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-semibold">
                  <AlertTriangle className="w-3 h-3" /> {gapAnalysis.unmatchedBook.length} Missing from Statement
                </span>
              )}
            </div>

            {/* Toggle gaps panel */}
            {(gapAnalysis.unmatchedStatement.length > 0 || gapAnalysis.unmatchedBook.length > 0) && (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowGapsPanel(!showGapsPanel)}>
                {showGapsPanel ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                {showGapsPanel ? 'Hide' : 'View'} Gaps
              </Button>
            )}
          </div>

          {/* Expandable Gaps Panel */}
          {showGapsPanel && (
            <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-4">
              {/* Missing from Book */}
              {gapAnalysis.unmatchedStatement.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-red-600 mb-1.5 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Bank Statement Items — No Book Match ({gapAnalysis.unmatchedStatement.length})
                  </h4>
                  <div className="space-y-1 max-h-[140px] overflow-auto">
                    {gapAnalysis.unmatchedStatement.map(t => {
                      const amt = (t.debit_amount || 0) > 0 ? (t.debit_amount || 0) : (t.credit_amount || 0);
                      const isDeposit = (t.debit_amount || 0) > 0;
                      const ref = t.cheque_number || t.reference || '';
                      return (
                        <div key={t.id} className="flex items-center justify-between text-[11px] bg-red-50 dark:bg-red-900/10 rounded px-2 py-1.5 group">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="font-mono text-muted-foreground w-[65px] flex-shrink-0">{format(new Date(t.transaction_date), 'dd/MM/yy')}</span>
                            <span className="font-medium truncate max-w-[130px]" title={t.description || ''}>{extractPayee(t.description)}</span>
                            {ref && <span className="font-mono text-[9px] text-muted-foreground bg-muted px-1 rounded truncate max-w-[80px]" title={ref}>{ref}</span>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`font-mono font-semibold ${isDeposit ? 'text-green-600' : 'text-red-600'}`}>
                              {isDeposit ? '+' : '-'}{fmt(amt)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 text-[10px] px-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-primary/10 hover:bg-primary/20 text-primary"
                              onClick={() => handleQuickAddFromStatement(t)}
                            >
                              <Zap className="w-3 h-3 mr-0.5" /> Quick Add
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1 font-mono">Total: LKR {fmt(gapAnalysis.unmatchedStmtTotal)}</div>
                </div>
              )}
              {/* Missing from Statement */}
              {gapAnalysis.unmatchedBook.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-1.5 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> Book Items — No Statement Match ({gapAnalysis.unmatchedBook.length})
                  </h4>
                  <div className="space-y-1 max-h-[140px] overflow-auto">
                    {gapAnalysis.unmatchedBook.map(t => {
                      const amt = (t.debit_amount || 0) > 0 ? (t.debit_amount || 0) : (t.credit_amount || 0);
                      const isDeposit = (t.debit_amount || 0) > 0;
                      const ref = t.cheque_number || t.reference || '';
                      const source = sourceLabel(t.source_type);
                      return (
                        <div key={t.id} className="flex items-center justify-between text-[11px] bg-amber-50 dark:bg-amber-900/10 rounded px-2 py-1.5">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className={`${source.className} scale-[0.65] origin-top-left inline-block flex-shrink-0`}>{source.text}</span>
                            <span className="font-mono text-muted-foreground w-[65px] flex-shrink-0">{format(new Date(t.transaction_date), 'dd/MM/yy')}</span>
                            <span className="font-medium truncate max-w-[110px]" title={t.description || ''}>{extractPayee(t.description)}</span>
                            {ref && <span className="font-mono text-[9px] text-muted-foreground bg-muted px-1 rounded truncate max-w-[80px]" title={ref}>{ref}</span>}
                          </div>
                          <span className={`font-mono font-semibold flex-shrink-0 ${isDeposit ? 'text-green-600' : 'text-red-600'}`}>
                            {isDeposit ? '+' : '-'}{fmt(amt)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1 font-mono">Total: LKR {fmt(gapAnalysis.unmatchedBookTotal)}</div>
                </div>
              )}
            </div>
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
            <div className="flex flex-col w-full sticky top-0 z-10 bg-background shadow-sm flex-shrink-0">
              {/* Section titles */}
              <div className="flex w-full divide-x divide-border border-b">
                <div className="flex-1 flex justify-between items-center px-4 py-2 bg-muted/10">
                   <span className="flex items-center gap-2 font-semibold text-sm"><FileText className="w-4 h-4 text-blue-600" /> Bank Statement</span>
                   <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">{statementTxns.length} items</span>
                </div>
                <div className="flex-1 flex justify-between items-center px-4 py-2">
                   <span className="flex items-center gap-2 font-semibold text-sm"><BookOpen className="w-4 h-4 text-emerald-600" /> System Records (Book)</span>
                    <div className="flex gap-2 items-center">
                      <DateRangePicker 
                        value={{ 
                          from: fromDate ? new Date(fromDate) : undefined, 
                          to: toDate ? new Date(toDate) : undefined 
                        }}
                        onDateRangeChange={(range) => {
                          setFromDate(range?.from ? format(range.from, 'yyyy-MM-dd') : '');
                          setToDate(range?.to ? format(range.to, 'yyyy-MM-dd') : '');
                        }}
                        className="w-[280px]"
                      />
                      <Select value={displayFilter} onValueChange={(v) => setDisplayFilter(v as DisplayFilter)}>
                        <SelectTrigger className="h-6 text-xs w-[140px] bg-muted/50 border-0">
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
              {/* Column headers */}
              <div className="flex w-full divide-x divide-border border-b bg-muted/30">
                {/* Statement column headers */}
                <div className="flex-1">
                  <table className="w-full text-[10px] table-fixed">
                    <thead>
                      <tr className="text-muted-foreground font-semibold uppercase tracking-wider">
                        <th className="w-[28px] p-1"></th>
                        <th className="w-[68px] p-1 text-left">Date</th>
                        <th className="w-[90px] p-1 text-left">Doc No</th>
                        <th className="p-1 text-left">Payee Name</th>
                        <th className="w-[90px] p-1 text-right">Amount</th>
                        <th className="w-[90px] p-1 text-left">Chq/Ref</th>
                      </tr>
                    </thead>
                  </table>
                </div>
                {/* Book column headers */}
                <div className="flex-1">
                  <table className="w-full text-[10px] table-fixed">
                    <thead>
                      <tr className="text-muted-foreground font-semibold uppercase tracking-wider">
                        <th className="w-[28px] p-1"></th>
                        <th className="w-[36px] p-1 text-left">Src</th>
                        <th className="w-[68px] p-1 text-left">Date</th>
                        <th className="w-[90px] p-1 text-left">Doc No</th>
                        <th className="p-1 text-left">Payee Name</th>
                        <th className="w-[90px] p-1 text-right">Amount</th>
                        <th className="w-[90px] p-1 text-left">Chq/Ref</th>
                        <th className="w-[48px] p-1"></th>
                      </tr>
                    </thead>
                  </table>
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
                                             let deposit = t.debit_amount || 0;
                                             let payment = t.credit_amount || 0;
                                             if (deposit > 0 && payment > 0) {
                                               if (t.transaction_type === 'deposit') { payment = 0; }
                                               else { deposit = 0; }
                                             }
                                             const netAmount = deposit > 0 ? deposit : payment;
                                             const isDeposit = deposit > 0;
                                             const rowClass = isCleared ? "bg-blue-50/50 dark:bg-blue-900/10" : isSuggested ? "bg-green-50/50 dark:bg-green-900/10 border-l-2 border-green-500" : "hover:bg-accent/50";
                                             return (
                                                <tr key={t.id} className={`border-b border-border/50 cursor-pointer transition-colors ${rowClass}`} onClick={() => toggleCleared(t.id, payment, deposit)}>
                                                   <td className="w-[28px] px-1 py-1.5 align-middle text-center"><input type="checkbox" checked={isCleared} onChange={() => {}} className="cursor-pointer" /></td>
                                                   <td className="w-[68px] px-1 py-1.5 align-middle text-[10px] text-muted-foreground font-mono">{format(new Date(t.transaction_date), 'dd/MM/yy')}</td>
                                                   <td className="w-[90px] px-1 py-1.5 align-middle truncate" title={extractDocNo(t)}>
                                                      <span className="text-[10px] font-mono font-medium">{extractDocNo(t)}</span>
                                                   </td>
                                                   <td className="px-1 py-1.5 align-middle truncate" title={extractPayee(t.description)}>
                                                      <span className="text-[11px] font-medium">{extractPayee(t.description)}</span>
                                                   </td>
                                                   <td className={`w-[90px] px-1 py-1.5 align-middle text-right font-mono font-medium ${isDeposit ? 'text-green-600' : 'text-red-600'}`}>
                                                      {isDeposit ? '+' : '-'}{fmt(netAmount)}
                                                   </td>
                                                   <td className="w-[90px] px-1 py-1.5 align-middle truncate text-[10px] font-mono text-muted-foreground" title={t.cheque_number || t.reference || ''}>
                                                      {t.cheque_number || t.reference || '—'}
                                                   </td>
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
                                             let deposit = t.debit_amount || 0;
                                             let payment = t.credit_amount || 0;
                                             if (deposit > 0 && payment > 0) {
                                               if (t.transaction_type === 'deposit') { payment = 0; }
                                               else { deposit = 0; }
                                             }
                                             const netAmount = deposit > 0 ? deposit : payment;
                                             const isDeposit = deposit > 0;
                                             const source = sourceLabel(t.source_type);
                                             const isReversal = t.source_type === 'reversal';
                                             const rowClass = isReversal ? "row-reversal" : isCleared ? "bg-blue-50/50 dark:bg-blue-900/10" : isSuggested ? "bg-green-50/50 dark:bg-green-900/10 border-r-2 border-green-500" : "hover:bg-accent/50";
                                             const isEditing = editingTxnId === t.id;
                                             const canEdit = !t.is_reconciled && (t.source_type === 'manual' || t.source_type === 'bank_fee');
                                             const canReverse = !isReversal && t.source_type !== 'reversal';
                                             return (
                                                <tr key={t.id} className={`border-b border-border/50 cursor-pointer transition-colors group/row ${rowClass}`} onClick={() => !t.is_reconciled && !isEditing && toggleCleared(t.id, payment, deposit)}>
                                                   <td className="w-[28px] px-1 py-1.5 align-middle text-center"><input type="checkbox" checked={isCleared} disabled={t.is_reconciled} onChange={() => {}} className="cursor-pointer" /></td>
                                                   <td className="w-[36px] px-1 py-1.5 align-middle"><span className={`${source.className} scale-[0.7] origin-top-left inline-block`}>{source.text}</span></td>
                                                   <td className="w-[68px] px-1 py-1.5 align-middle text-[10px] text-muted-foreground font-mono">{format(new Date(t.transaction_date), 'dd/MM/yy')}</td>
                                                   <td className="w-[90px] px-1 py-1.5 align-middle truncate" title={extractDocNo(t)}>
                                                      <span className="text-[10px] font-mono font-medium">{extractDocNo(t)}</span>
                                                   </td>
                                                   <td className="px-1 py-1.5 align-middle truncate" title={extractPayee(t.description)}>
                                                      <span className={`text-[11px] font-medium ${isReversal ? 'reversal-desc' : ''}`}>{extractPayee(t.description)}</span>
                                                   </td>
                                                   <td className={`w-[90px] px-1 py-1.5 align-middle text-right font-mono font-medium ${isDeposit ? 'text-green-600' : 'text-red-600'}`}>
                                                     {isEditing ? (
                                                       <input
                                                         type="number"
                                                         step="0.01"
                                                         value={editingAmount}
                                                         onChange={(e) => { e.stopPropagation(); setEditingAmount(e.target.value); }}
                                                         onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handleInlineAmountSave(t.id, payment, deposit); } if (e.key === 'Escape') setEditingTxnId(null); }}
                                                         onClick={(e) => e.stopPropagation()}
                                                         onBlur={() => handleInlineAmountSave(t.id, payment, deposit)}
                                                         autoFocus
                                                         className="w-[80px] text-right text-xs border rounded px-1 py-0.5 bg-background"
                                                       />
                                                     ) : (
                                                       <>{isDeposit ? '+' : '-'}{fmt(netAmount)}</>
                                                     )}
                                                   </td>
                                                   <td className="w-[90px] px-1 py-1.5 align-middle truncate text-[10px] font-mono text-muted-foreground" title={t.cheque_number || t.reference || ''}>
                                                      {t.cheque_number || t.reference || '—'}
                                                   </td>
                                                   <td className="w-[48px] px-0 py-1.5 align-middle text-center">
                                                     <div className="flex items-center justify-center gap-0.5">
                                                       {canEdit && !isEditing && (
                                                         <button
                                                           onClick={(e) => { e.stopPropagation(); setEditingTxnId(t.id); setEditingAmount(String(netAmount)); }}
                                                           className="opacity-0 group-hover/row:opacity-100 transition-opacity text-muted-foreground hover:text-primary p-0.5"
                                                           title="Edit amount"
                                                         >
                                                           <Pencil className="w-3 h-3" />
                                                         </button>
                                                       )}
                                                       {canReverse && !isEditing && (
                                                         <button
                                                           onClick={(e) => { e.stopPropagation(); setReversalTarget(t); setReversalDate(format(new Date(), 'yyyy-MM-dd')); setShowReversalDialog(true); }}
                                                           className="opacity-0 group-hover/row:opacity-100 transition-opacity text-muted-foreground hover:text-purple-600 p-0.5"
                                                           title="Reverse this transaction"
                                                         >
                                                           <Undo2 className="w-3 h-3" />
                                                         </button>
                                                       )}
                                                     </div>
                                                   </td>
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

            {summary.difference !== 0 && (
              <div className="text-xs text-muted-foreground mt-2 p-3 bg-red-50/50 dark:bg-red-900/10 rounded border border-red-100 dark:border-red-900">
                <div className="font-semibold mb-2 text-red-800 dark:text-red-400 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> Difference Breakdown Guidance:
                </div>
                <div className="flex justify-between py-0.5"><span>Starting / Opening Balance:</span> <span className="font-mono">{fmt(statementOpeningBalance)}</span></div>
                <div className="flex justify-between py-0.5 text-green-700 dark:text-green-400"><span>+ Cleared Deposits:</span> <span className="font-mono">{fmt(summary.clearedDepositTotal)}</span></div>
                <div className="flex justify-between py-0.5 text-red-700 dark:text-red-400"><span>- Cleared Payments:</span> <span className="font-mono">{fmt(summary.clearedPaymentTotal)}</span></div>
                {summary.adjDepositTotal > 0 && <div className="flex justify-between py-0.5 text-green-700 dark:text-green-400"><span>+ Adjustments (In):</span> <span className="font-mono">{fmt(summary.adjDepositTotal)}</span></div>}
                {summary.adjPaymentTotal > 0 && <div className="flex justify-between py-0.5 text-red-700 dark:text-red-400"><span>- Adjustments (Out):</span> <span className="font-mono">{fmt(summary.adjPaymentTotal)}</span></div>}
                <div className="flex justify-between font-semibold border-t border-red-200 dark:border-red-800 mt-1 pt-1">
                  <span>= Calculated Book Balance:</span> <span className="font-mono">{fmt(summary.clearedBookBalance)}</span>
                </div>
                <div className="flex justify-between font-semibold text-foreground mt-1">
                  <span>Target Statement Balance:</span> <span className="font-mono">{fmt(summary.stmtEndBal)}</span>
                </div>
                <div className="flex justify-between font-bold text-red-600 dark:text-red-500 border-t border-red-200 dark:border-red-800 mt-1 pt-1">
                  <span>Unexplained Difference:</span> <span className="font-mono">{fmt(summary.difference)}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 mt-3 pt-2">
               <Button variant="outline" size="sm" onClick={handleCancel}>Cancel</Button>
               <Button variant="secondary" size="sm" onClick={handleManualSaveDraft} disabled={!hasClearedItems && !statementBalance}>
                 <Save className="w-4 h-4 mr-1" />
                 Save Draft
               </Button>
               <Button size="sm" onClick={handleSave} disabled={isSaveDisabled || summary.difference !== 0} className={summary.difference === 0 ? "bg-green-600 hover:bg-green-700 text-white" : ""}>
                 <CheckCircle className="w-4 h-4 mr-1" />
                 {saveReconciliation.isPending ? "Finalizing…" : "Complete Reconcile"}
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

      {/* ========================= QUICK-ADD MISSING ENTRY ========================= */}
      <Dialog open={showQuickAdd} onOpenChange={setShowQuickAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> Quick-Add Missing Entry
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={quickAddType} onValueChange={(v) => setQuickAddType(v as "payment" | "deposit")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="payment">Payment (Credit)</SelectItem>
                  <SelectItem value="deposit">Deposit (Debit)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={quickAddDate} onChange={(e) => setQuickAddDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" step="0.01" value={quickAddAmount} onChange={(e) => setQuickAddAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={quickAddDesc} onChange={(e) => setQuickAddDesc(e.target.value)} placeholder="e.g. Bank charges - March" />
            </div>
            <div className="space-y-2">
              <Label>Reference (optional)</Label>
              <Input value={quickAddRef} onChange={(e) => setQuickAddRef(e.target.value)} placeholder="e.g. CHQ-001234" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>GL Account (optional)</span>
                {suggestedGLAccount && (
                  <span className="text-[10px] font-normal text-green-600 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Auto-suggested from past pattern
                  </span>
                )}
              </Label>
              <div className="relative">
                <Input
                  value={quickAddGLSearch}
                  onChange={(e) => setQuickAddGLSearch(e.target.value)}
                  placeholder={quickAddGLAccountId ? coaList.find(a => a.id === quickAddGLAccountId)?.account_code + ' - ' + coaList.find(a => a.id === quickAddGLAccountId)?.account_name : 'Search GL account...'}
                  className={quickAddGLAccountId ? 'border-green-300 bg-green-50/50 dark:bg-green-900/10' : ''}
                />
                {quickAddGLAccountId && (
                  <button
                    onClick={() => { setQuickAddGLAccountId(''); setQuickAddGLSearch(''); setSuggestedGLAccount(null); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {quickAddGLSearch && !quickAddGLAccountId && (
                <div className="max-h-[120px] overflow-auto border rounded bg-background shadow-md text-xs">
                  {coaList
                    .filter(a => a.is_active && (
                      a.account_code.toLowerCase().includes(quickAddGLSearch.toLowerCase()) ||
                      a.account_name.toLowerCase().includes(quickAddGLSearch.toLowerCase())
                    ))
                    .slice(0, 10)
                    .map(a => (
                      <button
                        key={a.id}
                        className="w-full text-left px-2 py-1.5 hover:bg-accent/50 flex items-center gap-2 border-b border-border/30 last:border-0"
                        onClick={() => {
                          setQuickAddGLAccountId(a.id);
                          setQuickAddGLSearch('');
                        }}
                      >
                        <span className="font-mono text-muted-foreground w-[60px]">{a.account_code}</span>
                        <span className="font-medium truncate">{a.account_name}</span>
                        <span className="ml-auto text-[9px] text-muted-foreground capitalize bg-muted px-1 rounded">{a.account_type}</span>
                      </button>
                    ))
                  }
                  {coaList.filter(a => a.is_active && (
                    a.account_code.toLowerCase().includes(quickAddGLSearch.toLowerCase()) ||
                    a.account_name.toLowerCase().includes(quickAddGLSearch.toLowerCase())
                  )).length === 0 && (
                    <div className="px-2 py-2 text-muted-foreground text-center">No accounts found</div>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleQuickAdd}>
              <Plus className="w-4 h-4 mr-1" /> Add Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================= REVERSAL CONFIRMATION ========================= */}
      <Dialog open={showReversalDialog} onOpenChange={(open) => { if (!open) { setShowReversalDialog(false); setReversalTarget(null); setReversalReason(''); } }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
              <Undo2 className="w-5 h-5" /> Reverse Bank Transaction
            </DialogTitle>
          </DialogHeader>
          {reversalTarget && (
            <div className="space-y-4 py-4">
              {/* Original Transaction Summary */}
              <div className="bg-muted/50 border rounded-lg p-3 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Original Transaction</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-mono font-medium">{format(new Date(reversalTarget.transaction_date), 'dd MMM yyyy')}</span>
                  <span className="text-muted-foreground">Amount</span>
                  <span className={`font-mono font-bold ${(reversalTarget.debit_amount || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(reversalTarget.debit_amount || 0) > 0 ? '+' : '-'}LKR {fmt((reversalTarget.debit_amount || 0) > 0 ? reversalTarget.debit_amount : reversalTarget.credit_amount)}
                  </span>
                  <span className="text-muted-foreground">Payee</span>
                  <span className="font-medium truncate">{extractPayee(reversalTarget.description)}</span>
                  <span className="text-muted-foreground">Reference</span>
                  <span className="font-mono text-xs">{reversalTarget.reference || reversalTarget.cheque_number || '—'}</span>
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-2 text-sm bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-amber-800 dark:text-amber-300">
                  This will create an <strong>offsetting entry</strong> that reverses the financial impact. A <strong>reversing Journal Entry</strong> will also be auto-posted to the General Ledger.
                </p>
              </div>

              {/* Reversal Date */}
              <div className="space-y-2">
                <Label>Reversal Date</Label>
                <Input
                  type="date"
                  value={reversalDate}
                  onChange={(e) => setReversalDate(e.target.value)}
                />
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label>Reason for Reversal <span className="text-red-500">*</span></Label>
                <Textarea
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="e.g. Duplicate entry, incorrect amount, wrong payee..."
                  className="min-h-[80px]"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowReversalDialog(false); setReversalTarget(null); setReversalReason(''); }} disabled={isReversing}>
              Cancel
            </Button>
            <Button
              onClick={handleReverseTransaction}
              disabled={isReversing || !reversalReason.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Undo2 className="w-4 h-4 mr-1" />
              {isReversing ? 'Reversing…' : 'Confirm Reversal'}
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
        statementOpeningBalance={statementOpeningBalance}
        clearedState={clearedState}
        transactions={transactions}
        adjustments={adjustments}
        summary={summary}
      />
    </Card>
  );
};

export { BankReconciliationWorksheet };
