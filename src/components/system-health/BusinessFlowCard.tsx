import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Truck,
  Bus,
  GraduationCap,
  Wallet,
  Route,
  Wrench,
  ExternalLink
} from 'lucide-react';
import { BusinessFlowResult, FlowStatus } from '@/hooks/useBusinessFlowTests';
import { useNavigate } from 'react-router-dom';

interface BusinessFlowCardProps {
  category: string;
  results: BusinessFlowResult[];
  onRetest?: () => void;
  isRetesting?: boolean;
}

const statusConfig: Record<FlowStatus, { icon: React.ReactNode; color: string; bgColor: string }> = {
  success: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20'
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20'
  },
  error: {
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20'
  },
  pending: {
    icon: <Clock className="h-4 w-4" />,
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20'
  },
  running: {
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20'
  }
};

const categoryIcons: Record<string, React.ReactNode> = {
  'Sinotruck': <Truck className="h-5 w-5" />,
  'Special Hire': <Wallet className="h-5 w-5" />,
  'Yutong': <Bus className="h-5 w-5" />,
  'School Bus': <GraduationCap className="h-5 w-5" />,
  'Fleet': <Wrench className="h-5 w-5" />,
  'Daily Trips': <Route className="h-5 w-5" />
};

export const BusinessFlowCard: React.FC<BusinessFlowCardProps> = ({
  category,
  results,
  onRetest,
  isRetesting
}) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  
  const overallStatus: FlowStatus = results.some(r => r.status === 'error')
    ? 'error'
    : results.some(r => r.status === 'warning')
    ? 'warning'
    : results.some(r => r.status === 'running')
    ? 'running'
    : results.some(r => r.status === 'pending')
    ? 'pending'
    : 'success';

  const successCount = results.filter(r => r.status === 'success').length;
  const config = statusConfig[overallStatus];

  return (
    <Card className={`bg-slate-900/50 border-slate-700/50 ${overallStatus === 'error' ? 'border-red-500/50' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.bgColor}`}>
              <span className={config.color}>
                {categoryIcons[category] || <Wrench className="h-5 w-5" />}
              </span>
            </div>
            <div>
              <CardTitle className="text-lg text-slate-100">{category}</CardTitle>
              <p className="text-sm text-slate-400">
                {successCount}/{results.length} tests passed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${config.bgColor} ${config.color} border-none`}>
              {config.icon}
              <span className="ml-1 capitalize">{overallStatus}</span>
            </Badge>
            {onRetest && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onRetest}
                disabled={isRetesting}
                className="h-8 w-8"
              >
                <RefreshCw className={`h-4 w-4 ${isRetesting ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2">
          {results.slice(0, expanded ? undefined : 2).map((result) => {
            const resultConfig = statusConfig[result.status];
            return (
              <div
                key={result.id}
                className={`p-3 rounded-lg ${resultConfig.bgColor} border border-slate-700/30`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={resultConfig.color}>{resultConfig.icon}</span>
                    <span className="text-slate-200 font-medium">{result.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm">{result.latency}ms</span>
                    {result.status === 'error' && result.location?.path && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => navigate(result.location.path)}
                        title="Go to page"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Location breadcrumb for errors */}
                {result.status === 'error' && result.location && (
                  <p className="text-xs text-slate-500 mt-1">
                    📍 {result.location.breadcrumb}
                  </p>
                )}
                
                {/* User-friendly message */}
                <p className={`text-sm mt-1 ${result.status === 'error' ? 'text-red-300/80' : 'text-slate-400'}`}>
                  {result.friendlyError || result.message}
                </p>
                
                {/* Impact for errors */}
                {result.status === 'error' && result.location?.userImpact && (
                  <p className="text-xs text-red-400/70 mt-1">
                    👤 {result.location.userImpact}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        
        {results.length > 2 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-2 text-slate-400"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show {results.length - 2} More
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
