import { cn } from '@/lib/utils';
import { HealthStatus } from '@/hooks/useSystemHealthChecks';
import { Shield, Database, HardDrive, Wifi, Clock } from 'lucide-react';

interface StatusCardProps {
  checkType: string;
  checkName: string;
  status: HealthStatus;
  message: string;
  latency: number;
}

const iconMap: Record<string, React.ReactNode> = {
  auth: <Shield className="h-5 w-5" />,
  database: <Database className="h-5 w-5" />,
  storage: <HardDrive className="h-5 w-5" />,
  api: <Wifi className="h-5 w-5" />
};

const statusConfig = {
  success: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    glow: 'shadow-emerald-500/20',
    dot: 'bg-emerald-500',
    text: 'text-emerald-400'
  },
  warning: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    glow: 'shadow-amber-500/20',
    dot: 'bg-amber-500',
    text: 'text-amber-400'
  },
  error: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    glow: 'shadow-red-500/20',
    dot: 'bg-red-500',
    text: 'text-red-400'
  },
  pending: {
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    glow: 'shadow-slate-500/20',
    dot: 'bg-slate-500',
    text: 'text-slate-400'
  }
};

export function StatusCard({ checkType, checkName, status, message, latency }: StatusCardProps) {
  const config = statusConfig[status];
  const icon = iconMap[checkType] || <Wifi className="h-5 w-5" />;

  return (
    <div
      className={cn(
        'cyber-card relative overflow-hidden p-4 rounded-xl border transition-all duration-300',
        config.bg,
        config.border,
        'hover:scale-[1.02]',
        `shadow-lg ${config.glow}`
      )}
    >
      {/* Status indicator pulse */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <div className="relative">
          <div className={cn('h-3 w-3 rounded-full', config.dot)} />
          {status !== 'pending' && (
            <div
              className={cn(
                'absolute inset-0 rounded-full animate-ping opacity-40',
                config.dot
              )}
            />
          )}
        </div>
      </div>

      {/* Icon */}
      <div className={cn('mb-3', config.text)}>
        {icon}
      </div>

      {/* Content */}
      <div className="space-y-1">
        <h3 className="font-mono text-sm font-semibold uppercase tracking-wider text-cyan-300">
          {checkName}
        </h3>
        <p className={cn('text-xs font-medium', config.text)}>
          {message}
        </p>
      </div>

      {/* Latency */}
      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span className="font-mono">{latency}ms</span>
      </div>

      {/* Decorative corner */}
      <div className="absolute -bottom-1 -right-1 h-8 w-8 border-r-2 border-b-2 border-cyan-500/20 rounded-br-lg" />
    </div>
  );
}
