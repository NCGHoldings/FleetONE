/**
 * Finance Automation Dashboard
 * 
 * Command-center view showing:
 * - Module automation health (green/yellow/red status)
 * - Overdue recurring entries with "Run All" action
 * - GL balance health check
 * - Recent auto-posted journal entries
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  RefreshCw,
  PlayCircle,
  CheckCircle,
  Clock,
  Activity,
  Wrench,
  Loader2,
  ArrowRight,
  Ban,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import {
  useOverdueRecurringEntries,
  useRunAllOverdueEntries,
  useGLBalanceHealthCheck,
  useFixBalanceDiscrepancies,
  useRecentAutoPostEntries,
  useModuleAutomationHealth,
  type GLBalanceCheck,
} from "@/hooks/useFinanceAutomationEngine";

const FinanceAutomationDashboard = () => {
  const { data: overdueEntries = [], isLoading: loadingOverdue } = useOverdueRecurringEntries();
  const runAllOverdue = useRunAllOverdueEntries();
  const glHealthCheck = useGLBalanceHealthCheck();
  const fixDiscrepancies = useFixBalanceDiscrepancies();
  const { data: recentPosts = [], isLoading: loadingRecent } = useRecentAutoPostEntries(15);
  const { data: moduleHealth = [], isLoading: loadingHealth } = useModuleAutomationHealth();
  const [balanceCheck, setBalanceCheck] = useState<GLBalanceCheck | null>(null);

  const healthyCount = moduleHealth.filter((m) => m.status === "healthy").length;
  const warningCount = moduleHealth.filter((m) => m.status === "warning").length;
  const disabledCount = moduleHealth.filter((m) => m.status === "disabled").length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "disabled":
        return <Ban className="h-4 w-4 text-gray-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Active</Badge>;
      case "warning":
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Manual</Badge>;
      case "error":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Error</Badge>;
      case "disabled":
        return <Badge variant="outline" className="text-gray-400">Not Set</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getSourceBadge = (source: string) => {
    const colors: Record<string, string> = {
      Recurring: "bg-purple-100 text-purple-800",
      Depreciation: "bg-indigo-100 text-indigo-800",
      "Fund Transfer": "bg-blue-100 text-blue-800",
      Payroll: "bg-teal-100 text-teal-800",
      Commission: "bg-cyan-100 text-cyan-800",
      Maintenance: "bg-orange-100 text-orange-800",
      Insurance: "bg-rose-100 text-rose-800",
      Expense: "bg-amber-100 text-amber-800",
      "Route Permit": "bg-lime-100 text-lime-800",
      "Asset Disposal": "bg-red-100 text-red-800",
      "AR/AP": "bg-green-100 text-green-800",
      Receipt: "bg-emerald-100 text-emerald-800",
      Payment: "bg-sky-100 text-sky-800",
      Manual: "bg-gray-100 text-gray-700",
    };
    return (
      <Badge className={`${colors[source] || colors.Manual} hover:opacity-80`}>
        {source}
      </Badge>
    );
  };

  const handleRunHealthCheck = async () => {
    try {
      const result = await glHealthCheck.mutateAsync();
      setBalanceCheck(result);
    } catch {
      // handled by mutation
    }
  };

  const handleFixAll = async () => {
    if (!balanceCheck || balanceCheck.discrepancies.length === 0) return;
    try {
      await fixDiscrepancies.mutateAsync(
        balanceCheck.discrepancies.map((d) => ({
          accountId: d.accountId,
          calculatedBalance: d.calculatedBalance,
        }))
      );
      setBalanceCheck(null);
    } catch {
      // handled by mutation
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-500" />
            Finance Automation Engine
          </h2>
          <p className="text-muted-foreground">
            Real-time status of all automated GL posting modules
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{healthyCount}</p>
                <p className="text-sm text-muted-foreground">Auto-Posting</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{warningCount}</p>
                <p className="text-sm text-muted-foreground">Manual Only</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Ban className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{disabledCount}</p>
                <p className="text-sm text-muted-foreground">Not Configured</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Clock className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overdueEntries.length}</p>
                <p className="text-sm text-muted-foreground">Overdue Entries</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Module Health + Overdue Entries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module Automation Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5" />
              Module Automation Status
            </CardTitle>
            <CardDescription>
              Auto-posting health across all finance modules
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHealth ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {moduleHealth.map((mod) => (
                  <div
                    key={mod.module}
                    className="flex items-center justify-between py-2 px-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(mod.status)}
                      <div>
                        <p className="font-medium text-sm">{mod.label}</p>
                        <p className="text-xs text-muted-foreground">{mod.message}</p>
                      </div>
                    </div>
                    {getStatusBadge(mod.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue Recurring Entries */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <RefreshCw className="h-5 w-5" />
                  Overdue Recurring Entries
                </CardTitle>
                <CardDescription>
                  Entries past their next run date
                </CardDescription>
              </div>
              {overdueEntries.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => runAllOverdue.mutate(overdueEntries)}
                  disabled={runAllOverdue.isPending}
                >
                  {runAllOverdue.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <PlayCircle className="h-4 w-4 mr-2" />
                  )}
                  Run All ({overdueEntries.length})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingOverdue ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : overdueEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-emerald-400 opacity-50" />
                <p className="font-medium">All caught up!</p>
                <p className="text-sm">No overdue recurring entries</p>
              </div>
            ) : (
              <div className="space-y-2">
                {overdueEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg border border-red-100 bg-red-50/50"
                  >
                    <div>
                      <p className="font-medium text-sm">{entry.entry_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.frequency} · LKR{" "}
                        {entry.amount.toLocaleString()} ·{" "}
                        <span className="text-red-600 font-medium">
                          {entry.days_overdue}d overdue
                        </span>
                      </p>
                    </div>
                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                      {entry.next_run_date}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* GL Balance Health Check */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wrench className="h-5 w-5" />
                GL Balance Integrity Check
              </CardTitle>
              <CardDescription>
                Verify COA balances match posted journal entries
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {balanceCheck && balanceCheck.discrepancyCount > 0 && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleFixAll}
                  disabled={fixDiscrepancies.isPending}
                >
                  {fixDiscrepancies.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Wrench className="h-4 w-4 mr-2" />
                  )}
                  Fix All ({balanceCheck.discrepancyCount})
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleRunHealthCheck}
                disabled={glHealthCheck.isPending}
              >
                {glHealthCheck.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4 mr-2" />
                )}
                Run Check
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {balanceCheck === null ? (
            <div className="text-center py-6 text-muted-foreground">
              <ShieldCheck className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Click "Run Check" to validate GL balances</p>
            </div>
          ) : balanceCheck.discrepancyCount === 0 ? (
            <div className="text-center py-6">
              <CheckCircle className="h-10 w-10 mx-auto mb-2 text-emerald-500" />
              <p className="font-medium text-emerald-700">All GL Balances Verified</p>
              <p className="text-sm text-muted-foreground">
                No discrepancies found
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-700 font-medium">
                  {balanceCheck.discrepancyCount} balance discrepancies found
                </span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Current Balance</TableHead>
                    <TableHead className="text-right">Calculated Balance</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balanceCheck.discrepancies.slice(0, 10).map((d) => (
                    <TableRow key={d.accountId}>
                      <TableCell>
                        <span className="font-mono text-xs">{d.accountCode}</span>{" "}
                        <span className="text-sm">{d.accountName}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {d.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {d.calculatedBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-red-600 font-medium">
                        {d.difference.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Auto-Posted Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ArrowRight className="h-5 w-5" />
            Recent GL Postings
          </CardTitle>
          <CardDescription>
            Latest journal entries created by automation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingRecent ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentPosts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No recent journal entries</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entry #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPosts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="font-mono text-xs">{post.entry_number}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(post.entry_date), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-sm max-w-[300px] truncate">
                      {post.description}
                    </TableCell>
                    <TableCell>{getSourceBadge(post.source)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {post.total_debit?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceAutomationDashboard;
