import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Trash2, Terminal } from 'lucide-react';
import { ConsoleLog, HealthStatus } from '@/hooks/useSystemHealthChecks';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface LiveConsoleProps {
  logs: ConsoleLog[];
  onClear: () => void;
}

const statusIcons: Record<HealthStatus, string> = {
  success: '✅',
  warning: '⚠️',
  error: '❌',
  pending: '⏳'
};

const statusColors: Record<HealthStatus, string> = {
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  error: 'text-red-400',
  pending: 'text-slate-400'
};

export function LiveConsole({ logs, onClear }: LiveConsoleProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs]);

  return (
    <div className="cyber-console rounded-xl border border-cyan-500/20 bg-black/90 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/20 bg-slate-900/50">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-cyan-400" />
          <span className="font-mono text-sm font-semibold text-cyan-300 uppercase tracking-wider">
            Live Console
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Clear
        </Button>
      </div>

      {/* Console output */}
      <ScrollArea className="h-64" ref={scrollRef}>
        <div className="p-4 space-y-1.5 font-mono text-xs">
          {logs.length === 0 ? (
            <div className="text-slate-500 italic">
              Waiting for health check results...
            </div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                <span className="text-slate-500 shrink-0">
                  {format(log.timestamp, 'HH:mm:ss')}
                </span>
                <span className="shrink-0">{statusIcons[log.status]}</span>
                <span className={cn('flex-1', statusColors[log.status])}>
                  {log.message}
                </span>
                {log.latency !== undefined && (
                  <span className="text-cyan-600 shrink-0">
                    ({log.latency}ms)
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer decoration */}
      <div className="h-1 bg-gradient-to-r from-cyan-500/50 via-emerald-500/50 to-cyan-500/50" />
    </div>
  );
}
