import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Switch } from "@/components/ui/switch";
import { Printer, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import {
  useChartOfAccounts,
  useFinancialPeriods,
  useCostCenters,
  useAutoBusinessUnitFilter
} from "@/hooks/useAccountingData";
import { format } from "date-fns";
import { DataExportMenu } from "@/components/ui/DataExportMenu";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/utils";
import { DrillDownModal } from "./DrillDownModal";
import { useCompany } from "@/contexts/CompanyContext";

const DEBIT_NORMAL_TYPES = ["asset", "expense", "cost_of_sales"];

export const GeneralLedgerReport = () => {
  const { data: accounts = [] } = useChartOfAccounts();
  const { data: periods = [] } = useFinancialPeriods();
  const { data: costCenters = [] } = useCostCenters();
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [selectedCostCenter, setSelectedCostCenter] = useState("all");
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [hideZeroBalances, setHideZeroBalances] = useState(false);

  // Drill down modal state
  const [drillDownAccountIds, setDrillDownAccountIds] = useState<string[]>([]);
  const [isDrillDownOpen, setIsDrillDownOpen] = useState(false);

  const selectedPeriod = periods.find((p: any) => p.id === selectedPeriodId);

  // Fetch transactions based on filters
  const { data: transactionsData = [], isLoading } = useQuery({
    queryKey: [
      "general-ledger-transactions",
      effectiveCompanyId,
      selectedPeriod?.start_date,
      selectedPeriod?.end_date,
      selectedCostCenter,
      autoBusinessUnitCode
    ],
    queryFn: async () => {
      if (!effectiveCompanyId || !selectedPeriod) return [];

      let query = supabase
        .from("journal_entry_lines")
        .select(`
          id,
          debit,
          credit,
          description,
          created_at,
          account_id,
          journal_entries!inner(
            id,
            entry_number,
            entry_date,
            description,
            status,
            business_unit_code,
            reference,
            source_module
          )
        `)
        .eq("journal_entries.status", "posted")
        .eq("journal_entries.company_id", effectiveCompanyId)
        .order("journal_entries(entry_date)", { ascending: true })
        .order("created_at", { ascending: true });

      if (selectedPeriod.start_date) {
        query = query.gte("journal_entries.entry_date", selectedPeriod.start_date);
      }
      if (selectedPeriod.end_date) {
        query = query.lte("journal_entries.entry_date", selectedPeriod.end_date);
      }
      if (selectedCostCenter && selectedCostCenter !== "all") {
        query = query.eq("journal_entries.business_unit_code", selectedCostCenter);
      } else if (autoBusinessUnitCode) {
        query = query.eq("journal_entries.business_unit_code", autoBusinessUnitCode);
      }

      const data = await fetchAllRows(query);
      return data;
    },
    enabled: !!effectiveCompanyId && !!selectedPeriod,
  });

  // Also fetch opening movements prior to start_date to calculate beginning balances
  const { data: openingBalances = {} } = useQuery({
    queryKey: [
      "general-ledger-opening-balances",
      effectiveCompanyId,
      selectedPeriod?.start_date,
      selectedCostCenter,
      autoBusinessUnitCode
    ],
    queryFn: async () => {
      if (!effectiveCompanyId || !selectedPeriod?.start_date) return {};

      let query = supabase
        .from("journal_entry_lines")
        .select(`
          account_id,
          debit,
          credit,
          journal_entries!inner(
            entry_date,
            status,
            company_id,
            business_unit_code
          )
        `)
        .eq("journal_entries.status", "posted")
        .eq("journal_entries.company_id", effectiveCompanyId)
        .lt("journal_entries.entry_date", selectedPeriod.start_date);

      if (selectedCostCenter && selectedCostCenter !== "all") {
        query = query.eq("journal_entries.business_unit_code", selectedCostCenter);
      } else if (autoBusinessUnitCode) {
        query = query.eq("journal_entries.business_unit_code", autoBusinessUnitCode);
      }

      const data = await fetchAllRows(query);
      
      const balances: Record<string, { debit: number; credit: number }> = {};
      data.forEach((row) => {
        if (!balances[row.account_id]) {
          balances[row.account_id] = { debit: 0, credit: 0 };
        }
        balances[row.account_id].debit += Number(row.debit) || 0;
        balances[row.account_id].credit += Number(row.credit) || 0;
      });
      return balances;
    },
    enabled: !!effectiveCompanyId && !!selectedPeriod?.start_date,
  });

  const toggleAccount = (accountId: string) => {
    setExpandedAccounts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    if (selectedAccountId !== "all") {
      setExpandedAccounts(new Set([selectedAccountId]));
    } else {
      setExpandedAccounts(new Set(accounts.map((a: any) => a.id)));
    }
  };

  const collapseAll = () => {
    setExpandedAccounts(new Set());
  };

  const handleRowClick = (accountId: string) => {
    setDrillDownAccountIds([accountId]);
    setIsDrillDownOpen(true);
  };

  // Group transactions by account
  const groupedData = useMemo(() => {
    if (!selectedPeriod) return [];

    const result = [];
    
    // Filter accounts based on dropdown selection
    const filteredAccounts = selectedAccountId === "all" 
      ? accounts 
      : accounts.filter((a: any) => a.id === selectedAccountId);

    for (const account of filteredAccounts) {
      const accountTransactions = transactionsData.filter((t: any) => t.account_id === account.id);
      
      const isDebitNormal = DEBIT_NORMAL_TYPES.includes(account.account_type);
      
      // Calculate beginning balance
      const coaOpening = account.opening_balance || 0;
      const jeOpening = openingBalances[account.id] || { debit: 0, credit: 0 };
      const netOpening = coaOpening + (jeOpening.debit - jeOpening.credit);
      
      // For credit normal, a negative netOpening means credit > debit, which is positive for them
      const beginningBalance = isDebitNormal ? netOpening : -netOpening;

      let currentBalance = beginningBalance;
      
      const lines = accountTransactions.map((t: any) => {
        const debit = Number(t.debit) || 0;
        const credit = Number(t.credit) || 0;
        
        if (isDebitNormal) {
          currentBalance += (debit - credit);
        } else {
          currentBalance += (credit - debit);
        }

        return {
          ...t,
          runningBalance: currentBalance
        };
      });

      // Skip empty accounts if "All" is selected (to reduce noise)
      if (selectedAccountId === "all" && accountTransactions.length === 0 && account.opening_balance === 0) {
        continue;
      }
      
      // Hide zero balances if toggled on
      if (hideZeroBalances && accountTransactions.length === 0 && beginningBalance === 0 && currentBalance === 0) {
        continue;
      }

      result.push({
        account,
        lines,
        beginningBalance,
        endingBalance: currentBalance,
        isDebitNormal
      });
    }

    const categoryGroups = [
      { id: 'asset', name: 'ASSETS', accounts: [] as typeof result },
      { id: 'liability', name: 'LIABILITIES', accounts: [] as typeof result },
      { id: 'equity', name: 'EQUITY', accounts: [] as typeof result },
      { id: 'revenue', name: 'REVENUE', accounts: [] as typeof result },
      { id: 'expense', name: 'EXPENSES', accounts: [] as typeof result }
    ];

    for (const group of result) {
      const type = group.account.account_type;
      let catId = type;
      if (type === 'cost_of_sales') catId = 'expense';
      
      const category = categoryGroups.find(c => c.id === catId);
      if (category) {
        category.accounts.push(group);
      } else {
        const expenseCat = categoryGroups.find(c => c.id === 'expense');
        if (expenseCat) expenseCat.accounts.push(group);
      }
    }
    
    for (const cat of categoryGroups) {
      cat.accounts.sort((a, b) => a.account.account_code.localeCompare(b.account.account_code));
    }
    
    return categoryGroups.filter(c => c.accounts.length > 0);
  }, [accounts, transactionsData, openingBalances, selectedPeriod, selectedAccountId, hideZeroBalances]);

  const formatNumber = (num: number) => {
    if (num === 0) return "-";
    return num.toLocaleString("en-US", { minimumFractionDigits: 2 });
  };

  // Prepare export data
  const exportData = useMemo(() => {
    const data: any[] = [];
    groupedData.forEach((category) => {
      data.push({
        Type: "Category",
        Account: category.name,
        Date: "",
        Module: "",
        EntryNumber: "",
        Description: "",
        Debit: "",
        Credit: "",
        Balance: ""
      });
      category.accounts.forEach((group) => {
        data.push({
          Type: "Account",
          Account: `${group.account.account_code} - ${group.account.account_name}`,
          Date: "",
          Module: "",
          EntryNumber: "",
          Description: "",
          Debit: "",
          Credit: "",
          Balance: ""
        });
        data.push({
          Type: "Balance",
          Account: "",
          Date: "",
          Module: "",
          EntryNumber: "Beginning Balance",
          Description: "",
          Debit: "",
          Credit: "",
          Balance: formatNumber(group.beginningBalance)
        });
        group.lines.forEach((line: any) => {
          data.push({
            Type: "Transaction",
            Account: "",
            Date: format(new Date(line.journal_entries.entry_date), "yyyy-MM-dd"),
            Module: line.journal_entries.source_module || "Manual",
            EntryNumber: line.journal_entries.entry_number,
            Description: line.description || line.journal_entries.description || "",
            Debit: formatNumber(line.debit),
            Credit: formatNumber(line.credit),
            Balance: formatNumber(line.runningBalance)
          });
        });
        data.push({
          Type: "Balance",
          Account: "",
          Date: "",
          Module: "",
          EntryNumber: "Ending Balance",
          Description: "",
          Debit: "",
          Credit: "",
          Balance: formatNumber(group.endingBalance)
        });
      });
    });
    return data;
  }, [groupedData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">General Ledger</h2>
          <p className="text-muted-foreground">
            Account-wise transaction details and running balances
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <DataExportMenu 
            data={exportData}
            title={`General Ledger - ${selectedPeriod?.period_name || "Report"}`}
            filename={`general_ledger_${selectedPeriod?.period_name || "report"}`}
            headers={["Type", "Account", "Date", "Module", "Entry Number", "Description", "Debit", "Credit", "Balance"]}
            transformData={(data) => data.map(row => [
              row.Type,
              row.Account,
              row.Date,
              row.Module,
              row.EntryNumber,
              row.Description,
              row.Debit,
              row.Credit,
              row.Balance
            ])}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Financial Period</Label>
              <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((period: any) => (
                    <SelectItem key={period.id} value={period.id}>
                      {period.period_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Account Filter</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="All accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts.map((acc: any) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_code} - {acc.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Input
                value={
                  selectedPeriod
                    ? `${format(new Date(selectedPeriod.start_date), "MMM dd")} - ${format(
                        new Date(selectedPeriod.end_date),
                        "MMM dd, yyyy"
                      )}`
                    : ""
                }
                disabled
                placeholder="Select a period"
              />
            </div>
            <div className="flex flex-col justify-end gap-4 pb-0.5">
              <div className="flex items-center space-x-2">
                <Switch id="hide-zero" checked={hideZeroBalances} onCheckedChange={setHideZeroBalances} />
                <Label htmlFor="hide-zero" className="cursor-pointer">Hide Zero Balances</Label>
              </div>
              <div className="flex items-end gap-2">
                <Button variant="outline" size="sm" onClick={expandAll}>Expand All</Button>
                <Button variant="outline" size="sm" onClick={collapseAll}>Collapse All</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 px-0">
          {!selectedPeriodId ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin opacity-0" />
              <p>Select a financial period to generate the report</p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin opacity-50" />
              <p>Calculating general ledger balances...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="w-32">Date</TableHead>
                    <TableHead className="w-24">Type</TableHead>
                    <TableHead className="w-32">Entry No.</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right w-28">Debit</TableHead>
                    <TableHead className="text-right w-28">Credit</TableHead>
                    <TableHead className="text-right w-32">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No transactions found for the selected period
                      </TableCell>
                    </TableRow>
                  )}
                  {groupedData.map((category) => (
                    <React.Fragment key={category.id}>
                      <TableRow className="bg-primary/5 hover:bg-primary/5">
                        <TableCell colSpan={8} className="font-bold text-lg text-primary tracking-wide">
                          {category.name}
                        </TableCell>
                      </TableRow>
                      {category.accounts.map((group: any) => {
                        const isExpanded = expandedAccounts.has(group.account.id);
                        return (
                          <React.Fragment key={group.account.id}>
                            {/* Group Header Row */}
                            <TableRow 
                              className="bg-muted/30 cursor-pointer hover:bg-muted/50"
                              onClick={() => toggleAccount(group.account.id)}
                            >
                              <TableCell>
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </TableCell>
                              <TableCell colSpan={6} className="font-semibold pl-4">
                                {group.account.account_code} {group.account.account_name} 
                                <span className="text-muted-foreground font-normal ml-2 text-xs">
                                  ({group.lines.length} lines)
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-bold font-mono">
                                {formatNumber(group.endingBalance)}
                              </TableCell>
                            </TableRow>

                            {/* Expanded Content */}
                            {isExpanded && (
                              <>
                                {/* Beginning Balance Row */}
                                <TableRow className="bg-muted/10">
                                  <TableCell></TableCell>
                                  <TableCell colSpan={6} className="text-muted-foreground italic pl-8">
                                    Beginning Balance
                                  </TableCell>
                                  <TableCell className="text-right font-mono italic">
                                    {formatNumber(group.beginningBalance)}
                                  </TableCell>
                                </TableRow>

                                {/* Transaction Rows */}
                                {group.lines.map((line: any) => (
                                  <TableRow 
                                    key={line.id}
                                    className="cursor-pointer hover:bg-accent/50"
                                    onClick={() => handleRowClick(group.account.id)}
                                  >
                                    <TableCell></TableCell>
                                    <TableCell className="pl-8 whitespace-nowrap">
                                      {format(new Date(line.journal_entries.entry_date), "MMM dd, yyyy")}
                                    </TableCell>
                                    <TableCell className="capitalize text-xs text-muted-foreground">
                                      {line.journal_entries.source_module?.replace(/_/g, " ") || "Manual"}
                                    </TableCell>
                                    <TableCell className="font-medium text-xs">
                                      {line.journal_entries.entry_number}
                                    </TableCell>
                                    <TableCell className="text-xs truncate max-w-xs">
                                      {line.description || line.journal_entries.description || "-"}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-xs">
                                      {formatNumber(line.debit)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-xs">
                                      {formatNumber(line.credit)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                      {formatNumber(line.runningBalance)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                                
                                {/* Ending Balance Row */}
                                <TableRow className="bg-muted/20 font-medium">
                                  <TableCell></TableCell>
                                  <TableCell colSpan={6} className="pl-8">
                                    Ending Balance
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    {formatNumber(group.endingBalance)}
                                  </TableCell>
                                </TableRow>
                              </>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drill Down Modal */}
      {drillDownAccountIds.length > 0 && (
        <DrillDownModal
          open={isDrillDownOpen}
          onOpenChange={setIsDrillDownOpen}
          accountIds={drillDownAccountIds}
          dateRange={{
            from: selectedPeriod?.start_date ? new Date(selectedPeriod.start_date) : undefined,
            to: selectedPeriod?.end_date ? new Date(selectedPeriod.end_date) : undefined
          }}
          businessUnitFilter={selectedCostCenter}
          busFilter="all"
          routeFilter="all"
        />
      )}
    </div>
  );
};
