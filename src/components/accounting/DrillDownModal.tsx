 
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
import { Loader2, Download, X, Filter, Bus, Route, Trash2, FileText } from "lucide-react";
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

  const [previewDocType, setPreviewDocType] = useState<string>("");
  const [previewDocData, setPreviewDocData] = useState<any>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const reconcileMutation = useReconcileJournalLines();

  const handleDeleteJE = async () => {
    if (!deleteConfirmJEId) return;
    setIsDeleting(true);
    try {
      const result = await reverseAndDeleteJournalEntry(deleteConfirmJEId);
      if (result.success) {
        toast.success("Journal entry deleted and COA balances reversed");
        queryClient.invalidateQueries({ queryKey: ["account-transactions"] });
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
        .select("id, current_balance")
        .in("id", resolvedAccountIds);
      if (error) throw error;
      return data;
    },
    enabled: open && resolvedAccountIds.length > 0,
  });

  const totalCurrentBalance = useMemo(() => {
    return accountsData?.reduce((sum, acc) => sum + (Number(acc.current_balance) || 0), 0) || 0;
  }, [accountsData]);

  // Calculate the total net movement of all FETCHED transactions
  const fetchedNetMovement = useMemo(() => {
    if (!transactions) return 0;
    const debits = transactions.reduce((sum, t) => sum + (t.debit || 0), 0);
    const credits = transactions.reduce((sum, t) => sum + (t.credit || 0), 0);
    return debits - credits;
  }, [transactions]);

  // The true Brought Forward balance is whatever is needed to make the running balance equal totalCurrentBalance
  const broughtForwardBalance = totalCurrentBalance - fetchedNetMovement;

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
  const transactionsWithBalance = useMemo(() => {
    if (!filteredTransactions) return [];
    let runningBalance = broughtForwardBalance;
    return [...filteredTransactions].reverse().map((t) => {
      runningBalance += (t.debit || 0) - (t.credit || 0);
      return { ...t, runningBalance };
    }).reverse();
  }, [filteredTransactions, broughtForwardBalance]);

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
      table = "ap_payment_vouchers";
      matchColumn = "payment_number";
      docType = "ap_payment_voucher";
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
  const totalDebits = filteredTransactions?.reduce((sum, t) => sum + (t.debit || 0), 0) || 0;
  const totalCredits = filteredTransactions?.reduce((sum, t) => sum + (t.credit || 0), 0) || 0;
  const netMovement = totalDebits - totalCredits;

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
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
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
                  <TableHead>Date</TableHead>
                  <TableHead>Entry #</TableHead>
                  {resolvedAccountIds.length > 1 && <TableHead>Account</TableHead>}
                  <TableHead>BU</TableHead>
                  <TableHead>Bus</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                   <TableHead className="text-right">Balance</TableHead>
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
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(entry?.entry_date || t.created_at), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {entry?.entry_number}
                      </TableCell>
                      {resolvedAccountIds.length > 1 && (
                        <TableCell className="text-xs font-mono">
                          {accountInfo ? `${accountInfo.account_code} - ${accountInfo.account_name}` : "-"}
                        </TableCell>
                      )}
                      <TableCell>
                        {entry?.business_unit_code && (
                          <Badge variant="outline" className="text-xs">
                            {entry.business_unit_code}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {busInfo?.bus_no && (
                          <Badge variant="secondary" className="text-xs">
                            {busInfo.bus_no}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs max-w-[100px] truncate" title={routeInfo?.route_name}>
                        {routeInfo?.route_name || "-"}
                      </TableCell>
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
                      <TableCell className="max-w-[150px] truncate flex items-center gap-2">
                        <span>{t.description || entry?.description}</span>
                        {t.reconciliation_id && (
                          <Badge variant="outline" className="text-[10px] h-5 bg-green-50 text-green-700 border-green-200">
                            ✔ Reconciled
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-600 dark:text-green-400">
                        {(t.debit || 0) > 0 && <CurrencyDisplay amount={t.debit} />}
                      </TableCell>
                      <TableCell className="text-right font-mono text-red-600 dark:text-red-400">
                        {(t.credit || 0) > 0 && <CurrencyDisplay amount={t.credit} />}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <CurrencyDisplay amount={t.runningBalance} />
                      </TableCell>
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
                  <TableCell colSpan={resolvedAccountIds.length > 1 ? 9 : 8} className="text-right py-3">
                    Balance Brought Forward
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right font-mono">
                    <CurrencyDisplay amount={broughtForwardBalance} />
                  </TableCell>
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
