import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  User, 
  Clock, 
  ExternalLink, 
  RefreshCw, 
  Copy,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { BusinessFlowResult } from '@/hooks/useBusinessFlowTests';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface IssueCardProps {
  issue: BusinessFlowResult;
  onRetest?: () => void;
  isRetesting?: boolean;
}

export const IssueCard: React.FC<IssueCardProps> = ({
  issue,
  onRetest,
  isRetesting
}) => {
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = React.useState(false);

  const handleGoToPage = () => {
    if (issue.location?.path) {
      navigate(issue.location.path);
    }
  };

  const copyError = () => {
    const errorText = `Issue: ${issue.name}
Location: ${issue.location?.breadcrumb}
Impact: ${issue.location?.userImpact}
Error: ${issue.friendlyError || issue.message}
Technical Details: ${issue.errorDetails || 'None'}`;
    navigator.clipboard.writeText(errorText);
    toast.success('Issue details copied');
  };

  const timeAgo = formatDistanceToNow(issue.testedAt, { addSuffix: true });

  return (
    <Card className="bg-red-950/30 border-red-500/30 overflow-hidden">
      {/* Header */}
      <div className="bg-red-500/10 px-4 py-3 border-b border-red-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <span className="font-semibold text-red-300">{issue.name}</span>
            <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs">
              {issue.category}
            </Badge>
          </div>
          <span className="text-xs text-red-400/70">{issue.latency}ms</span>
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Where - Location */}
        <div className="flex items-start gap-3">
          <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Where</p>
            <p className="text-sm text-slate-200">{issue.location?.breadcrumb}</p>
            <p className="text-xs text-slate-400">{issue.location?.feature}</p>
          </div>
        </div>

        {/* Impact */}
        <div className="flex items-start gap-3">
          <User className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Impact</p>
            <p className="text-sm text-red-300">{issue.location?.userImpact}</p>
          </div>
        </div>

        {/* When Detected */}
        <div className="flex items-start gap-3">
          <Clock className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Detected</p>
            <p className="text-sm text-slate-300">{timeAgo}</p>
          </div>
        </div>

        {/* Error Message */}
        <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
          <p className="text-sm text-red-300">
            {issue.friendlyError || issue.message}
          </p>
        </div>

        {/* Technical Details (Expandable) */}
        {issue.errorDetails && (
          <div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300 transition-colors"
            >
              {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              Technical Details
            </button>
            {showDetails && (
              <div className="mt-2 p-2 bg-slate-900/50 rounded border border-slate-700/50">
                <code className="text-xs text-red-400/80 break-all">
                  {issue.errorDetails}
                </code>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            size="sm"
            variant="default"
            className="flex-1 bg-red-600 hover:bg-red-500"
            onClick={handleGoToPage}
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Go to Page
          </Button>
          {onRetest && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetest}
              disabled={isRetesting}
              className="border-slate-600"
            >
              <RefreshCw className={`h-4 w-4 ${isRetesting ? 'animate-spin' : ''}`} />
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={copyError}
            className="border-slate-600"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
