import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, Clock, AlertCircle } from 'lucide-react';
import { YutongOrder } from '@/hooks/useYutongOrderManagement';

interface YutongOrderJourneyProps {
  order: YutongOrder;
}

const journeySteps = [
  {
    key: 'order_confirmation',
    label: 'Order Confirmation',
    description: 'Customer order confirmed and processed'
  },
  {
    key: 'lc_issuance',
    label: 'LC Issuance',
    description: 'Letter of Credit issued by customer bank'
  },
  {
    key: 'production_order',
    label: 'Production Order',
    description: 'Manufacturing order placed with Yutong'
  },
  {
    key: 'manufacturing',
    label: 'Manufacturing',
    description: 'Vehicle manufacturing in progress'
  },
  {
    key: 'shipping_booking',
    label: 'Shipping Booking',
    description: 'Cargo space booked for transportation'
  },
  {
    key: 'customs_clearance',
    label: 'Customs Clearance',
    description: 'Import/export documentation and clearance'
  },
  {
    key: 'port_operations',
    label: 'Port Operations',
    description: 'Port handling and container operations'
  },
  {
    key: 'vehicle_processing',
    label: 'Vehicle Processing',
    description: 'Local modifications and preparations'
  },
  {
    key: 'rmv_registration',
    label: 'RMV Registration',
    description: 'Department of Motor Traffic registration'
  },
  {
    key: 'final_inspection',
    label: 'Final Inspection',
    description: 'Quality control and compliance check'
  },
  {
    key: 'delivery',
    label: 'Delivery',
    description: 'Vehicle delivered to customer'
  }
];

export function YutongOrderJourney({ order }: YutongOrderJourneyProps) {
  const currentStepIndex = journeySteps.findIndex(step => step.key === order.current_phase);
  const overallProgress = order.progress_percentage || 0;

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'active';
    return 'pending';
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'active':
        return <Clock className="h-5 w-5 text-blue-600" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 border-green-200';
      case 'active':
        return 'bg-blue-100 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Order Journey</span>
          <Badge variant="outline" className="ml-2">
            {Math.round(overallProgress)}% Complete
          </Badge>
        </CardTitle>
        <Progress value={overallProgress} className="w-full" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timeline View */}
        <div className="relative">
          {journeySteps.map((step, index) => {
            const status = getStepStatus(index);
            const isLast = index === journeySteps.length - 1;
            
            return (
              <div key={step.key} className="relative flex items-start">
                {/* Connector Line */}
                {!isLast && (
                  <div 
                    className={`absolute left-2.5 top-8 w-0.5 h-16 ${
                      status === 'completed' ? 'bg-green-300' : 'bg-gray-200'
                    }`}
                  />
                )}
                
                {/* Step Content */}
                <div className="flex items-start space-x-3 pb-6">
                  <div className="flex-shrink-0">
                    {getStepIcon(status)}
                  </div>
                  
                  <div className={`flex-1 min-w-0 p-3 rounded-lg border ${getStepColor(status)}`}>
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{step.label}</h4>
                      {status === 'active' && (
                        <Badge variant="secondary" className="text-xs">
                          In Progress
                        </Badge>
                      )}
                      {status === 'completed' && (
                        <Badge variant="default" className="text-xs bg-green-600">
                          Completed
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {journeySteps.filter((_, i) => i < currentStepIndex).length}
            </div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">1</div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {journeySteps.length - currentStepIndex - 1}
            </div>
            <div className="text-xs text-muted-foreground">Remaining</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}