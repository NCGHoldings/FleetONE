export type ServiceStatus = 'healthy' | 'approaching' | 'due_soon' | 'urgent' | 'scheduled';

export interface ServiceStatusInfo {
  status: ServiceStatus;
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  kmRemaining: number;
}

export function getServiceStatus(currentKm: number, nextServiceKm: number): ServiceStatusInfo {
  const kmRemaining = nextServiceKm - currentKm;
  
  if (kmRemaining > 500) {
    return {
      status: 'healthy',
      label: 'Healthy',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      icon: '🟢',
      kmRemaining
    };
  } else if (kmRemaining > 200) {
    return {
      status: 'approaching',
      label: 'Service Approaching',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      icon: '🟡',
      kmRemaining
    };
  } else if (kmRemaining > 100) {
    return {
      status: 'due_soon',
      label: 'Service Due Soon',
      color: 'text-orange-500',
      bgColor: 'bg-orange-100',
      icon: '🟠',
      kmRemaining
    };
  } else if (kmRemaining > 0) {
    return {
      status: 'urgent',
      label: 'Urgent Service',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      icon: '🔴',
      kmRemaining
    };
  } else {
    return {
      status: 'urgent',
      label: 'Overdue',
      color: 'text-red-700',
      bgColor: 'bg-red-200',
      icon: '🔴',
      kmRemaining
    };
  }
}

export function getServiceStatusBadgeVariant(kmRemaining: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (kmRemaining > 500) return 'default';
  if (kmRemaining > 200) return 'secondary';
  if (kmRemaining > 100) return 'outline';
  return 'destructive';
}
