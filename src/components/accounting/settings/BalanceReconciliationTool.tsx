/**
 * Balance Reconciliation Tool
 * Verifies COA balances against posted journal entry lines
 * and allows fixing any discrepancies found.
 * Includes Orphaned JE Scanner for cleanup.
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Loader2, CheckCircle2, AlertTriangle, RefreshCw, Wrench, Search, Trash2 } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import { recalculateCOABalances, fixBalanceDiscrepancies, reverseAndDeleteJournalEntry } from "@/lib/gl-posting-utils";
import { supabase } from "@/integrations/supabase/client";
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

interface OrphanedJE {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  status: string;
  business_unit_code: string | null;
  total_debit: number;
}

export const BalanceReconciliationTool = () => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const [isRunning, setIsRunning] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[] | null>(null);
  const [lastRunAt, setLastRunAt] = useState<Date | null>(null);

  // Orphan scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [orphanedJEs, setOrphanedJEs] = useState<OrphanedJE[] | null>(null);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);

  const runReconciliation = async () => {
    const effectiveCompanyId = getEffectiveCompanyId() || selectedCompanyId;
    if (!effectiveCompanyId) {
      toast.error("Please select a company first");
      return;
    }

    setIsRunning(true);
    try {
      const result = await recalculateCOABalances(effectiveCompanyId);
      
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

  const scanOrphanedJEs = async () => {
    if (!selectedCompanyId) {
      toast.error("Please select a company first");
      return;
    }

    setIsScanning(true);
    try {
      // Get all JEs for this company
      const { data: allJEs, error: jeError } = await supabase
        .from("journal_entries")
        .select("id, entry_number, entry_date, description, status, business_unit_code")
        .eq("company_id", selectedCompanyId)
        .in("status", ["posted", "reversed"]);

      if (jeError) throw jeError;
      if (!allJEs || allJEs.length === 0) {
        setOrphanedJEs([]);
        toast.info("No journal entries found");
        setIsScanning(false);
        return;
      }

      const jeIds = allJEs.map((je) => je.id);

      // Check which JEs are referenced by source documents
      const [arInv, arRec, apInv, apPay] = await Promise.all([
        supabase.from("ar_invoices").select("journal_entry_id").in("journal_entry_id", jeIds),
        supabase.from("ar_receipts").select("journal_entry_id").in("journal_entry_id", jeIds),
        supabase.from("ap_invoices").select("journal_entry_id").in("journal_entry_id", jeIds),
        supabase.from("ap_payments").select("journal_entry_id").in("journal_entry_id", jeIds),
      ]);

      const linkedIds = new Set<string>();
      [arInv.data, arRec.data, apInv.data, apPay.data].forEach((rows) => {
        rows?.forEach((r) => {
          if (r.journal_entry_id) linkedIds.add(r.journal_entry_id);
        });
      });

      // Also check reversed_entry_id links (reversals referencing originals that are linked)
      const orphanCandidates = allJEs.filter((je) => !linkedIds.has(je.id));

      // For each candidate, check if it's a reversal of a linked entry (via reversed_entry_id)
      // If so, it's not truly orphaned
      const { data: reversalLinks } = await supabase
        .from("journal_entries")
        .select("id, reversed_entry_id")
        .in("id", orphanCandidates.map((j) => j.id))
        .not("reversed_entry_id", "is", null);

      const reversalTargetIds = new Set(reversalLinks?.map((r) => r.reversed_entry_id).filter(Boolean) || []);
      // If a reversal's target is linked, then the reversal is not orphaned
      const trueOrphans = orphanCandidates.filter((je) => {
        const link = reversalLinks?.find((r) => r.id === je.id);
        if (link?.reversed_entry_id && linkedIds.has(link.reversed_entry_id)) return false;
        return true;
      });

      // Get total debits for display
      const orphanIds = trueOrphans.map((o) => o.id);
      const { data: lineTotals } = orphanIds.length > 0
        ? await supabase
            .from("journal_entry_lines")
            .select("journal_entry_id, debit")
            .in("journal_entry_id", orphanIds)
        : { data: [] };

      const debitTotals: Record<string, number> = {};
      lineTotals?.forEach((l) => {
        debitTotals[l.journal_entry_id] = (debitTotals[l.journal_entry_id] || 0) + (l.debit || 0);
      });

      const result: OrphanedJE[] = trueOrphans.map((je) => ({
        ...je,
        total_debit: debitTotals[je.id] || 0,
      }));

      setOrphanedJEs(result);
      if (result.length === 0) {
        toast.success("No orphaned journal entries found!");
      } else {
        toast.warning(`Found ${result.length} orphaned journal entry(ies)`);
      }
    } catch (error) {
      console.error("Orphan scan error:", error);
      toast.error("Failed to scan for orphaned JEs");
    } finally {
      setIsScanning(false);
    }
  };

  const handleCleanupOrphans = async () => {
    if (!orphanedJEs || orphanedJEs.length === 0) return;
    setShowCleanupConfirm(false);
    setIsCleaning(true);

    let deleted = 0;
    let failed = 0;

    for (const je of orphanedJEs) {
      try {
        const result = await reverseAndDeleteJournalEntry(je.id);
        if (result.success) {
          deleted++;
        } else {
          failed++;
          console.error(`Failed to delete ${je.entry_number}:`, result.error);
        }
      } catch (error) {
        failed++;
        console.error(`Error deleting ${je.entry_number}:`, error);
      }
    }

    if (deleted > 0) {
      toast.success(`Deleted ${deleted} orphaned JE(s)${failed > 0 ? `, ${failed} failed` : ""}`);
      setOrphanedJEs(null);
      // Auto-run reconciliation to fix COA balances
      await runReconciliation();
    } else {
      toast.error("Failed to delete any orphaned JEs");
    }

    setIsCleaning(false);
  };

  return (
    <div className="space-y-6">
    {/* Balance Reconciliation */}
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

    {/* Orphaned JE Scanner */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Orphaned Journal Entry Scanner
        </CardTitle>
        <CardDescription>
          Find journal entries with no linked source document (AR/AP invoice, receipt, or payment).
          These are typically leftover from deleted test transactions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Button onClick={scanOrphanedJEs} disabled={isScanning || !selectedCompanyId}>
            {isScanning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Scan for Orphaned JEs
              </>
            )}
          </Button>

          {orphanedJEs && orphanedJEs.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setShowCleanupConfirm(true)}
              disabled={isCleaning}
            >
              {isCleaning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cleaning...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete All Orphaned JEs ({orphanedJEs.length})
                </>
              )}
            </Button>
          )}
        </div>

        {orphanedJEs !== null && (
          <>
            {orphanedJEs.length === 0 ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>No Orphans Found</AlertTitle>
                <AlertDescription>
                  All journal entries have valid source document links. No cleanup needed.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{orphanedJEs.length} Orphaned JE(s) Found</AlertTitle>
                  <AlertDescription>
                    These journal entries have no linked AR/AP invoice, receipt, or payment.
                    Deleting them will reverse their COA balance impact and remove them from the GL.
                  </AlertDescription>
                </Alert>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium">Entry #</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">BU</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Total Debit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orphanedJEs.map((je) => (
                        <tr key={je.id} className="border-t">
                          <td className="px-4 py-3 font-mono text-sm">{je.entry_number}</td>
                          <td className="px-4 py-3 text-sm">{je.entry_date}</td>
                          <td className="px-4 py-3">
                            {je.business_unit_code && (
                              <Badge variant="outline" className="text-xs">{je.business_unit_code}</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm max-w-[250px] truncate">{je.description}</td>
                          <td className="px-4 py-3">
                            <Badge variant={je.status === "posted" ? "default" : "secondary"}>
                              {je.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <CurrencyDisplay amount={je.total_debit} />
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
      </CardContent>
    </Card>

    {/* Cleanup Confirmation Dialog */}
    <AlertDialog open={showCleanupConfirm} onOpenChange={setShowCleanupConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete All Orphaned Journal Entries?</AlertDialogTitle>
          <AlertDialogDescription>
            This will reverse COA balance impacts and permanently delete {orphanedJEs?.length || 0} orphaned
            journal entry(ies) and their lines. A balance reconciliation will run automatically after cleanup.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCleanupOrphans}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete All Orphans
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </div>
  );
};
