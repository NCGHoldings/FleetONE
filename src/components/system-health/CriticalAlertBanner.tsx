import React from 'react';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BusinessFlowResult } from '@/hooks/useBusinessFlowTests';

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
  if (issues.length === 0) return null;

  return (
    <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-red-400 font-bold text-lg">
              {issues.length} Critical Issue{issues.length > 1 ? 's' : ''} Detected
            </h3>
            <p className="text-red-300/80 text-sm mt-1 mb-3">
              The following business flows are broken and need immediate attention:
            </p>
            <ul className="space-y-2">
              {issues.map((issue) => (
                <li key={issue.id} className="flex items-start gap-2 text-sm">
                  <span className="text-red-400">•</span>
                  <div>
                    <span className="text-red-300 font-medium">
                      {issue.category} → {issue.name}:
                    </span>
                    <span className="text-red-300/70 ml-1">{issue.message}</span>
                    {issue.errorDetails && (
                      <div className="text-red-400/60 text-xs mt-0.5 font-mono">
                        Error: {issue.errorDetails}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onRecheck}
            disabled={isRunning}
            className="border-red-500/50 text-red-400 hover:bg-red-500/20"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isRunning ? 'animate-spin' : ''}`} />
            Recheck
          </Button>
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDismiss}
              className="text-red-400/60 hover:text-red-400 hover:bg-red-500/20"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
