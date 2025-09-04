import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, AlertCircle, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

interface TimelineEvent {
  status: string;
  timestamp: string;
  reason?: string;
  refundAmount?: number;
  refundStatus?: string;
}

interface TripStatusTimelineProps {
  currentStatus: string;
  events: TimelineEvent[];
  refundAmount?: number;
  refundStatus?: string;
}

const STATUS_CONFIG = {
  quotation: { icon: Clock, color: 'bg-gray-500', label: 'Quotation' },
  confirmed: { icon: CheckCircle, color: 'bg-blue-500', label: 'Confirmed' },
  paid: { icon: DollarSign, color: 'bg-green-500', label: 'Paid' },
  completed: { icon: CheckCircle, color: 'bg-green-600', label: 'Completed' },
  cancelled: { icon: XCircle, color: 'bg-red-500', label: 'Cancelled' },
  on_hold: { icon: AlertCircle, color: 'bg-yellow-500', label: 'On Hold' },
  no_bus_allocated: { icon: AlertCircle, color: 'bg-orange-500', label: 'No Bus Allocated' },
};

export function TripStatusTimeline({ currentStatus, events, refundAmount, refundStatus }: TripStatusTimelineProps) {
  const getStatusConfig = (status: string) => STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.quotation;

  return (
    <Card className="professional-card">
      <CardContent className="p-4">
        <div className="space-y-4">
          <h4 className="font-semibold text-sm">Trip Status Timeline</h4>
          
          <div className="space-y-3">
            {events.map((event, index) => {
              const config = getStatusConfig(event.status);
              const Icon = config.icon;
              const isLatest = index === events.length - 1;
              
              return (
                <div key={index} className="flex items-start space-x-3">
                  <div className={`p-2 rounded-full ${config.color} text-white flex-shrink-0`}>
                    <Icon className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant="outline" 
                        className={`${isLatest ? 'border-primary bg-primary/10' : ''}`}
                      >
                        {config.label}
                      </Badge>
                      {isLatest && (
                        <Badge variant="secondary" className="text-xs">Current</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(event.timestamp), 'MMM dd, yyyy HH:mm')}
                    </p>
                    {event.reason && (
                      <p className="text-xs text-foreground mt-1 bg-muted p-2 rounded">
                        {event.reason}
                      </p>
                    )}
                    {event.refundAmount && event.refundAmount > 0 && (
                      <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
                        <div className="flex items-center space-x-1">
                          <DollarSign className="w-3 h-3 text-orange-600" />
                          <span className="font-medium text-orange-800">
                            Refund: LKR {event.refundAmount.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-orange-700 mt-1">
                          Status: {event.refundStatus}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}