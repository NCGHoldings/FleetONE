import { Badge } from "@/components/ui/badge";
import { getServiceStatus } from "@/utils/service-status";

interface ServiceStatusBadgeProps {
  currentKm: number;
  nextServiceKm: number;
  showKm?: boolean;
}

export function ServiceStatusBadge({ currentKm, nextServiceKm, showKm = true }: ServiceStatusBadgeProps) {
  const statusInfo = getServiceStatus(currentKm, nextServiceKm);
  
  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant={statusInfo.status === 'urgent' ? 'destructive' : statusInfo.status === 'due_soon' ? 'outline' : 'default'}
        className={`${statusInfo.status === 'healthy' ? 'bg-green-100 text-green-700 hover:bg-green-200' : ''} ${statusInfo.status === 'approaching' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : ''}`}
      >
        <span className="mr-1">{statusInfo.icon}</span>
        {statusInfo.label}
      </Badge>
      {showKm && (
        <span className={`text-sm font-medium ${statusInfo.color}`}>
          {statusInfo.kmRemaining > 0 ? `${statusInfo.kmRemaining.toFixed(0)} km` : 'Overdue'}
        </span>
      )}
    </div>
  );
}
