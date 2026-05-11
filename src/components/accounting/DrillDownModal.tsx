 
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Loader2, Download, X, Filter, Bus, Route, Trash2, FileText, CheckCircle, Eye, ChevronDown, ChevronRight, Info, RefreshCw, ShieldCheck, Columns } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { reverseAndDeleteJournalEntry } from "@/lib/gl-posting-utils";
import { useReconcileJournalLines } from "@/hooks/useAccountingMutations";
import { FinanceDocumentPreviewModal } from "./shared/FinanceDocumentPreviewModal";
import { toast } from "sonner";

interface DrillDownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId?: string | null;
  accountIds?: string[];
  accountName?: string;
  dateRange?: { from?: Date; to?: Date };
}

export const DrillDownModal = ({
  open,
  onOpenChange,
  accountId,
  accountIds: accountIdsProp,
  accountName,
  dateRange: initialDateRange,
}: DrillDownModalProps) => {
  // Support both single accountId and array of accountIds
  const resolvedAccountIds = accountIdsProp && accountIdsProp.length > 0
    ? accountIdsProp
    : accountId
      ? [accountId]
      : [];
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>(initialDateRange || {});
  const [businessUnitFilter, setBusinessUnitFilter] = useState<string>("_all");
  const [transactionType, setTransactionType] = useState<string>("all");
  const [busFilter, setBusFilter] = useState<string>("_all");
  const [routeFilter, setRouteFilter] = useState<string>("_all");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [deleteConfirmJEId, setDeleteConfirmJEId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReconciled, setShowReconciled] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [breakdownExpanded, setBreakdownExpanded] = useState<Record<string, boolean>>({});
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [showRecalcConfirm, setShowRecalcConfirm] = useState(false);

  const [previewDocType, setPreviewDocType] = useState<string>("");
  const [previewDocData, setPreviewDocData] = useState<any>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const defaultColumns = ["date", "entry_number", "account", "bu", "bus", "route", "reference", "description", "debit", "credit", "balance", "status"];
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("drilldown-visible-columns");
      return saved ? JSON.parse(saved) : defaultColumns;
    } catch {
      return defaultColumns;
    }
  });

  const toggleColumn = (columnId: string) => {
    setVisibleColumns(prev => {
      const newCols = prev.includes(columnId) ? prev.filter(c => c !== columnId) : [...prev, columnId];
      localStorage.setItem("drilldown-visible-columns", JSON.stringify(newCols));
      return newCols;
    });
  };

  const reconcileMutation = useReconcileJournalLines();

  const handleDeleteJE = async () => {
    if (!deleteConfirmJEId) return;
    setIsDeleting(true);
    try {
      const result = await reverseAndDeleteJournalEntry(deleteConfirmJEId);
      if (result.success) {
        toast.success("Journal entry deleted and COA balances reversed");
        queryClient.invalidateQueries({ queryKey: ["account-transactions"] });
        queryClient.invalidateQueries({ queryKey: ["drilldown-accounts"] });
        queryClient.invalidateQueries({ queryKey: ["bbf-breakdown"] });
        queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      } else {
        toast.error(result.error || "Failed to delete journal entry");
      }
    } catch (error) {
      toast.error("Failed to delete journal entry");
    } finally {
      setIsDeleting(false);
      setDeleteConfirmJEId(null);
    }
  };

  // Fetch buses for filter
  const { data: buses } = useQuery({
    queryKey: ["buses-filter-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buses")
        .select("id, bus_no")
        .eq("status", "active")
        .order("bus_no");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch routes for filter
  const { data: routes } = useQuery({
    queryKey: ["routes-filter-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes")
        .select("id, route_name")
        .order("route_name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["account-transactions", resolvedAccountIds, dateRange, businessUnitFilter, busFilter, routeFilter],
    queryFn: async () => {
      if (resolvedAccountIds.length === 0) return [];

      let query = supabase
        .from("journal_entry_lines")
        .select(
          `
          id,
          debit,
          credit,
          description,
          created_at,
          reconciliation_id,
          bus_id,
          route_id,
          trip_id,
          expense_id,
          buses:bus_id(bus_no),
          routes:route_id(route_name),
          journal_entries!inner(
            id,
            entry_number,
            entry_date,
            description,
            status,
            business_unit_code,
            reference,
            source_module
          ),
          chart_of_accounts:account_id(
            account_code,
            account_name
          )
        `
        )
        .in("account_id", resolvedAccountIds)
        .eq("journal_entries.status", "posted")
        .order("created_at", { ascending: false });

      // Apply date range filter
      if (dateRange.from) {
        query = query.gte("journal_entries.entry_date", format(dateRange.from, "yyyy-MM-dd"));
      }
      if (dateRange.to) {
        query = query.lte("journal_entries.entry_date", format(dateRange.to, "yyyy-MM-dd"));
      }

      // Apply business unit filter
      if (businessUnitFilter && businessUnitFilter !== "_all") {
        query = query.eq("journal_entries.business_unit_code", businessUnitFilter);
      }

      // Apply bus filter
      if (busFilter && busFilter !== "_all") {
        query = query.eq("bus_id", busFilter);
      }

      // Apply route filter
      if (routeFilter && routeFilter !== "_all") {
        query = query.eq("route_id", routeFilter);
      }

      const data = await fetchAllRows(query);
      return data;
    },
    enabled: open && resolvedAccountIds.length > 0,
  });

  // Fetch account(s) current balance
  const { data: accountsData } = useQuery({
    queryKey: ["drilldown-accounts", resolvedAccountIds],
    queryFn: async () => {
      if (resolvedAccountIds.length === 0) return [];
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .select("id, current_balance, account_type")
        .in("id", resolvedAccountIds);
      if (error) throw error;
      return data;
    },
    enabled: open && resolvedAccountIds.length > 0,
  });

  // Fetch invoice balances for auto-reconciliation display
  const { data: invoiceBalances } = useQuery({
    queryKey: ["drilldown-invoice-balances", transactions?.map(t => (t.journal_entries as any)?.reference).join(',')],
    queryFn: async () => {
      if (!transactions || transactions.length === 0) return {};
      
      const arInvoiceRefs = new Set<string>();
      const apInvoiceRefs = new Set<string>();
      const arReceiptRefs = new Set<string>();
      const apPaymentRefs = new Set<string>();
      
      transactions.forEach(t => {
        const entry = t.journal_entries as any;
        if (!entry || !entry.reference) return;
        
        const ref = entry.reference;
        const source = entry.source_module;
        
        if (source === 'ar_invoice' || source === 'manual_ar' || ref.includes('-INV-') || ref.startsWith('INV-')) {
          arInvoiceRefs.add(ref);
        } else if (source === 'ap_invoice' || ref.includes('API-') || ref.startsWith('API-')) {
          apInvoiceRefs.add(ref);
        } else if (source === 'ar_receipt' || ref.includes('-RCP-') || ref.startsWith('RCP-') || entry.entry_number?.startsWith('SBS-PAY-')) {
          arReceiptRefs.add(ref);
        } else if (source === 'ap_payment' || source === 'advance_payment' || ref.includes('-PAY-') || ref.startsWith('PAY-')) {
          apPaymentRefs.add(ref);
        }
      });
      
      const balances: Record<string, { balance: number, type: 'invoice' | 'receipt', parentRef?: string }> = {};
      
      // Fetch AR Invoices
      if (arInvoiceRefs.size > 0) {
        const { data } = await supabase.from('ar_invoices').select('invoice_number, balance').in('invoice_number', Array.from(arInvoiceRefs));
        data?.forEach(inv => { balances[inv.invoice_number] = { balance: inv.balance, type: 'invoice' }; });
      }
      
      // Fetch AP Invoices
      if (apInvoiceRefs.size > 0) {
        const { data } = await supabase.from('ap_invoices').select('invoice_number, balance').in('invoice_number', Array.from(apInvoiceRefs));
        data?.forEach(inv => { balances[inv.invoice_number] = { balance: inv.balance, type: 'invoice' }; });
      }
      
      // Fetch AR Receipts (to find parent invoice)
      if (arReceiptRefs.size > 0) {
        const { data: receipts } = await supabase.from('ar_receipts').select('id, receipt_number').in('receipt_number', Array.from(arReceiptRefs));
        if (receipts && receipts.length > 0) {
          const receiptMap = Object.fromEntries(receipts.map(r => [r.id, r.receipt_number]));
          const { data: allocations } = await supabase.from('ar_receipt_allocations').select('receipt_id, ar_invoices(invoice_number)').in('receipt_id', receipts.map(r => r.id));
          allocations?.forEach(alloc => { 
            const receiptNumber = receiptMap[alloc.receipt_id];
            if (receiptNumber && alloc.ar_invoices?.invoice_number) {
              balances[receiptNumber] = { balance: 0, type: 'receipt', parentRef: alloc.ar_invoices.invoice_number }; 
            }
          });
        }
      }
      
      // Fetch AP Payments (to find parent invoice)
      if (apPaymentRefs.size > 0) {
        const { data: payments } = await supabase.from('ap_payments').select('id, payment_number').in('payment_number', Array.from(apPaymentRefs));
        if (payments && payments.length > 0) {
          const paymentMap = Object.fromEntries(payments.map(p => [p.id, p.payment_number]));
          const { data: allocations } = await supabase.from('ap_payment_allocations').select('payment_id, ap_invoices(invoice_number)').in('payment_id', payments.map(p => p.id));
          allocations?.forEach(alloc => { 
            const paymentNumber = paymentMap[alloc.payment_id];
            if (paymentNumber && alloc.ap_invoices?.invoice_number) {
              balances[paymentNumber] = { balance: 0, type: 'receipt', parentRef: alloc.ap_invoices.invoice_number }; 
            }
          });
        }
      }
      
      return balances;
    },
    enabled: open && !!transactions && transactions.length > 0,
  });

  const totalCurrentBalance = useMemo(() => {
    return accountsData?.reduce((sum, acc) => sum + (Number(acc.current_balance) || 0), 0) || 0;
  }, [accountsData]);

  // Determine if this account group is debit-normal or credit-normal
  // current_balance is stored TYPE-ADJUSTED by updateAccountBalance():
  //   - Debit-normal (asset/expense): balance += (debit - credit)
  //   - Credit-normal (revenue/liability/equity): balance += (credit - debit)
  const isDebitNormal = useMemo(() => {
    if (!accountsData || accountsData.length === 0) return true;
    const accountType = (accountsData[0] as any)?.account_type || "";
    return ["asset", "expense"].includes(accountType);
  }, [accountsData]);

  // Calculate the total net movement of all FETCHED transactions
  // TYPE-ADJUSTED to match the same convention as current_balance
  const fetchedNetMovement = useMemo(() => {
    if (!transactions) return 0;
    const debits = transactions.reduce((sum, t) => sum + (t.debit || 0), 0);
    const credits = transactions.reduce((sum, t) => sum + (t.credit || 0), 0);
    // Match the sign convention used by updateAccountBalance():
    //   Debit-normal: debit - credit  (debits increase balance)
    //   Credit-normal: credit - debit  (credits increase balance)
    return isDebitNormal ? (debits - credits) : (credits - debits);
  }, [transactions, isDebitNormal]);

  // The true Brought Forward balance is whatever is needed to make
  // the running balance equal totalCurrentBalance.
  // Both current_balance and fetchedNetMovement now use the SAME sign convention.
  const broughtForwardBalance = totalCurrentBalance - fetchedNetMovement;

  // === Recalculate Balance Handler ===
  // Recalculates current_balance from ALL posted journal entry lines for this account
  const handleRecalculateBalance = async () => {
    if (resolvedAccountIds.length === 0) return;
    setIsRecalculating(true);
    try {
      for (const accountId of resolvedAccountIds) {
        // 1. Get the account type and current_balance
        const { data: account } = await supabase
          .from("chart_of_accounts")
          .select("id, account_type, current_balance")
          .eq("id", accountId)
          .single();

        if (!account) continue;

        // 2. Fetch ALL posted JE lines for this account
        const allLines = await fetchAllRows(
          supabase
            .from("journal_entry_lines")
            .select(`id, debit, credit, journal_entries!inner(status)`)
            .eq("account_id", accountId)
            .eq("journal_entries.status", "posted")
        );

        // 3. Sum debits and credits
        const totalDebit = allLines.reduce((s: number, l: any) => s + (Number(l.debit) || 0), 0);
        const totalCredit = allLines.reduce((s: number, l: any) => s + (Number(l.credit) || 0), 0);

        // 4. Calculate the correct current_balance based on account type
        const isDebitNormal = ["asset", "expense", "expenses"].includes((account.account_type || "").toLowerCase());
        // Note: chart_of_accounts has no opening_balance column; accounts start at 0
        const correctBalance = isDebitNormal
          ? (totalDebit - totalCredit)
          : (totalCredit - totalDebit);

        // 5. Update the COA record
        const { error, data: updateData } = await supabase
          .from("chart_of_accounts")
          .update({ current_balance: correctBalance })
          .eq("id", accountId)
          .select();

        if (error) throw error;
        
        console.log("RECALCULATION STATS:", {
          accountId,
          totalDebit,
          totalCredit,
          correctBalance,
          oldBalance: account.current_balance,
          isDebitNormal,
          accountType: account.account_type,
          updateData
        });
        
        toast.success(`Recalculated: ${correctBalance.toLocaleString()} (Debits: ${totalDebit.toLocaleString()}, Credits: ${totalCredit.toLocaleString()}). Updated ${updateData?.length || 0} row(s).`);
      }

      // 6. Invalidate all related caches
      queryClient.invalidateQueries({ queryKey: ["account-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["drilldown-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bbf-breakdown"] });
      queryClient.invalidateQueries({ queryKey: ["trial-balance"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });

      setShowRecalcConfirm(false);
      setShowBreakdown(false);
    } catch (error) {
      console.error("Recalculate balance error:", error);
      toast.error("Failed to recalculate balance: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsRecalculating(false);
    }
  };

  // === Opening Balance Breakdown Query ===
  // Fetches ALL journal entries for this account to show how the brought forward is composed
  const { data: breakdownData, isLoading: breakdownLoading } = useQuery({
    queryKey: ["bbf-breakdown", resolvedAccountIds, dateRange],
    queryFn: async () => {
      if (resolvedAccountIds.length === 0) return null;

      // Get the COA current_balance for context (no opening_balance column exists)
      const { data: coaData } = await supabase
        .from("chart_of_accounts")
        .select("id, account_code, account_name, current_balance, account_type")
        .in("id", resolvedAccountIds);

      const coaOpeningBalance = 0; // chart_of_accounts has no opening_balance column
      const coaCurrentBalance = coaData?.reduce((sum, a) => sum + (Number(a.current_balance) || 0), 0) || 0;
      const accountType = coaData?.[0]?.account_type || "unknown";

      // Fetch ALL journal entry lines for this account (no date filter)
      let query = supabase
        .from("journal_entry_lines")
        .select(`
          id, debit, credit, description,
          journal_entries!inner(
            id, entry_number, entry_date, description, status, 
            business_unit_code, reference, source_module
          )
        `)
        .in("account_id", resolvedAccountIds)
        .eq("journal_entries.status", "posted")
        .order("created_at", { ascending: true });

      const allEntries = await fetchAllRows(query);

      // Split into "before filter" and "within filter" groups
      const beforeFilter: any[] = [];
      const withinFilter: any[] = [];

      allEntries.forEach((entry: any) => {
        const je = entry.journal_entries as any;
        if (!je) return;
        const entryDate = je.entry_date;

        // If no date filter, everything is "within"
        if (!dateRange.from) {
          withinFilter.push(entry);
          return;
        }

        const filterFrom = format(dateRange.from, "yyyy-MM-dd");
        if (entryDate < filterFrom) {
          beforeFilter.push(entry);
        } else {
          withinFilter.push(entry);
        }
      });

      // Group "before" entries by source_module
      const bySource: Record<string, { entries: any[]; totalDebit: number; totalCredit: number }> = {};
      beforeFilter.forEach((entry: any) => {
        const je = entry.journal_entries as any;
        const source = je?.source_module || "manual";
        if (!bySource[source]) bySource[source] = { entries: [], totalDebit: 0, totalCredit: 0 };
        bySource[source].entries.push(entry);
        bySource[source].totalDebit += entry.debit || 0;
        bySource[source].totalCredit += entry.credit || 0;
      });

      // Group "before" entries by month
      const byMonth: Record<string, { totalDebit: number; totalCredit: number; count: number }> = {};
      beforeFilter.forEach((entry: any) => {
        const je = entry.journal_entries as any;
        const month = je?.entry_date?.substring(0, 7) || "unknown";
        if (!byMonth[month]) byMonth[month] = { totalDebit: 0, totalCredit: 0, count: 0 };
        byMonth[month].totalDebit += entry.debit || 0;
        byMonth[month].totalCredit += entry.credit || 0;
        byMonth[month].count++;
      });

      const totalBeforeDebit = beforeFilter.reduce((s, e) => s + (e.debit || 0), 0);
      const totalBeforeCredit = beforeFilter.reduce((s, e) => s + (e.credit || 0), 0);
      const computedBBF = coaOpeningBalance + (totalBeforeDebit - totalBeforeCredit);

      return {
        coaOpeningBalance,
        coaCurrentBalance,
        accountType,
        beforeFilterCount: beforeFilter.length,
        withinFilterCount: withinFilter.length,
        totalAllEntries: allEntries.length,
        totalBeforeDebit,
        totalBeforeCredit,
        netBeforeMovement: totalBeforeDebit - totalBeforeCredit,
        computedBBF,
        bySource,
        byMonth,
      };
    },
    enabled: showBreakdown && open && resolvedAccountIds.length > 0,
  });

  // Filter by transaction type and reconciliation status
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    let filtered = transactions;
    
    if (!showReconciled) {
      filtered = filtered.filter(t => !t.reconciliation_id);
    }
    
    if (transactionType === "debit") {
      filtered = filtered.filter((t) => (t.debit || 0) > 0);
    }
    if (transactionType === "credit") {
      filtered = filtered.filter((t) => (t.credit || 0) > 0);
    }
    return filtered;
  }, [transactions, transactionType, showReconciled]);

  // Calculate running balance
  const { totalDebit, totalCredit, netMovement } = useMemo(() => {
    if (!filteredTransactions) return { totalDebit: 0, totalCredit: 0, netMovement: 0 };
    const debit = filteredTransactions.reduce((sum, t) => sum + (t.debit || 0), 0);
    const credit = filteredTransactions.reduce((sum, t) => sum + (t.credit || 0), 0);
    const isDebitNormal = ["asset", "expense", "expenses"].includes(((accountsData?.[0] as any)?.account_type || "").toLowerCase());
    const net = isDebitNormal ? debit - credit : credit - debit;
    return { totalDebit: debit, totalCredit: credit, netMovement: net };
  }, [filteredTransactions, accountsData]);

  const transactionsWithBalance = useMemo(() => {
    if (!filteredTransactions) return [];
    let runningBalance = broughtForwardBalance;
    return [...filteredTransactions].reverse().map((t) => {
      // Use the same type-adjusted convention as the BBF and current_balance
      const movement = isDebitNormal
        ? (t.debit || 0) - (t.credit || 0)
        : (t.credit || 0) - (t.debit || 0);
      runningBalance += movement;
      return { ...t, runningBalance };
    }).reverse();
  }, [filteredTransactions, broughtForwardBalance, isDebitNormal]);

  const handleViewDocument = async (reference: string, sourceModule: string, jeId: string, entryNumber: string = '') => {
    if (!reference) return;
    
    // Auto-detect source_module from reference if it's missing or generic
    let effectiveSourceModule = sourceModule;
    if (!effectiveSourceModule || effectiveSourceModule === 'general') {
      if (reference.includes('-INV-') || reference.startsWith('INV-')) {
        effectiveSourceModule = 'ar_invoice';
      } else if (reference.includes('-RCP-') || reference.startsWith('RCP-') || entryNumber.startsWith('SBS-PAY-')) {
        effectiveSourceModule = 'ar_receipt';
      } else if (reference.includes('-PAY-') || reference.startsWith('PAY-')) {
        effectiveSourceModule = 'ap_payment';
      } else if (reference.includes('API-') || reference.startsWith('API-')) {
        effectiveSourceModule = 'ap_invoice';
      } else if (reference.includes('PC-') || reference.startsWith('PC-')) {
        effectiveSourceModule = 'petty_cash';
      }
    }

    // Map effectiveSourceModule to table and documentType
    let table = "";
    let matchColumn = "";
    let docType = effectiveSourceModule;

    if (effectiveSourceModule === "manual_ar" || effectiveSourceModule === "ar_invoice") {
      table = "ar_invoices";
      matchColumn = "invoice_number";
      docType = "ar_invoice";
    } else if (effectiveSourceModule === "ap_invoice") {
      table = "ap_invoices";
      matchColumn = "invoice_number";
      docType = "ap_invoice";
    } else if (effectiveSourceModule === "ar_receipt") {
      table = "ar_receipts";
      matchColumn = "receipt_number";
      docType = "ar_receipt";
    } else if (effectiveSourceModule === "ap_payment" || effectiveSourceModule === "advance_payment") {
      table = "ap_payments";
      matchColumn = "payment_number";
      docType = "ap_payment_voucher";
    } else if (effectiveSourceModule === "special_hire_payment") {
      table = "special_hire_payments";
      matchColumn = "receipt_number";
      docType = "ar_receipt";
    } else if (effectiveSourceModule === "petty_cash") {
      table = "petty_cash_disbursements";
      matchColumn = "voucher_number";
      docType = "petty_cash_voucher";
    } else {
      // Fallback for general JEs
      setPreviewDocType("journal_voucher");
      setPreviewDocData({ id: jeId, journal_entry_id: jeId, voucher_number: reference });
      setPreviewModalOpen(true);
      return;
    }

    try {
      let query = supabase.from(table as any).select("*");
      
      if (matchColumn && reference) {
        // If reference looks like a UUID, it might be stored in the 'reference' column instead of receipt_number/invoice_number
        if (reference.length > 20 && reference.includes('-')) {
          query = query.or(`${matchColumn}.eq.${reference},reference.eq.${reference}`);
        } else {
          query = query.eq(matchColumn, reference);
        }
      }

      const { data, error } = await query.maybeSingle();
        
      if (error || !data) {
        toast.error("Original document could not be found.");
        return;
      }
      
      setPreviewDocType(docType);
      setPreviewDocData(data);
      setPreviewModalOpen(true);
    } catch (e) {
      toast.error("Failed to load document.");
    }
  };

  // Calculate totals
  const totalDebits = totalDebit;
  const totalCredits = totalCredit;

  const selectedNetBalance = useMemo(() => {
    if (selectedRows.size === 0) return 0;
    const selected = transactionsWithBalance.filter(t => selectedRows.has(t.id));
    const debits = selected.reduce((sum, t) => sum + (t.debit || 0), 0);
    const credits = selected.reduce((sum, t) => sum + (t.credit || 0), 0);
    return debits - credits;
  }, [selectedRows, transactionsWithBalance]);

  const handleReconcile = () => {
    if (selectedRows.size === 0 || selectedNetBalance !== 0) return;
    reconcileMutation.mutate(Array.from(selectedRows), {
      onSuccess: () => {
        setSelectedRows(new Set());
      }
    });
  };

  const toggleRowSelection = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllRows = () => {
    if (selectedRows.size === filteredTransactions?.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredTransactions?.map((t) => t.id) || []));
    }
  };

  const clearFilters = () => {
    setDateRange({});
    setBusinessUnitFilter("_all");
    setTransactionType("all");
    setBusFilter("_all");
    setRouteFilter("_all");
  };

  const hasActiveFilters = businessUnitFilter !== "_all" || transactionType !== "all" ||
    busFilter !== "_all" || routeFilter !== "_all" || dateRange.from || dateRange.to;

  const exportToCSV = () => {
    const dataToExport = selectedRows.size > 0
      ? transactionsWithBalance.filter((t) => selectedRows.has(t.id))
      : transactionsWithBalance;

    const isMultiAccount = resolvedAccountIds.length > 1;
    const headers = isMultiAccount
      ? ["Date", "Entry #", "Account", "Business Unit", "Bus", "Route", "Reference", "Description", "Debit", "Credit", "Balance"]
      : ["Date", "Entry #", "Business Unit", "Bus", "Route", "Reference", "Description", "Debit", "Credit", "Balance"];
    const rows = dataToExport.map((t) => {
      const entry = t.journal_entries as any;
      const busInfo = t.buses as any;
      const routeInfo = t.routes as any;
      const accountInfo = t.chart_of_accounts as any;
      const baseRow = [
        format(new Date(entry?.entry_date || t.created_at), "yyyy-MM-dd"),
        entry?.entry_number || "",
      ];
      if (isMultiAccount) {
        baseRow.push(accountInfo ? `${accountInfo.account_code} - ${accountInfo.account_name}` : "");
      }
      baseRow.push(
        entry?.business_unit_code || "",
        busInfo?.bus_no || "",
        routeInfo?.route_name || "",
        entry?.reference || "",
        (t.description || entry?.description || "").replace(/,/g, ";"),
        String(t.debit || 0),
        String(t.credit || 0),
        String(t.runningBalance),
      );
      return baseRow;
    });

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${accountName || "account"}-transactions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Account Transactions: {accountName}
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 p-3 bg-muted/30 rounded-lg items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />

          <DateRangePicker
            onDateRangeChange={(range) => setDateRange(range || {})}
            className="w-auto"
          />

          <Select value={businessUnitFilter} onValueChange={setBusinessUnitFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Business Unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Units</SelectItem>
              <SelectItem value="NCGE">NCG Express</SelectItem>
              <SelectItem value="SBO">School Bus</SelectItem>
              <SelectItem value="YUT">Yutong</SelectItem>
              <SelectItem value="SNT">Sinotruck</SelectItem>
              <SelectItem value="LTV">Light Vehicle</SelectItem>
              <SelectItem value="SPH">Spare Parts</SelectItem>
              <SelectItem value="FLEET">Fleet</SelectItem>
            </SelectContent>
          </Select>

          <Select value={busFilter} onValueChange={setBusFilter}>
            <SelectTrigger className="w-[140px]">
              <Bus className="h-4 w-4 mr-1" />
              <SelectValue placeholder="Bus" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Buses</SelectItem>
              {buses?.map((bus) => (
                <SelectItem key={bus.id} value={bus.id}>
                  {bus.bus_no}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={routeFilter} onValueChange={setRouteFilter}>
            <SelectTrigger className="w-[160px]">
              <Route className="h-4 w-4 mr-1" />
              <SelectValue placeholder="Route" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Routes</SelectItem>
              {routes?.map((route) => (
                <SelectItem key={route.id} value={route.id}>
                  {route.route_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={transactionType} onValueChange={setTransactionType}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="debit">Debits Only</SelectItem>
              <SelectItem value="credit">Credits Only</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center space-x-2 ml-2 bg-white px-3 py-1.5 rounded-md border">
            <Checkbox 
              id="hideReconciled" 
              checked={!showReconciled} 
              onCheckedChange={(checked) => setShowReconciled(!checked)} 
            />
            <label 
              htmlFor="hideReconciled" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-muted-foreground"
            >
              Hide Reconciled
            </label>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto">
                <Columns className="h-4 w-4 mr-2" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              {[
                { id: "date", label: "Date" },
                { id: "entry_number", label: "Entry #" },
                { id: "account", label: "Account" },
                { id: "bu", label: "BU" },
                { id: "bus", label: "Bus" },
                { id: "route", label: "Route" },
                { id: "reference", label: "Reference" },
                { id: "description", label: "Description" },
                { id: "debit", label: "Debit" },
                { id: "credit", label: "Credit" },
                { id: "balance", label: "Balance" },
                { id: "status", label: "Status / Link" },
              ].map(col => {
                if (col.id === "account" && resolvedAccountIds.length <= 1) return null;
                return (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={visibleColumns.includes(col.id)}
                    onCheckedChange={() => toggleColumn(col.id)}
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>


          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total Debits</p>
              <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                <CurrencyDisplay amount={totalDebits} />
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total Credits</p>
              <p className="text-xl font-semibold text-red-600 dark:text-red-400">
                <CurrencyDisplay amount={totalCredits} />
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Net Movement</p>
              <p className={`text-xl font-semibold ${netMovement >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                <CurrencyDisplay amount={netMovement} />
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Ending Balance</p>
              <p className={`text-xl font-semibold ${totalCurrentBalance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                <CurrencyDisplay amount={totalCurrentBalance} />
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <div className="flex-1 overflow-auto border rounded-lg">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : transactionsWithBalance.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              No transactions found for this account
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedRows.size === filteredTransactions?.length && filteredTransactions.length > 0}
                      onCheckedChange={selectAllRows}
                    />
                  </TableHead>
                  {visibleColumns.includes("date") && <TableHead>Date</TableHead>}
                  {visibleColumns.includes("entry_number") && <TableHead>Entry #</TableHead>}
                  {resolvedAccountIds.length > 1 && visibleColumns.includes("account") && <TableHead>Account</TableHead>}
                  {visibleColumns.includes("bu") && <TableHead>BU</TableHead>}
                  {visibleColumns.includes("bus") && <TableHead>Bus</TableHead>}
                  {visibleColumns.includes("route") && <TableHead>Route</TableHead>}
                  {visibleColumns.includes("reference") && <TableHead>Reference</TableHead>}
                  {visibleColumns.includes("description") && <TableHead>Description</TableHead>}
                  {visibleColumns.includes("debit") && <TableHead className="text-right">Debit</TableHead>}
                  {visibleColumns.includes("credit") && <TableHead className="text-right">Credit</TableHead>}
                  {visibleColumns.includes("balance") && <TableHead className="text-right">Balance</TableHead>}
                  {visibleColumns.includes("status") && <TableHead>Status / Link</TableHead>}
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionsWithBalance.map((t) => {
                  const entry = t.journal_entries as any;
                  const busInfo = t.buses as any;
                  const routeInfo = t.routes as any;
                  const accountInfo = (t as any).chart_of_accounts as any;
                  return (
                    <TableRow
                      key={t.id}
                      className={selectedRows.has(t.id) ? "bg-primary/10" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedRows.has(t.id)}
                          onCheckedChange={() => toggleRowSelection(t.id)}
                        />
                      </TableCell>
                      {visibleColumns.includes("date") && (
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(entry?.entry_date || t.created_at), "dd MMM yyyy")}
                        </TableCell>
                      )}
                      {visibleColumns.includes("entry_number") && (
                        <TableCell className="font-mono text-xs">
                          {entry?.entry_number}
                        </TableCell>
                      )}
                      {resolvedAccountIds.length > 1 && visibleColumns.includes("account") && (
                        <TableCell className="text-xs font-mono">
                          {accountInfo ? `${accountInfo.account_code} - ${accountInfo.account_name}` : "-"}
                        </TableCell>
                      )}
                      {visibleColumns.includes("bu") && (
                        <TableCell>
                          {entry?.business_unit_code && (
                            <Badge variant="outline" className="text-xs">
                              {entry.business_unit_code}
                            </Badge>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.includes("bus") && (
                        <TableCell className="text-xs">
                          {busInfo?.bus_no && (
                            <Badge variant="secondary" className="text-xs">
                              {busInfo.bus_no}
                            </Badge>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.includes("route") && (
                        <TableCell className="text-xs max-w-[100px] truncate" title={routeInfo?.route_name}>
                          {routeInfo?.route_name || "-"}
                        </TableCell>
                      )}
                      {visibleColumns.includes("reference") && (
                        <TableCell className="text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            {entry?.reference || "-"}
                            {entry?.reference && entry?.reference !== "-" && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-0"
                                onClick={() => handleViewDocument(entry.reference, entry.source_module, entry.id, entry.entry_number)}
                                title="View Document"
                              >
                                <FileText className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.includes("description") && (
                        <TableCell className="max-w-[150px] truncate" title={t.description || entry?.description}>
                          <span>{t.description || entry?.description}</span>
                        </TableCell>
                      )}
                      {visibleColumns.includes("debit") && (
                        <TableCell className="text-right font-mono text-green-600 dark:text-green-400">
                          {(t.debit || 0) > 0 && <CurrencyDisplay amount={t.debit} />}
                        </TableCell>
                      )}
                      {visibleColumns.includes("credit") && (
                        <TableCell className="text-right font-mono text-red-600 dark:text-red-400">
                          {(t.credit || 0) > 0 && <CurrencyDisplay amount={t.credit} />}
                        </TableCell>
                      )}
                      {visibleColumns.includes("balance") && (
                        <TableCell className="text-right font-mono">
                          <CurrencyDisplay amount={t.runningBalance} />
                        </TableCell>
                      )}
                      {visibleColumns.includes("status") && (
                        <TableCell>
                          {(() => {
                            const ref = entry?.reference;
                            const invData = ref ? invoiceBalances?.[ref] : undefined;
                            
                            // If it was manually reconciled via the old ledger matching system
                            if (t.reconciliation_id) {
                              return (
                                <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200 flex items-center w-max">
                                  <CheckCircle className="w-3 h-3 mr-1" /> Reconciled
                                </Badge>
                              );
                            }

                            if (!invData) return null;

                            if (invData.type === 'invoice') {
                              if (invData.balance === 0) {
                                return (
                                  <Badge className="text-[10px] bg-green-100 text-green-800 hover:bg-green-100 border-0 flex items-center w-max cursor-pointer" onClick={() => handleViewDocument(ref, entry.source_module, entry.id, entry.entry_number)}>
                                    <CheckCircle className="w-3 h-3 mr-1" /> Reconciled (Bal 0)
                                  </Badge>
                                );
                              }
                              return (
                                <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-50 cursor-pointer" onClick={() => handleViewDocument(ref, entry.source_module, entry.id, entry.entry_number)}>
                                  Bal: {invData.balance.toLocaleString()}
                                </Badge>
                              );
                            } else if (invData.type === 'receipt' && invData.parentRef) {
                              return (
                                <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 cursor-pointer" onClick={() => handleViewDocument(invData.parentRef!, 'ar_invoice', entry.id, '')}>
                                  Applied to: {invData.parentRef}
                                </Badge>
                              );
                            }
                            return null;
                          })()}
                        </TableCell>
                      )}
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirmJEId(entry?.id)}
                          title="Delete this journal entry"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-muted/50 font-medium">
                  <TableCell colSpan={visibleColumns.filter(c => ["date", "entry_number", "account", "bu", "bus", "route", "reference", "description", "debit", "credit"].includes(c) && (c !== "account" || resolvedAccountIds.length > 1)).length + 1} className="text-right py-3">
                    <div className="flex items-center justify-end gap-2">
                      <span>Balance Brought Forward</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-xs gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={() => setShowBreakdown(true)}
                            >
                              <Eye className="h-3 w-3" />
                              View Breakdown
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>See how this opening balance is composed</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                  {visibleColumns.includes("balance") && (
                    <TableCell className="text-right font-mono">
                      <CurrencyDisplay amount={broughtForwardBalance} />
                    </TableCell>
                  )}
                  {visibleColumns.includes("status") && <TableCell></TableCell>}
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {selectedRows.size > 0
                ? `${selectedRows.size} of ${filteredTransactions?.length || 0} selected`
                : `${filteredTransactions?.length || 0} transactions`}
            </span>
            {selectedRows.size > 0 && (
              <div className="flex items-center gap-3 bg-muted/50 px-3 py-1.5 rounded-md border">
                <span className="text-sm font-medium">
                  Net Balance: 
                  <span className={`ml-2 ${selectedNetBalance === 0 ? "text-green-600" : "text-destructive"}`}>
                    <CurrencyDisplay amount={selectedNetBalance} />
                  </span>
                </span>
                {selectedNetBalance === 0 && (
                  <Button 
                    size="sm" 
                    variant="default"
                    className="h-7 text-xs bg-green-600 hover:bg-green-700"
                    onClick={handleReconcile}
                    disabled={reconcileMutation.isPending}
                  >
                    {reconcileMutation.isPending ? "Reconciling..." : "Mark as Reconciled"}
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export {selectedRows.size > 0 ? "Selected" : "All"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={!!deleteConfirmJEId} onOpenChange={(open) => !open && setDeleteConfirmJEId(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Journal Entry?</AlertDialogTitle>
          <AlertDialogDescription>
            This will reverse all COA balance impacts and permanently delete the journal entry and its lines.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteJE}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* === Opening Balance Breakdown Dialog === */}
    <Dialog open={showBreakdown} onOpenChange={setShowBreakdown}>
      <DialogContent className="max-w-[800px] max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            Opening Balance Breakdown
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            How the Balance Brought Forward of <span className="font-semibold text-foreground"><CurrencyDisplay amount={broughtForwardBalance} /></span> is composed
          </p>
        </DialogHeader>

        {breakdownLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : breakdownData ? (
          <div className="space-y-4">
            {/* COA vs Computed comparison */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">COA Opening Balance</p>
                  <p className="text-lg font-semibold">
                    <CurrencyDisplay amount={breakdownData.coaOpeningBalance} />
                  </p>
                  <p className="text-[10px] text-muted-foreground">Set during chart of accounts setup</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">Pre-Filter JE Movements</p>
                  <p className="text-lg font-semibold">
                    <CurrencyDisplay amount={breakdownData.netBeforeMovement} />
                  </p>
                  <p className="text-[10px] text-muted-foreground">{breakdownData.beforeFilterCount} entries before date filter</p>
                </CardContent>
              </Card>
              <Card className={breakdownData.computedBBF !== broughtForwardBalance ? "border-amber-300 bg-amber-50/50" : "border-green-300 bg-green-50/50"}>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">Computed BBF</p>
                  <p className="text-lg font-semibold">
                    <CurrencyDisplay amount={breakdownData.computedBBF} />
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {breakdownData.computedBBF === broughtForwardBalance 
                      ? "✅ Matches display" 
                      : `⚠️ Display shows ${broughtForwardBalance.toLocaleString()}`}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Formula explanation */}
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="font-medium mb-1">Formula <Badge variant="outline" className="ml-1 text-[10px]">{isDebitNormal ? "Debit-Normal" : "Credit-Normal"}</Badge>:</p>
              <p className="font-mono text-xs">
                BBF = COA Current Balance ({breakdownData.coaCurrentBalance.toLocaleString()}) − Type-Adjusted Net Movement ({fetchedNetMovement.toLocaleString()}) = <span className="font-bold">{broughtForwardBalance.toLocaleString()}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isDebitNormal 
                  ? "Net Movement = Debits − Credits (debit-normal convention)"
                  : "Net Movement = Credits − Debits (credit-normal convention)"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Total entries on this account: {breakdownData.totalAllEntries} ({breakdownData.beforeFilterCount} before filter, {breakdownData.withinFilterCount} within filter)
              </p>
            </div>

            {/* By Source Module */}
            {Object.keys(breakdownData.bySource).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">By Source Module (Before Date Filter)</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Entries</TableHead>
                      <TableHead className="text-right">Total Debit</TableHead>
                      <TableHead className="text-right">Total Credit</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(breakdownData.bySource)
                      .sort(([,a], [,b]) => Math.abs(b.totalDebit - b.totalCredit) - Math.abs(a.totalDebit - a.totalCredit))
                      .map(([source, data]) => {
                        const net = data.totalDebit - data.totalCredit;
                        const isExpanded = breakdownExpanded[source];
                        return (
                          <>
                            <TableRow key={source} className="cursor-pointer hover:bg-muted/50" onClick={() => setBreakdownExpanded(prev => ({ ...prev, [source]: !prev[source] }))}>
                              <TableCell className="flex items-center gap-1">
                                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                <Badge variant="outline" className="text-xs">
                                  {source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">{data.entries.length}</TableCell>
                              <TableCell className="text-right font-mono text-green-600">{data.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell className="text-right font-mono text-red-600">{data.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell className={`text-right font-mono font-medium ${net >= 0 ? 'text-green-700' : 'text-red-700'}`}>{net.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                            </TableRow>
                            {isExpanded && data.entries.slice(0, 50).map((entry: any, idx: number) => {
                              const je = entry.journal_entries as any;
                              return (
                                <TableRow key={`${source}-${idx}`} className="bg-muted/20 text-xs">
                                  <TableCell className="pl-8 font-mono text-muted-foreground" colSpan={1}>
                                    {je?.entry_date} — {je?.entry_number}
                                  </TableCell>
                                  <TableCell className="text-right text-muted-foreground">{je?.reference || '-'}</TableCell>
                                  <TableCell className="text-right font-mono text-green-600">{(entry.debit || 0) > 0 ? entry.debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}</TableCell>
                                  <TableCell className="text-right font-mono text-red-600">{(entry.credit || 0) > 0 ? entry.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}</TableCell>
                                  <TableCell className="text-right font-mono text-muted-foreground">{((entry.debit || 0) - (entry.credit || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                </TableRow>
                              );
                            })}
                            {isExpanded && data.entries.length > 50 && (
                              <TableRow className="bg-muted/20 text-xs">
                                <TableCell colSpan={5} className="text-center text-muted-foreground italic">
                                  ... and {data.entries.length - 50} more entries
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        );
                      })}
                    <TableRow className="font-semibold bg-muted/50">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{breakdownData.beforeFilterCount}</TableCell>
                      <TableCell className="text-right font-mono text-green-700">{breakdownData.totalBeforeDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right font-mono text-red-700">{breakdownData.totalBeforeCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className={`text-right font-mono font-bold ${breakdownData.netBeforeMovement >= 0 ? 'text-green-700' : 'text-red-700'}`}>{breakdownData.netBeforeMovement.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}

            {/* By Month */}
            {Object.keys(breakdownData.byMonth).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Monthly Summary (Before Date Filter)</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Entries</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(breakdownData.byMonth)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([month, data]) => {
                        const net = data.totalDebit - data.totalCredit;
                        return (
                          <TableRow key={month}>
                            <TableCell className="font-mono text-sm">{month}</TableCell>
                            <TableCell className="text-right">{data.count}</TableCell>
                            <TableCell className="text-right font-mono text-green-600">{data.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right font-mono text-red-600">{data.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className={`text-right font-mono ${net >= 0 ? 'text-green-700' : 'text-red-700'}`}>{net.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            )}

            {breakdownData.beforeFilterCount === 0 && !dateRange.from && (
              <div className="text-center text-muted-foreground py-6">
                <p className="text-sm">No date filter is applied — the entire balance is from the COA current_balance field.</p>
                <p className="text-xs mt-1">COA Current Balance: <span className="font-mono font-semibold">{breakdownData.coaCurrentBalance.toLocaleString()}</span></p>
                <p className="text-xs">All {breakdownData.totalAllEntries} journal entries are shown in the table above.</p>
              </div>
            )}

            {/* === Recalculate Balance Action === */}
            {broughtForwardBalance !== 0 && (
              <div className="border-t pt-4 mt-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <RefreshCw className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-amber-800">Balance Out of Sync</h4>
                      <p className="text-xs text-amber-700 mt-1">
                        The COA <code className="bg-amber-100 px-1 rounded">current_balance</code> does not match the actual journal entry data.
                        This causes the phantom Brought Forward of <span className="font-semibold"><CurrencyDisplay amount={broughtForwardBalance} /></span>.
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
                        Click <strong>Recalculate</strong> to recompute the balance from {breakdownData.totalAllEntries} posted journal entries. This will set BBF to <strong>LKR 0.00</strong>.
                      </p>
                      <div className="mt-3 flex gap-2">
                        {!showRecalcConfirm ? (
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                            onClick={() => setShowRecalcConfirm(true)}
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Recalculate Balance
                          </Button>
                        ) : (
                          <div className="bg-white border border-amber-300 rounded-md p-3 w-full">
                            <p className="text-xs text-amber-800 font-medium mb-2">
                              ⚠️ This will update the <code className="bg-amber-100 px-1 rounded">current_balance</code> field in the Chart of Accounts for {resolvedAccountIds.length} account(s).
                              The balance will be recalculated from all {breakdownData.totalAllEntries} posted journal entries.
                            </p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                className="gap-1.5"
                                onClick={handleRecalculateBalance}
                                disabled={isRecalculating}
                              >
                                {isRecalculating ? (
                                  <><Loader2 className="h-3.5 w-3.5 animate-spin" />Recalculating...</>
                                ) : (
                                  <><ShieldCheck className="h-3.5 w-3.5" />Yes, Recalculate Now</>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowRecalcConfirm(false)}
                                disabled={isRecalculating}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {broughtForwardBalance === 0 && (
              <div className="border-t pt-4 mt-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Balance is in sync</p>
                    <p className="text-xs text-green-700">The COA current_balance matches the journal entry data. No action needed.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-6">
            No breakdown data available
          </div>
        )}
      </DialogContent>
    </Dialog>

    {previewDocType && previewDocData && (
      <FinanceDocumentPreviewModal
        open={previewModalOpen}
        onOpenChange={(open) => {
          setPreviewModalOpen(open);
          if (!open) {
            // Optional: reset after close animation
            setTimeout(() => {
              setPreviewDocType("");
              setPreviewDocData(null);
            }, 300);
          }
        }}
        documentType={previewDocType}
        documentData={previewDocData}
      />
    )}
    </>
  );
};
