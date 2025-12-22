import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, RefreshCw, Clock, Zap, AlertTriangle, Activity, Workflow } from 'lucide-react';
import { useSystemHealthChecks } from '@/hooks/useSystemHealthChecks';
import { useBusinessFlowTests } from '@/hooks/useBusinessFlowTests';
import { StatusCard } from '@/components/system-health/StatusCard';
import { LiveConsole } from '@/components/system-health/LiveConsole';
import { LatencySparkline } from '@/components/system-health/LatencySparkline';
import { HealthHistoryTable } from '@/components/system-health/HealthHistoryTable';
import { BusinessFlowCard } from '@/components/system-health/BusinessFlowCard';
import { CriticalAlertBanner } from '@/components/system-health/CriticalAlertBanner';
import { HealthSummary } from '@/components/system-health/HealthSummary';
import { IssueCard } from '@/components/system-health/IssueCard';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function SystemHealthDashboard() {
  const {
    results,
    consoleLogs,
    isRunning,
    lastRunTime,
    autoRefreshEnabled,
    criticalErrorCount,
    runFullHealthCheck,
    clearLogs,
    toggleAutoRefresh
  } = useSystemHealthChecks();

  // Auto-run tests on mount
  const {
    results: flowResults,
    isRunning: isFlowRunning,
    lastRunTime: flowLastRunTime,
    runAllTests: runFlowTests,
    runCategoryTests,
    criticalIssues
  } = useBusinessFlowTests(true);

  const [activeTab, setActiveTab] = useState('infrastructure');
  
  const previousErrorCount = useRef(0);

  // Show toast alerts for critical errors
  useEffect(() => {
    if (results.length === 0) return;
    
    const currentErrors = results.filter(r => r.status === 'error');
    
    // Only alert on new errors (not on initial load)
    if (currentErrors.length > 0 && previousErrorCount.current !== currentErrors.length) {
      if (previousErrorCount.current > 0 || results.length > currentErrors.length) {
        // Show individual error toasts
        currentErrors.forEach(error => {
          toast.error(`${error.checkName} Failed`, {
            description: error.errorDetails || error.message,
            duration: 10000,
            action: {
              label: 'Details',
              onClick: () => {
                // Scroll to the status card
                const element = document.getElementById(`status-card-${error.id}`);
                element?.scrollIntoView({ behavior: 'smooth' });
              }
            }
          });
        });
      }
    }
    
    previousErrorCount.current = currentErrors.length;
  }, [results]);

  // Calculate overall status
  const overallStatus = results.length === 0 
    ? 'pending' 
    : results.some(r => r.status === 'error') 
      ? 'error' 
      : results.some(r => r.status === 'warning') 
        ? 'warning' 
        : 'success';

  const statusText = {
    success: 'All Systems Operational',
    warning: 'Some Systems Degraded',
    error: 'Critical Issues Detected',
    pending: 'Initializing...'
  };

  return (
    <div className="min-h-full bg-slate-950 text-foreground rounded-lg overflow-hidden">
      {/* Cyber grid background */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(6, 182, 212, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="relative z-10 p-6 max-w-7xl mx-auto space-y-6">
        {/* Health Summary */}
        <HealthSummary
          flowResults={flowResults}
          infrastructureErrors={criticalErrorCount}
          infrastructureWarnings={results.filter(r => r.status === 'warning').length}
        />

        {/* Business Flow Critical Alert Banner */}
        <CriticalAlertBanner
          issues={criticalIssues}
          onRecheck={runFlowTests}
          isRunning={isFlowRunning}
        />

        {/* Infrastructure Critical Alert Banner */}
        {criticalErrorCount > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-red-500/20">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-400">
                {criticalErrorCount} Infrastructure Issue{criticalErrorCount > 1 ? 's' : ''} Detected
              </h3>
              <p className="text-sm text-red-400/80">
                {results.filter(r => r.status === 'error').map(r => r.checkName).join(', ')} - Immediate attention required
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              onClick={runFullHealthCheck}
              disabled={isRunning}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isRunning && "animate-spin")} />
              Recheck
            </Button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30">
              <Shield className="h-8 w-8 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground">
                SYSTEM HEALTH MONITOR
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <Badge 
                  className={cn(
                    'font-mono text-xs uppercase tracking-wider',
                    overallStatus === 'success' && 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
                    overallStatus === 'warning' && 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                    overallStatus === 'error' && 'bg-red-500/20 text-red-400 border-red-500/30',
                    overallStatus === 'pending' && 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                  )}
                >
                  <span className={cn(
                    'inline-block w-2 h-2 rounded-full mr-2',
                    overallStatus === 'success' && 'bg-emerald-500',
                    overallStatus === 'warning' && 'bg-amber-500',
                    overallStatus === 'error' && 'bg-red-500',
                    overallStatus === 'pending' && 'bg-slate-500'
                  )} />
                  {statusText[overallStatus]}
                </Badge>
                {lastRunTime && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last check: {format(lastRunTime, 'HH:mm:ss')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Auto-refresh toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id="auto-refresh"
                checked={autoRefreshEnabled}
                onCheckedChange={toggleAutoRefresh}
              />
              <Label htmlFor="auto-refresh" className="text-sm text-muted-foreground">
                Auto-refresh (5min)
              </Label>
            </div>

            {/* Run All Tests button */}
            <Button
              onClick={() => {
                runFullHealthCheck();
                runFlowTests();
              }}
              disabled={isRunning || isFlowRunning}
              className="bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-mono uppercase tracking-wider shadow-lg shadow-cyan-500/20"
            >
              {isRunning || isFlowRunning ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              {isRunning || isFlowRunning ? 'Running...' : 'Run All Tests'}
            </Button>
          </div>
        </div>

        {/* Tabs for Infrastructure vs Business Flows */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-slate-900/50 border border-slate-700/50 p-1">
            <TabsTrigger 
              value="infrastructure" 
              className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
            >
              <Activity className="h-4 w-4 mr-2" />
              Infrastructure ({results.length})
            </TabsTrigger>
            <TabsTrigger 
              value="business-flows"
              className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"
            >
              <Workflow className="h-4 w-4 mr-2" />
              Business Flows ({flowResults.length})
              {criticalIssues.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                  {criticalIssues.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Infrastructure Tab */}
          <TabsContent value="infrastructure" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.length > 0 ? (
                results.map(result => (
                  <StatusCard
                    key={result.id}
                    id={result.id}
                    checkType={result.checkType}
                    checkName={result.checkName}
                    status={result.status}
                    message={result.message}
                    latency={result.latency}
                    errorDetails={result.errorDetails}
                  />
                ))
              ) : (
                ['Auth', 'Storage', 'DB Latency', 'DB Write', 'RLS Policies', 'Realtime'].map((name, idx) => (
                  <StatusCard
                    key={idx}
                    id={`placeholder-${idx}`}
                    checkType={['auth', 'storage', 'database', 'database', 'database', 'api'][idx]}
                    checkName={name}
                    status="pending"
                    message="Waiting..."
                    latency={0}
                  />
                ))
              )}
            </div>

            {/* Charts and Console Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LatencySparkline />
              <LiveConsole logs={consoleLogs} onClear={clearLogs} />
            </div>

            {/* Health History Table */}
            <HealthHistoryTable />
          </TabsContent>

          {/* Business Flows Tab */}
          <TabsContent value="business-flows" className="mt-6 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Business Flow Tests</h2>
                <p className="text-sm text-slate-400">
                  Automated tests for critical business operations
                  {flowLastRunTime && (
                    <span className="ml-2">
                      • Last run: {format(flowLastRunTime, 'HH:mm:ss')}
                    </span>
                  )}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={runFlowTests}
                disabled={isFlowRunning}
                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isFlowRunning && "animate-spin")} />
                Run All Flow Tests
              </Button>
            </div>

            {flowResults.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/30 rounded-lg border border-slate-700/30">
                <Workflow className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-300">No Tests Run Yet</h3>
                <p className="text-slate-400 mb-4">Click "Run All Flow Tests" to test all business flows</p>
                <Button onClick={runFlowTests} disabled={isFlowRunning}>
                  <Zap className="h-4 w-4 mr-2" />
                  Start Testing
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Group results by category */}
                {Array.from(new Set(flowResults.map(r => r.category))).map(category => (
                  <BusinessFlowCard
                    key={category}
                    category={category}
                    results={flowResults.filter(r => r.category === category)}
                    onRetest={() => runCategoryTests(category)}
                    isRetesting={isFlowRunning}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground font-mono pt-4 border-t border-cyan-500/10">
          <span className="text-cyan-600">PROACTIVE MONITORING</span> • Testing infrastructure + business flows for Sinotruck, Special Hire, Yutong, School Bus, Fleet, Daily Trips
        </div>
      </div>
    </div>
  );
}
