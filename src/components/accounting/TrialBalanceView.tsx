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
import { FileSpreadsheet, Printer, Download, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import {
  useChartOfAccounts,
  useFinancialPeriods,
  useCostCenters,
  useTrialBalanceData,
  useAutoBusinessUnitFilter,
} from "@/hooks/useAccountingData";
import { format } from "date-fns";
import { DataExportMenu } from "@/components/ui/DataExportMenu";
import { BusinessUnitSelector } from "./shared/BusinessUnitSelector";

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

// Debit-normal account types
const DEBIT_NORMAL_TYPES = ["asset", "expense", "cost_of_sales"];

export const TrialBalanceView = () => {
  const { data: accounts = [] } = useChartOfAccounts();
  const { data: periods = [] } = useFinancialPeriods();
  const { data: costCenters = [] } = useCostCenters();
  const autoBU = useAutoBusinessUnitFilter();

  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [selectedCostCenter, setSelectedCostCenter] = useState("all");
  const [showZeroBalances, setShowZeroBalances] = useState(false);
  const [businessUnit, setBusinessUnit] = useState<string>(autoBU || "all");

  // Sync with context if it changes
  useMemo(() => {
    if (autoBU) setBusinessUnit(autoBU);
  }, [autoBU]);

  const selectedPeriod = periods.find((p: any) => p.id === selectedPeriodId);

  const { openingMovements, periodMovements, isLoading } = useTrialBalanceData(
    selectedPeriod?.start_date || null,
    selectedPeriod?.end_date || null,
    selectedCostCenter !== "all" ? selectedCostCenter : undefined
  );

  // Build lookup maps for movements
  const openingMap = useMemo(() => {
    const map: Record<string, { debit: number; credit: number }> = {};
    openingMovements.forEach((m) => {
      map[m.account_id] = { debit: m.total_debit, credit: m.total_credit };
    });
    return map;
  }, [openingMovements]);

  const periodMap = useMemo(() => {
    const map: Record<string, { debit: number; credit: number }> = {};
    periodMovements.forEach((m) => {
      map[m.account_id] = { debit: m.total_debit, credit: m.total_credit };
    });
    return map;
  }, [periodMovements]);

  // Calculate trial balance
  const trialBalance = useMemo(() => {
    if (!selectedPeriod) return [];

    const rows: TrialBalanceRow[] = [];

    accounts.forEach((account: any) => {
      const isDebitNormal = DEBIT_NORMAL_TYPES.includes(account.account_type);

      // Opening = COA opening_balance + all JE lines before period start
      const coaOpening = account.opening_balance || 0;
      const jeOpening = openingMap[account.id] || { debit: 0, credit: 0 };
      // Net opening = COA opening + (JE debits - JE credits)
      const netOpening = coaOpening + (jeOpening.debit - jeOpening.credit);

      let openingDebit = 0;
      let openingCredit = 0;
      if (isDebitNormal) {
        // Debit-normal: positive net → debit column, negative → credit column
        if (netOpening >= 0) {
          openingDebit = netOpening;
        } else {
          openingCredit = Math.abs(netOpening);
        }
      } else {
        // Credit-normal: positive net means more debits than credits → debit column
        // But for credit-normal accounts, a natural balance is credit
        // Net = DR - CR; if negative (CR > DR), show in credit; if positive (DR > CR), show in debit
        if (netOpening >= 0) {
          openingDebit = netOpening;
        } else {
          openingCredit = Math.abs(netOpening);
        }
      }

      // Period movements: raw debits and credits
      const jePeriod = periodMap[account.id] || { debit: 0, credit: 0 };
      const periodDebit = jePeriod.debit;
      const periodCredit = jePeriod.credit;

      // Closing = Opening net + Period net
      const netClosing = netOpening + (periodDebit - periodCredit);
      let closingDebit = 0;
      let closingCredit = 0;
      if (netClosing >= 0) {
        closingDebit = netClosing;
      } else {
        closingCredit = Math.abs(netClosing);
      }

      rows.push({
        accountCode: account.account_code,
        accountName: account.account_name,
        accountType: account.account_type,
        openingDebit,
        openingCredit,
        periodDebit,
        periodCredit,
        closingDebit,
        closingCredit,
      });
    });

    // Filter zero balances
    let result = rows;
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
  }, [accounts, openingMap, periodMap, selectedPeriod, showZeroBalances]);

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
          <DataExportMenu 
            data={trialBalance}
            title={`Trial Balance - ${selectedPeriod?.period_name || "Report"}`}
            filename={`trial_balance_${selectedPeriod?.period_name || "report"}`}
            headers={[
              "Account Code",
              "Account Name",
              "Type",
              "Opening Dr",
              "Opening Cr",
              "Period Dr",
              "Period Cr",
              "Closing Dr",
              "Closing Cr"
            ]}
            transformData={(data) => data.map(row => [
              row.accountCode,
              row.accountName,
              row.accountType,
              formatNumber(row.openingDebit),
              formatNumber(row.openingCredit),
              formatNumber(row.periodDebit),
              formatNumber(row.periodCredit),
              formatNumber(row.closingDebit),
              formatNumber(row.closingCredit),
            ])}
          />
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
                      {cc.center_code} - {cc.center_name}
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
      {selectedPeriodId && !isLoading && (
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
      )}

      {/* Trial Balance Table */}
      <Card>
        <CardContent className="pt-4">
          {!selectedPeriodId ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a financial period to generate the trial balance</p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin opacity-50" />
              <p>Calculating trial balance...</p>
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

                  {trialBalance.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No account movements found for this period
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Totals Row */}
                  {trialBalance.length > 0 && (
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
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};