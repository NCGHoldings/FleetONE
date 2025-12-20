import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Shield, RefreshCw, Clock, Zap } from 'lucide-react';
import { useSystemHealthChecks } from '@/hooks/useSystemHealthChecks';
import { StatusCard } from '@/components/system-health/StatusCard';
import { LiveConsole } from '@/components/system-health/LiveConsole';
import { LatencySparkline } from '@/components/system-health/LatencySparkline';
import { HealthHistoryTable } from '@/components/system-health/HealthHistoryTable';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function SystemHealthDashboard() {
  const {
    results,
    consoleLogs,
    isRunning,
    lastRunTime,
    autoRefreshEnabled,
    runFullHealthCheck,
    clearLogs,
    toggleAutoRefresh
  } = useSystemHealthChecks();

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

            {/* Run check button */}
            <Button
              onClick={runFullHealthCheck}
              disabled={isRunning}
              className="bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-mono uppercase tracking-wider shadow-lg shadow-cyan-500/20"
            >
              {isRunning ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              {isRunning ? 'Running...' : 'Run Full Check'}
            </Button>
          </div>
        </div>

        {/* Status Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {results.length > 0 ? (
            results.map(result => (
              <StatusCard
                key={result.id}
                checkType={result.checkType}
                checkName={result.checkName}
                status={result.status}
                message={result.message}
                latency={result.latency}
              />
            ))
          ) : (
            // Placeholder cards while loading
            ['Auth', 'Storage', 'DB Latency', 'DB Write'].map((name, idx) => (
              <StatusCard
                key={idx}
                checkType={['auth', 'storage', 'database', 'database'][idx]}
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
          {/* Latency Chart */}
          <LatencySparkline />

          {/* Live Console */}
          <LiveConsole logs={consoleLogs} onClear={clearLogs} />
        </div>

        {/* Health History Table */}
        <HealthHistoryTable />

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground font-mono pt-4 border-t border-cyan-500/10">
          <span className="text-cyan-600">SYNTHETIC MONITORING</span> • Auto-testing auth, storage, database connectivity
        </div>
      </div>
    </div>
  );
}
