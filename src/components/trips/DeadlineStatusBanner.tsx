import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { format, differenceInHours, addHours } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface DeadlineStatusBannerProps {
  tripDate: Date;
  deadlineHours: number;
  isEnforced: boolean;
  canEnter: boolean;
  onRequestLateEntry: () => void;
  existingRequestStatus?: 'pending' | 'approved' | 'rejected' | null;
}

export const DeadlineStatusBanner = ({
  tripDate,
  deadlineHours,
  isEnforced,
  canEnter,
  onRequestLateEntry,
  existingRequestStatus
}: DeadlineStatusBannerProps) => {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const now = new Date();
  const deadline = addHours(tripDate, deadlineHours);
  const hoursRemaining = differenceInHours(deadline, now);
  const hoursExceeded = Math.max(0, -hoursRemaining);

  const isAdmin = hasRole('super_admin') || hasRole('admin');

  // Determine status and styling
  const getStatus = () => {
    if (!isEnforced) {
      return {
        variant: 'default' as const,
        icon: Clock,
        title: 'Deadline Monitoring (Not Enforced)',
        color: 'text-muted-foreground'
      };
    }

    if (hoursRemaining > 2) {
      return {
        variant: 'default' as const,
        icon: CheckCircle,
        title: 'On Time',
        color: 'text-green-600'
      };
    }

    if (hoursRemaining > 0) {
      return {
        variant: 'default' as const,
        icon: AlertTriangle,
        title: 'Deadline Approaching',
        color: 'text-yellow-600'
      };
    }

    return {
      variant: 'destructive' as const,
      icon: AlertCircle,
      title: 'Deadline Exceeded',
      color: 'text-destructive'
    };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  return (
    <Alert variant={status.variant} className="mb-4">
      <StatusIcon className="h-4 w-4" />
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold ${status.color}`}>
              {status.title}
            </span>
            {!isEnforced && (
              <span className="text-xs text-muted-foreground">(Monitoring Only)</span>
            )}
          </div>
          
          <div className="text-sm space-y-1">
            <div>
              Deadline: {format(deadline, 'PPp')}
              {hoursRemaining > 0 && isEnforced && (
                <span className="ml-2 text-xs">
                  ({hoursRemaining} hour{hoursRemaining !== 1 ? 's' : ''} remaining)
                </span>
              )}
              {hoursExceeded > 0 && isEnforced && (
                <span className="ml-2 text-xs">
                  ({hoursExceeded} hour{hoursExceeded !== 1 ? 's' : ''} late)
                </span>
              )}
            </div>
            
            {existingRequestStatus && (
              <div className="text-xs font-medium">
                Late Entry Request: 
                <span className={`ml-1 ${
                  existingRequestStatus === 'approved' ? 'text-green-600' :
                  existingRequestStatus === 'rejected' ? 'text-red-600' :
                  'text-yellow-600'
                }`}>
                  {existingRequestStatus.toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {!canEnter && !existingRequestStatus && (
            <Button onClick={onRequestLateEntry} size="sm" variant="outline">
              <Clock className="mr-2 h-4 w-4" />
              Request Late Entry
            </Button>
          )}
          
          {isAdmin && (
            <>
              <Button
                onClick={() => navigate('/settings?tab=data-entry')}
                size="sm"
                variant="ghost"
              >
                Adjust Settings
              </Button>
              <Button
                onClick={() => navigate('/trips/late-entry-requests')}
                size="sm"
                variant="ghost"
              >
                Review Requests
              </Button>
            </>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};
