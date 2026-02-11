/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Loader2, Download, X, Filter, Bus, Route } from "lucide-react";
import { format } from "date-fns";

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
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>(initialDateRange || {});
  const [businessUnitFilter, setBusinessUnitFilter] = useState<string>("_all");
  const [transactionType, setTransactionType] = useState<string>("all");
  const [busFilter, setBusFilter] = useState<string>("_all");
  const [routeFilter, setRouteFilter] = useState<string>("_all");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

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
            reference
          ),
          chart_of_accounts:account_id(
            account_code,
            account_name
          )
        `
        )
        .in("account_id", resolvedAccountIds)
        .eq("journal_entries.status", "posted")
        .order("created_at", { ascending: false })
        .limit(500);

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

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: open && resolvedAccountIds.length > 0,
  });

  // Filter by transaction type on client side
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    if (transactionType === "debit") {
      return transactions.filter((t) => (t.debit || 0) > 0);
    }
    if (transactionType === "credit") {
      return transactions.filter((t) => (t.credit || 0) > 0);
    }
    return transactions;
  }, [transactions, transactionType]);

  // Calculate running balance
  const transactionsWithBalance = useMemo(() => {
    if (!filteredTransactions) return [];
    let runningBalance = 0;
    return [...filteredTransactions].reverse().map((t) => {
      runningBalance += (t.debit || 0) - (t.credit || 0);
      return { ...t, runningBalance };
    }).reverse();
  }, [filteredTransactions]);

  // Calculate totals
  const totalDebits = filteredTransactions?.reduce((sum, t) => sum + (t.debit || 0), 0) || 0;
  const totalCredits = filteredTransactions?.reduce((sum, t) => sum + (t.credit || 0), 0) || 0;
  const netMovement = totalDebits - totalCredits;

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

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
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
                        {entry?.reference || "-"}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {t.description || entry?.description}
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
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {selectedRows.size > 0
              ? `${selectedRows.size} of ${filteredTransactions?.length || 0} selected`
              : `${filteredTransactions?.length || 0} transactions`}
          </span>
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
  );
};
