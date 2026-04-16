import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface GLStatusBadgeProps {
  glPosted: boolean | null | undefined;
  journalEntryId?: string | null;
  size?: 'sm' | 'default';
  showLink?: boolean;
}

export function GLStatusBadge({ 
  glPosted, 
  journalEntryId, 
  size = 'default',
  showLink = false 
}: GLStatusBadgeProps) {
  const navigate = useNavigate();
  const isPosted = glPosted === true;
  
  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  if (isPosted) {
    return (
      <div className="flex items-center gap-1">
        <Badge 
          variant="default" 
          className={`${sizeClasses} bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400`}
        >
          <CheckCircle2 className={`${iconSize} mr-1`} />
          Posted
        </Badge>
        {showLink && journalEntryId && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => navigate(`/accounting/journal-entries?id=${journalEntryId}`)}
            title="View Journal Entry"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Badge 
      variant="secondary" 
      className={`${sizeClasses} bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400`}
    >
      <Clock className={`${iconSize} mr-1`} />
      Unposted
    </Badge>
  );
}

// Aggregated status for showing "X/Y Posted" style indicators
interface GLAggregatedStatusProps {
  posted: number;
  total: number;
  size?: 'sm' | 'default';
}

export function GLAggregatedStatus({ posted, total, size = 'default' }: GLAggregatedStatusProps) {
  const allPosted = posted === total && total > 0;
  const nonePosted = posted === 0;
  
  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1';

  if (allPosted) {
    return (
      <Badge 
        variant="default" 
        className={`${sizeClasses} bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400`}
      >
        <CheckCircle2 className="h-3 w-3 mr-1" />
        All Posted
      </Badge>
    );
  }

  if (nonePosted) {
    return (
      <Badge 
        variant="secondary" 
        className={`${sizeClasses} bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400`}
      >
        <Clock className="h-3 w-3 mr-1" />
        {total} Unposted
      </Badge>
    );
  }

  return (
    <Badge 
      variant="secondary" 
      className={`${sizeClasses} bg-yellow-100 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400`}
    >
      {posted}/{total} Posted
    </Badge>
  );
}
