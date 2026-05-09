import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { History, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { HealthStatus } from '@/hooks/useSystemHealthChecks';

interface HealthLog {
  id: string;
  check_type: string;
  check_name: string;
  status: string;
  response_time_ms: number | null;
  message: string | null;
  created_at: string;
}

const statusConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  success: { icon: <CheckCircle className="h-3 w-3" />, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  warning: { icon: <AlertTriangle className="h-3 w-3" />, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  error: { icon: <XCircle className="h-3 w-3" />, color: 'text-red-400 bg-red-500/10 border-red-500/30' },
  pending: { icon: <Clock className="h-3 w-3" />, color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' }
};

export function HealthHistoryTable() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['health-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_health_logs')
        .select('*')
        .eq('is_test_data', false)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as HealthLog[];
    },
    refetchInterval: 5 * 60 * 1000 // 5 minutes (was 30s — caused server overload)
  });

  // Group logs by timestamp (within 5 second windows)
  const groupedLogs = logs.reduce((acc, log) => {
    const timestamp = new Date(log.created_at);
    const roundedTime = new Date(Math.floor(timestamp.getTime() / 5000) * 5000);
    const key = roundedTime.toISOString();
    
    if (!acc[key]) {
      acc[key] = {
        timestamp: roundedTime,
        logs: [],
        passed: 0,
        warnings: 0,
        errors: 0,
        totalLatency: 0
      };
    }
    
    acc[key].logs.push(log);
    if (log.status === 'success') acc[key].passed++;
    else if (log.status === 'warning') acc[key].warnings++;
    else if (log.status === 'error') acc[key].errors++;
    if (log.response_time_ms) acc[key].totalLatency += log.response_time_ms;
    
    return acc;
  }, {} as Record<string, { timestamp: Date; logs: HealthLog[]; passed: number; warnings: number; errors: number; totalLatency: number }>);

  const groupedArray = Object.values(groupedLogs).slice(0, 10);

  return (
    <div className="cyber-card rounded-xl border border-cyan-500/20 bg-slate-900/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/20 bg-slate-900/80">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-cyan-400" />
          <span className="font-mono text-sm font-semibold text-cyan-300 uppercase tracking-wider">
            Health Check History
          </span>
        </div>
        <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-xs">
          Last {groupedArray.length} runs
        </Badge>
      </div>

      {/* Table */}
      <ScrollArea className="h-[200px]">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">
            Loading history...
          </div>
        ) : groupedArray.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No health check history available
          </div>
        ) : (
          <div className="divide-y divide-cyan-500/10">
            {groupedArray.map((group, idx) => (
              <div key={idx} className="flex items-center justify-between px-4 py-3 hover:bg-cyan-500/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="text-xs text-muted-foreground font-mono w-24">
                    {format(group.timestamp, 'MMM dd HH:mm')}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {group.passed > 0 && (
                    <Badge className={cn('text-xs', statusConfig.success.color)}>
                      {group.passed} passed
                    </Badge>
                  )}
                  {group.warnings > 0 && (
                    <Badge className={cn('text-xs', statusConfig.warning.color)}>
                      {group.warnings} warning
                    </Badge>
                  )}
                  {group.errors > 0 && (
                    <Badge className={cn('text-xs', statusConfig.error.color)}>
                      {group.errors} failed
                    </Badge>
                  )}
                  <span className="text-xs text-cyan-600 font-mono">
                    {Math.round(group.totalLatency / group.logs.length)}ms avg
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
