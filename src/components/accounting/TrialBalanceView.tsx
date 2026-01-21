import { useState, useMemo } from "react";
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
import { FileSpreadsheet, Printer, Download, AlertCircle, CheckCircle } from "lucide-react";
import {
  useChartOfAccounts,
  useJournalEntries,
  useFinancialPeriods,
  useCostCenters,
} from "@/hooks/useAccountingData";
import { format } from "date-fns";

interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  accountType: string;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
}

export const TrialBalanceView = () => {
  const { data: accounts = [] } = useChartOfAccounts();
  const { data: journalEntries = [] } = useJournalEntries("posted");
  const { data: periods = [] } = useFinancialPeriods();
  const { data: costCenters = [] } = useCostCenters();

  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [selectedCostCenter, setSelectedCostCenter] = useState("all");
  const [showZeroBalances, setShowZeroBalances] = useState(false);

  const selectedPeriod = periods.find((p: any) => p.id === selectedPeriodId);

  // Calculate trial balance
  const trialBalance = useMemo(() => {
    if (!selectedPeriod) return [];

    const periodStart = new Date(selectedPeriod.start_date);
    const periodEnd = new Date(selectedPeriod.end_date);

    // Filter entries within period
    const periodEntries = journalEntries.filter((entry: any) => {
      const entryDate = new Date(entry.entry_date);
      return entryDate >= periodStart && entryDate <= periodEnd;
    });

    // Calculate balances per account
    const balances: Record<string, TrialBalanceRow> = {};

    accounts.forEach((account: any) => {
      balances[account.id] = {
        accountCode: account.account_code,
        accountName: account.account_name,
        accountType: account.account_type,
        openingDebit: 0,
        openingCredit: 0,
        periodDebit: 0,
        periodCredit: 0,
        closingDebit: 0,
        closingCredit: 0,
      };

      // Use opening balance from account if available
      const openingBalance = account.opening_balance || 0;
      if (openingBalance >= 0) {
        if (["asset", "expense"].includes(account.account_type)) {
          balances[account.id].openingDebit = openingBalance;
        } else {
          balances[account.id].openingCredit = openingBalance;
        }
      } else {
        if (["asset", "expense"].includes(account.account_type)) {
          balances[account.id].openingCredit = Math.abs(openingBalance);
        } else {
          balances[account.id].openingDebit = Math.abs(openingBalance);
        }
      }
    });

    // Sum up period movements from journal entry lines
    periodEntries.forEach((entry: any) => {
      if (entry.lines) {
        entry.lines.forEach((line: any) => {
          if (line.account_id && balances[line.account_id]) {
            // Filter by cost center if selected
            if (
              selectedCostCenter !== "all" &&
              line.cost_center_id !== selectedCostCenter
            ) {
              return;
            }
            balances[line.account_id].periodDebit += line.debit_amount || 0;
            balances[line.account_id].periodCredit += line.credit_amount || 0;
          }
        });
      }
    });

    // Calculate closing balances
    Object.values(balances).forEach((row) => {
      const netOpening = row.openingDebit - row.openingCredit;
      const netPeriod = row.periodDebit - row.periodCredit;
      const netClosing = netOpening + netPeriod;

      if (netClosing >= 0) {
        row.closingDebit = netClosing;
        row.closingCredit = 0;
      } else {
        row.closingDebit = 0;
        row.closingCredit = Math.abs(netClosing);
      }
    });

    // Filter and sort
    let result = Object.values(balances);

    if (!showZeroBalances) {
      result = result.filter(
        (row) =>
          row.openingDebit !== 0 ||
          row.openingCredit !== 0 ||
          row.periodDebit !== 0 ||
          row.periodCredit !== 0 ||
          row.closingDebit !== 0 ||
          row.closingCredit !== 0
      );
    }

    return result.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
  }, [accounts, journalEntries, selectedPeriod, selectedCostCenter, showZeroBalances]);

  // Calculate totals
  const totals = useMemo(() => {
    return trialBalance.reduce(
      (acc, row) => ({
        openingDebit: acc.openingDebit + row.openingDebit,
        openingCredit: acc.openingCredit + row.openingCredit,
        periodDebit: acc.periodDebit + row.periodDebit,
        periodCredit: acc.periodCredit + row.periodCredit,
        closingDebit: acc.closingDebit + row.closingDebit,
        closingCredit: acc.closingCredit + row.closingCredit,
      }),
      {
        openingDebit: 0,
        openingCredit: 0,
        periodDebit: 0,
        periodCredit: 0,
        closingDebit: 0,
        closingCredit: 0,
      }
    );
  }, [trialBalance]);

  const isBalanced = {
    opening: Math.abs(totals.openingDebit - totals.openingCredit) < 0.01,
    period: Math.abs(totals.periodDebit - totals.periodCredit) < 0.01,
    closing: Math.abs(totals.closingDebit - totals.closingCredit) < 0.01,
  };

  const formatNumber = (num: number) => {
    if (num === 0) return "-";
    return num.toLocaleString("en-US", { minimumFractionDigits: 2 });
  };

  const handleExport = () => {
    // Create CSV content
    const headers = [
      "Account Code",
      "Account Name",
      "Type",
      "Opening Dr",
      "Opening Cr",
      "Period Dr",
      "Period Cr",
      "Closing Dr",
      "Closing Cr",
    ];
    const rows = trialBalance.map((row) => [
      row.accountCode,
      row.accountName,
      row.accountType,
      row.openingDebit.toFixed(2),
      row.openingCredit.toFixed(2),
      row.periodDebit.toFixed(2),
      row.periodCredit.toFixed(2),
      row.closingDebit.toFixed(2),
      row.closingCredit.toFixed(2),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trial-balance-${selectedPeriod?.period_name || "report"}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Trial Balance</h2>
          <p className="text-muted-foreground">
            Summary of all account balances for a financial period
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
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
              <Label>Cost Center</Label>
              <Select value={selectedCostCenter} onValueChange={setSelectedCostCenter}>
                <SelectTrigger>
                  <SelectValue placeholder="All cost centers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cost Centers</SelectItem>
                  {costCenters.map((cc: any) => (
                    <SelectItem key={cc.id} value={cc.id}>
                      {cc.cost_center_code} - {cc.cost_center_name}
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
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showZeroBalances}
                  onChange={(e) => setShowZeroBalances(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Show zero balances</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance Status */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Opening Balance</p>
                <p className="text-lg font-semibold">
                  {isBalanced.opening ? "Balanced" : "Unbalanced"}
                </p>
              </div>
              {isBalanced.opening ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <AlertCircle className="h-8 w-8 text-destructive" />
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Period Movements</p>
                <p className="text-lg font-semibold">
                  {isBalanced.period ? "Balanced" : "Unbalanced"}
                </p>
              </div>
              {isBalanced.period ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <AlertCircle className="h-8 w-8 text-destructive" />
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Closing Balance</p>
                <p className="text-lg font-semibold">
                  {isBalanced.closing ? "Balanced" : "Unbalanced"}
                </p>
              </div>
              {isBalanced.closing ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <AlertCircle className="h-8 w-8 text-destructive" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trial Balance Table */}
      <Card>
        <CardContent className="pt-4">
          {!selectedPeriodId ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a financial period to generate the trial balance</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead rowSpan={2}>Account Code</TableHead>
                    <TableHead rowSpan={2}>Account Name</TableHead>
                    <TableHead rowSpan={2}>Type</TableHead>
                    <TableHead colSpan={2} className="text-center border-l">
                      Opening Balance
                    </TableHead>
                    <TableHead colSpan={2} className="text-center border-l">
                      Period Movements
                    </TableHead>
                    <TableHead colSpan={2} className="text-center border-l">
                      Closing Balance
                    </TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead className="text-right border-l">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right border-l">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right border-l">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trialBalance.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.accountCode}</TableCell>
                      <TableCell>{row.accountName}</TableCell>
                      <TableCell className="capitalize">{row.accountType}</TableCell>
                      <TableCell className="text-right font-mono border-l">
                        {formatNumber(row.openingDebit)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(row.openingCredit)}
                      </TableCell>
                      <TableCell className="text-right font-mono border-l">
                        {formatNumber(row.periodDebit)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(row.periodCredit)}
                      </TableCell>
                      <TableCell className="text-right font-mono border-l">
                        {formatNumber(row.closingDebit)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(row.closingCredit)}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Totals Row */}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell colSpan={3}>TOTALS</TableCell>
                    <TableCell
                      className={`text-right font-mono border-l ${
                        !isBalanced.opening ? "text-destructive" : ""
                      }`}
                    >
                      {formatNumber(totals.openingDebit)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono ${
                        !isBalanced.opening ? "text-destructive" : ""
                      }`}
                    >
                      {formatNumber(totals.openingCredit)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono border-l ${
                        !isBalanced.period ? "text-destructive" : ""
                      }`}
                    >
                      {formatNumber(totals.periodDebit)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono ${
                        !isBalanced.period ? "text-destructive" : ""
                      }`}
                    >
                      {formatNumber(totals.periodCredit)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono border-l ${
                        !isBalanced.closing ? "text-destructive" : ""
                      }`}
                    >
                      {formatNumber(totals.closingDebit)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono ${
                        !isBalanced.closing ? "text-destructive" : ""
                      }`}
                    >
                      {formatNumber(totals.closingCredit)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
