import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, X, ExternalLink, MapPin } from 'lucide-react';
import { BusinessFlowResult } from '@/hooks/useBusinessFlowTests';
import { useNavigate } from 'react-router-dom';

interface CriticalAlertBannerProps {
  issues: BusinessFlowResult[];
  onRecheck: () => void;
  isRunning: boolean;
  onDismiss?: () => void;
}

export const CriticalAlertBanner: React.FC<CriticalAlertBannerProps> = ({
  issues,
  onRecheck,
  isRunning,
  onDismiss
}) => {
  const navigate = useNavigate();

  if (issues.length === 0) return null;

  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-4">
        <div className="p-2 rounded-lg bg-red-500/20 shrink-0">
          <AlertTriangle className="h-6 w-6 text-red-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-red-400">
            {issues.length} Feature{issues.length > 1 ? 's' : ''} Not Working
          </h3>
          <p className="text-sm text-red-400/80">These issues may affect customers and staff</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
          onClick={onRecheck}
          disabled={isRunning}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
          Recheck
        </Button>
        {onDismiss && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400/60" onClick={onDismiss}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {issues.map((issue, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg border border-red-500/20">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-red-300">{issue.category}</span>
                <span className="text-red-400/50">›</span>
                <span className="text-red-200">{issue.name}</span>
              </div>
              {issue.location && (
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3 text-slate-500" />
                  <span className="text-xs text-slate-400 truncate">{issue.location.breadcrumb}</span>
                </div>
              )}
              <p className="text-xs text-red-400/70 mt-1">{issue.friendlyError || issue.message}</p>
            </div>
            {issue.location?.path && (
              <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/20 shrink-0 ml-2" onClick={() => navigate(issue.location.path)}>
                <ExternalLink className="h-4 w-4 mr-1" />
                Go to Page
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
