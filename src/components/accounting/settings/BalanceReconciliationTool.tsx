/**
 * Balance Reconciliation Tool
 * Verifies COA balances against posted journal entry lines
 * and allows fixing any discrepancies found.
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertTriangle, RefreshCw, Wrench } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import { recalculateCOABalances, fixBalanceDiscrepancies } from "@/lib/gl-posting-utils";
import { CurrencyDisplay } from "../shared/CurrencyDisplay";
import { toast } from "sonner";

interface Discrepancy {
  accountId: string;
  accountCode: string;
  accountName: string;
  currentBalance: number;
  calculatedBalance: number;
  difference: number;
}

export const BalanceReconciliationTool = () => {
  const { selectedCompanyId } = useCompany();
  const [isRunning, setIsRunning] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[] | null>(null);
  const [lastRunAt, setLastRunAt] = useState<Date | null>(null);

  const runReconciliation = async () => {
    if (!selectedCompanyId) {
      toast.error("Please select a company first");
      return;
    }

    setIsRunning(true);
    try {
      const result = await recalculateCOABalances(selectedCompanyId);
      
      if (result.success) {
        setDiscrepancies(result.discrepancies);
        setLastRunAt(new Date());
        
        if (result.discrepancies.length === 0) {
          toast.success("All account balances are correct!");
        } else {
          toast.warning(`Found ${result.discrepancies.length} balance discrepancy(ies)`);
        }
      } else {
        toast.error(result.error || "Reconciliation failed");
      }
    } catch (error) {
      toast.error("Failed to run reconciliation");
    } finally {
      setIsRunning(false);
    }
  };

  const handleFixDiscrepancies = async () => {
    if (!discrepancies || discrepancies.length === 0) return;

    setIsFixing(true);
    try {
      const result = await fixBalanceDiscrepancies(
        discrepancies.map((d) => ({
          accountId: d.accountId,
          calculatedBalance: d.calculatedBalance,
        }))
      );

      if (result.success) {
        toast.success(`Fixed ${result.fixed} account balance(s)`);
        // Re-run reconciliation to verify
        await runReconciliation();
      } else {
        toast.error(result.error || "Failed to fix discrepancies");
      }
    } catch (error) {
      toast.error("Failed to fix discrepancies");
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Balance Reconciliation Tool
        </CardTitle>
        <CardDescription>
          Verify that Chart of Accounts balances match the sum of posted journal entry lines.
          Run this tool periodically to ensure data integrity.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <Button onClick={runReconciliation} disabled={isRunning || !selectedCompanyId}>
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Run Reconciliation
              </>
            )}
          </Button>

          {discrepancies && discrepancies.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleFixDiscrepancies}
              disabled={isFixing}
            >
              {isFixing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fixing...
                </>
              ) : (
                <>
                  <Wrench className="mr-2 h-4 w-4" />
                  Fix All Discrepancies
                </>
              )}
            </Button>
          )}

          {lastRunAt && (
            <span className="text-sm text-muted-foreground">
              Last run: {lastRunAt.toLocaleString()}
            </span>
          )}
        </div>

        {/* Results */}
        {discrepancies !== null && (
          <>
            {discrepancies.length === 0 ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>All Balanced</AlertTitle>
                <AlertDescription>
                  All Chart of Accounts balances match their calculated values from posted journal entries.
                  Your general ledger is in sync.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Discrepancies Found</AlertTitle>
                  <AlertDescription>
                    {discrepancies.length} account(s) have balances that don't match the sum of their posted journal entry lines.
                    Review the discrepancies below and click "Fix All Discrepancies" to correct them.
                  </AlertDescription>
                </Alert>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium">Account Code</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Account Name</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Current Balance</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Calculated Balance</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Difference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {discrepancies.map((d) => (
                        <tr key={d.accountId} className="border-t">
                          <td className="px-4 py-3 font-mono text-sm">{d.accountCode}</td>
                          <td className="px-4 py-3">{d.accountName}</td>
                          <td className="px-4 py-3 text-right">
                            <CurrencyDisplay amount={d.currentBalance} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <CurrencyDisplay amount={d.calculatedBalance} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Badge variant="destructive">
                              <CurrencyDisplay amount={d.difference} />
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {/* Info */}
        <div className="text-sm text-muted-foreground space-y-2 bg-muted/50 p-4 rounded-lg">
          <p className="font-medium">How it works:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Fetches all posted journal entry lines grouped by account</li>
            <li>Calculates net balance (debits - credits) for each account</li>
            <li>Applies account type logic (debit/credit normal)</li>
            <li>Compares calculated balance with stored current_balance</li>
            <li>Reports any discrepancies found</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};
