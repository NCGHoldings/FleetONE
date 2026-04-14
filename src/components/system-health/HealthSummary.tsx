import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  ExternalLink,
  ArrowRight
} from 'lucide-react';
import { BusinessFlowResult } from '@/hooks/useBusinessFlowTests';
import { useNavigate } from 'react-router-dom';

interface HealthSummaryProps {
  flowResults: BusinessFlowResult[];
  infrastructureErrors: number;
  infrastructureWarnings: number;
  onViewIssue?: (issue: BusinessFlowResult) => void;
}

export const HealthSummary: React.FC<HealthSummaryProps> = ({
  flowResults,
  infrastructureErrors,
  infrastructureWarnings,
  onViewIssue
}) => {
  const navigate = useNavigate();

  const workingCount = flowResults.filter(r => r.status === 'success').length;
  const warningCount = flowResults.filter(r => r.status === 'warning').length + infrastructureWarnings;
  const brokenCount = flowResults.filter(r => r.status === 'error').length + infrastructureErrors;

  const criticalIssues = flowResults.filter(r => r.status === 'error');

  // Overall status
  const overallStatus = brokenCount > 0 
    ? 'critical' 
    : warningCount > 0 
      ? 'degraded' 
      : workingCount > 0 
        ? 'healthy' 
        : 'unknown';

  const statusConfig = {
    critical: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      title: 'System Issues Detected',
      titleColor: 'text-red-400'
    },
    degraded: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      title: 'Some Features Degraded',
      titleColor: 'text-amber-400'
    },
    healthy: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      title: 'All Systems Operational',
      titleColor: 'text-emerald-400'
    },
    unknown: {
      bg: 'bg-slate-500/10',
      border: 'border-slate-500/30',
      title: 'No Tests Run Yet',
      titleColor: 'text-slate-400'
    }
  };

  const config = statusConfig[overallStatus];

  return (
    <Card className={`${config.bg} ${config.border}`}>
      <CardContent className="p-6">
        {/* Status Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`text-xl font-bold ${config.titleColor}`}>
              {config.title}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Today's health status at a glance
            </p>
          </div>
        </div>

        {/* Counts */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <span className="text-2xl font-bold text-emerald-400">{workingCount}</span>
            </div>
            <p className="text-xs text-emerald-400/80">Working</p>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <span className="text-2xl font-bold text-amber-400">{warningCount}</span>
            </div>
            <p className="text-xs text-amber-400/80">Warnings</p>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <XCircle className="h-5 w-5 text-red-400" />
              <span className="text-2xl font-bold text-red-400">{brokenCount}</span>
            </div>
            <p className="text-xs text-red-400/80">Broken</p>
          </div>
        </div>

        {/* Quick Issue List */}
        {criticalIssues.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Critical Issues</p>
            {criticalIssues.slice(0, 3).map((issue, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/20"
              >
                <div className="flex items-center gap-3">
                  <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-300">{issue.name}</p>
                    <p className="text-xs text-slate-400">{issue.location?.breadcrumb}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-400 hover:bg-red-500/20"
                  onClick={() => issue.location?.path && navigate(issue.location.path)}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {criticalIssues.length > 3 && (
              <p className="text-xs text-slate-400 text-center">
                + {criticalIssues.length - 3} more issues
              </p>
            )}
          </div>
        )}

        {/* All OK Message */}
        {overallStatus === 'healthy' && (
          <div className="text-center py-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-2" />
            <p className="text-emerald-300">All {workingCount} business features are working correctly</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
