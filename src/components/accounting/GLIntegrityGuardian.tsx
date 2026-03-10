/**
 * GL Integrity Guardian Dashboard
 *
 * Premium dashboard: auto-audit score, rules engine, gap detection,
 * one-click + bulk GL posting, smart suggestions with educational tips.
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Search,
  Loader2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Zap,
  ArrowRight,
  Settings2,
  ChevronDown,
  ChevronRight,
  FileText,
  BookOpen,
  AlertCircle,
  TrendingUp,
  Activity,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import {
  useGLIntegrityScanner,
  usePostGapToGL,
  useBulkPostGapsToGL,
  type ScanResult,
  type GLGapSummary,
  type AuditRule,
  type AuditScoreResult,
} from "@/hooks/useGLIntegrityScanner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const GLIntegrityGuardian = () => {
  const navigate = useNavigate();
  const scanner = useGLIntegrityScanner();
  const postGap = usePostGapToGL();
  const bulkPost = useBulkPostGapsToGL();
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [postingId, setPostingId] = useState<string | null>(null);
  const hasAutoScanned = useRef(false);

  // Auto-scan on mount (run once)
  useEffect(() => {
    if (!hasAutoScanned.current) {
      hasAutoScanned.current = true;
      handleScan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScan = async () => {
    try {
      const result = await scanner.mutateAsync();
      setScanResult(result);
      const criticalModules = result.summaries
        .filter((s) => s.severity === "critical" && s.gapCount > 0)
        .map((s) => s.module);
      setExpandedModules(new Set(criticalModules));
    } catch {
      // handled by mutation
    }
  };

  const handlePostSingle = async (gap: any) => {
    setPostingId(gap.id);
    try {
      await postGap.mutateAsync(gap);
      const result = await scanner.mutateAsync();
      setScanResult(result);
    } catch {
      // handled by mutation
    } finally {
      setPostingId(null);
    }
  };

  const handleBulkPost = async () => {
    if (!scanResult) return;
    try {
      await bulkPost.mutateAsync(scanResult.allGaps);
      const result = await scanner.mutateAsync();
      setScanResult(result);
    } catch {
      // handled by mutation
    }
  };

  const toggleModule = (module: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <FileText className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Critical</Badge>;
      case "warning":
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Warning</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Info</Badge>;
    }
  };

  const postableCount = scanResult?.allGaps.filter((g) => g.canAutoPost).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-500" />
            GL Integrity Guardian
          </h2>
          <p className="text-muted-foreground">
            AI-powered auto-audit with rules engine, gap detection & one-click GL posting
          </p>
        </div>
        <div className="flex items-center gap-2">
          {scanResult && postableCount > 0 && (
            <Button
              onClick={handleBulkPost}
              disabled={bulkPost.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {bulkPost.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Bulk Post All ({postableCount})
            </Button>
          )}
          <Button onClick={handleScan} disabled={scanner.isPending} variant={scanResult ? "outline" : "default"}>
            {scanner.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            {scanResult ? "Re-Scan" : "Scan Now"}
          </Button>
        </div>
      </div>

      {/* No Scan state */}
      {!scanResult ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center text-muted-foreground">
              <Shield className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium mb-1">GL Integrity Guardian</p>
              <p className="text-sm mb-4">
                Click "Scan Now" to run a full audit across all financial modules
              </p>
              <Button onClick={handleScan} disabled={scanner.isPending}>
                {scanner.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Start Full Audit
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="audit" className="space-y-6">
          <TabsList>
            <TabsTrigger value="audit" className="flex items-center gap-1.5">
              <Activity className="h-4 w-4" />
              Auto-Audit Score
            </TabsTrigger>
            <TabsTrigger value="gaps" className="flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" />
              Gaps ({scanResult.totalGaps})
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              Rules & Training
            </TabsTrigger>
          </TabsList>

          {/* ============ TAB 1: AUTO-AUDIT SCORE ============ */}
          <TabsContent value="audit" className="space-y-6">
            {/* Overall Score Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-1">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div
                      className={`inline-flex items-center justify-center w-28 h-28 rounded-full border-4 ${
                        scanResult.auditScore.overallScore >= 90
                          ? "border-emerald-500 text-emerald-700"
                          : scanResult.auditScore.overallScore >= 75
                          ? "border-blue-500 text-blue-700"
                          : scanResult.auditScore.overallScore >= 60
                          ? "border-amber-500 text-amber-700"
                          : "border-red-500 text-red-700"
                      }`}
                    >
                      <div>
                        <div className="text-3xl font-bold">{scanResult.auditScore.overallScore}</div>
                        <div className="text-xs font-medium opacity-60">/ 100</div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <Badge
                        className={`text-lg px-4 py-1 ${
                          scanResult.auditScore.grade === "A"
                            ? "bg-emerald-100 text-emerald-800"
                            : scanResult.auditScore.grade === "B"
                            ? "bg-blue-100 text-blue-800"
                            : scanResult.auditScore.grade === "C"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        Grade {scanResult.auditScore.grade}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(scanResult.auditScore.lastAuditTime), "dd MMM yyyy HH:mm")}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Category Scores */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Category Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(scanResult.auditScore.categoryScores).map(([key, cat]) => (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{cat.label}</span>
                        <span className={`font-semibold ${cat.score >= 80 ? "text-emerald-600" : cat.score >= 50 ? "text-amber-600" : "text-red-600"}`}>
                          {cat.score}%
                        </span>
                      </div>
                      <Progress value={cat.score} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${scanResult.totalGaps > 0 ? "bg-red-100" : "bg-emerald-100"}`}>
                      {scanResult.totalGaps > 0 ? (
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{scanResult.totalGaps}</p>
                      <p className="text-sm text-muted-foreground">Unposted Gaps</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {scanResult.totalUnpostedAmount > 0
                          ? `${(scanResult.totalUnpostedAmount / 1000).toFixed(0)}K`
                          : "0"}
                      </p>
                      <p className="text-sm text-muted-foreground">LKR Unposted</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Settings2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{scanResult.modulesAffected}</p>
                      <p className="text-sm text-muted-foreground">Modules Affected</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <Zap className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{postableCount}</p>
                      <p className="text-sm text-muted-foreground">Auto-Postable</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Audit Rules Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Audit Rules Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {scanResult.auditScore.rules.map((rule) => (
                    <RuleCard key={rule.id} rule={rule} compact />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ TAB 2: GAPS ============ */}
          <TabsContent value="gaps" className="space-y-4">
            {scanResult.totalGaps === 0 ? (
              <Card>
                <CardContent className="py-16">
                  <div className="text-center">
                    <CheckCircle className="h-16 w-16 mx-auto mb-4 text-emerald-500" />
                    <p className="text-lg font-medium text-emerald-700 mb-1">All Clear!</p>
                    <p className="text-sm text-muted-foreground">
                      All financial transactions are correctly posted to the General Ledger.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
                  <span>
                    Last scanned: {format(new Date(scanResult.lastScanTime), "dd MMM yyyy HH:mm:ss")}
                  </span>
                  <span>
                    {scanResult.allGaps.filter((g) => !g.canAutoPost).length > 0 && (
                      <button
                        onClick={() => navigate("/settings?tab=core-gl-settings")}
                        className="text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
                      >
                        ⚠ {scanResult.allGaps.filter((g) => !g.canAutoPost).length} gaps need Settings config →
                      </button>
                    )}
                  </span>
                </div>
                {scanResult.summaries.map((summary) => (
                  <ModuleGapCard
                    key={summary.module}
                    summary={summary}
                    isExpanded={expandedModules.has(summary.module)}
                    onToggle={() => toggleModule(summary.module)}
                    getSeverityIcon={getSeverityIcon}
                    getSeverityBadge={getSeverityBadge}
                    onPostSingle={handlePostSingle}
                    postingId={postingId}
                    onNavigateConfig={() => navigate("/settings?tab=core-gl-settings")}
                  />
                ))}
              </>
            )}
          </TabsContent>

          {/* ============ TAB 3: RULES & TRAINING ============ */}
          <TabsContent value="rules" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Accounting Rules & Auto-Training Guide
                </CardTitle>
                <CardDescription>
                  Each rule below checks a critical aspect of your financial system. Expand any rule to learn why it matters and how to fix issues.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {scanResult.auditScore.rules.map((rule) => (
                  <RuleCard key={rule.id} rule={rule} />
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

// ============ Rule Card Component ============

const RuleCard = ({ rule, compact = false }: { rule: AuditRule; compact?: boolean }) => {
  const [expanded, setExpanded] = useState(false);

  const statusIcon =
    rule.status === "pass" ? (
      <CheckCircle className="h-4 w-4 text-emerald-500" />
    ) : rule.status === "fail" ? (
      <XCircle className="h-4 w-4 text-red-500" />
    ) : rule.status === "warning" ? (
      <AlertTriangle className="h-4 w-4 text-amber-500" />
    ) : (
      <FileText className="h-4 w-4 text-gray-400" />
    );

  const statusBg =
    rule.status === "pass"
      ? "border-emerald-200 bg-emerald-50/50"
      : rule.status === "fail"
      ? "border-red-200 bg-red-50/50"
      : rule.status === "warning"
      ? "border-amber-200 bg-amber-50/50"
      : "border-gray-200";

  if (compact) {
    return (
      <div className={`flex items-center gap-2 p-3 rounded-lg border ${statusBg}`}>
        {statusIcon}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{rule.name}</p>
          <p className="text-xs text-muted-foreground truncate">{rule.details}</p>
        </div>
        <span className={`text-sm font-semibold ${rule.score >= 80 ? "text-emerald-600" : rule.score >= 50 ? "text-amber-600" : "text-red-600"}`}>
          {rule.score}
        </span>
      </div>
    );
  }

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className={`rounded-lg border ${statusBg} overflow-hidden`}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              {statusIcon}
              <div>
                <p className="font-medium text-sm">{rule.name}</p>
                <p className="text-xs text-muted-foreground">{rule.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs capitalize">{rule.category}</Badge>
              <span className={`text-sm font-bold ${rule.score >= 80 ? "text-emerald-600" : rule.score >= 50 ? "text-amber-600" : "text-red-600"}`}>
                {rule.score}/100
              </span>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3 border-t pt-3">
            {/* Details */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">STATUS</p>
              <p className="text-sm">{rule.details}</p>
            </div>

            {/* Recommendation */}
            {rule.recommendation && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-xs font-semibold text-blue-700 mb-1">💡 RECOMMENDATION</p>
                <p className="text-sm text-blue-900">{rule.recommendation}</p>
              </div>
            )}

            {/* Learn More (Training) */}
            {rule.learnMore && (
              <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                <p className="text-xs font-semibold text-purple-700 mb-1">📚 WHY THIS MATTERS</p>
                <p className="text-sm text-purple-900">{rule.learnMore}</p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

// ============ Module Gap Card ============

interface ModuleGapCardProps {
  summary: GLGapSummary;
  isExpanded: boolean;
  onToggle: () => void;
  getSeverityIcon: (severity: string) => React.ReactNode;
  getSeverityBadge: (severity: string) => React.ReactNode;
  onPostSingle: (gap: any) => void;
  postingId: string | null;
  onNavigateConfig: () => void;
}

const ModuleGapCard = ({
  summary,
  isExpanded,
  onToggle,
  getSeverityIcon,
  getSeverityBadge,
  onPostSingle,
  postingId,
  onNavigateConfig,
}: ModuleGapCardProps) => {
  return (
    <Card className="overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                {getSeverityIcon(summary.severity)}
                <div>
                  <CardTitle className="text-base">{summary.moduleLabel}</CardTitle>
                  <CardDescription>
                    {summary.gapCount} unposted · LKR {summary.totalAmount.toLocaleString()}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getSeverityBadge(summary.severity)}
                <Badge variant="outline">{summary.gapCount}</Badge>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Suggested Entry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.gaps.slice(0, 25).map((gap) => (
                  <TableRow key={gap.id}>
                    <TableCell className="font-mono text-xs">{gap.recordRef}</TableCell>
                    <TableCell className="text-sm">
                      {gap.recordDate ? format(new Date(gap.recordDate), "dd MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium">
                      LKR {gap.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-emerald-700 font-medium">DR</span>{" "}
                        <span>{gap.suggestedDebit}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground mx-1" />
                        <span className="text-red-700 font-medium">CR</span>{" "}
                        <span>{gap.suggestedCredit}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {gap.canAutoPost ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-xs">Ready</Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-xs">Needs Config</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {gap.canAutoPost ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onPostSingle(gap)}
                          disabled={postingId === gap.id}
                          className="h-7 text-xs"
                        >
                          {postingId === gap.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Zap className="h-3 w-3 mr-1" />
                              Post
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-amber-600 hover:text-amber-700"
                          onClick={onNavigateConfig}
                        >
                          <Settings2 className="h-3 w-3 mr-1" />
                          Config
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {summary.gaps.length > 25 && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Showing 25 of {summary.gaps.length} gaps
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default GLIntegrityGuardian;
