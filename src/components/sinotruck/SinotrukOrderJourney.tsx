// @ts-nocheck
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Circle, Clock, AlertCircle, Calendar, Users, FileText, Settings } from 'lucide-react';
import { SinotrukOrder } from '@/hooks/useSinotrukOrderManagement';

interface SinotrukOrderJourneyProps {
  order: SinotrukOrder;
  onUpdatePhase?: (phase: string, data: any) => void;
}

const journeySteps = [
  {
    key: 'order_confirmation',
    label: 'Order Confirmation',
    description: 'Customer order confirmed and processed',
    category: 'initial',
    estimatedDays: 2,
    requirements: ['Customer approval', 'Payment terms confirmation'],
    deliverables: ['Order confirmation document', 'Payment schedule']
  },
  {
    key: 'lc_issuance',
    label: 'LC Issuance',
    description: 'Letter of Credit issued by customer bank',
    category: 'financial',
    estimatedDays: 5,
    requirements: ['Bank documentation', 'Credit approval'],
    deliverables: ['Letter of Credit', 'Bank guarantees']
  },
  {
    key: 'production_order',
    label: 'Production Order',
    description: 'Manufacturing order placed with Sinotruk',
    category: 'supplier',
    estimatedDays: 3,
    requirements: ['LC confirmation', 'Technical specifications'],
    deliverables: ['Production order', 'Manufacturing timeline']
  },
  {
    key: 'manufacturing',
    label: 'Manufacturing',
    description: 'Vehicle manufacturing in progress',
    category: 'supplier',
    estimatedDays: 45,
    requirements: ['Production order', 'Quality standards'],
    deliverables: ['Manufacturing updates', 'Quality reports']
  },
  {
    key: 'shipping_booking',
    label: 'Shipping Booking',
    description: 'Cargo space booked for transportation',
    category: 'logistics',
    estimatedDays: 7,
    requirements: ['Manufacturing completion', 'Export documentation'],
    deliverables: ['Shipping schedule', 'Bill of lading']
  },
  {
    key: 'customs_clearance',
    label: 'Customs Clearance',
    description: 'Import/export documentation and clearance',
    category: 'customs',
    estimatedDays: 10,
    requirements: ['Import permits', 'Tax clearances'],
    deliverables: ['Customs clearance', 'Import duty receipts']
  },
  {
    key: 'port_operations',
    label: 'Port Operations',
    description: 'Port handling and container operations',
    category: 'logistics',
    estimatedDays: 3,
    requirements: ['Customs clearance', 'Port documentation'],
    deliverables: ['Port clearance', 'Delivery schedule']
  },
  {
    key: 'vehicle_processing',
    label: 'Vehicle Processing',
    description: 'Local modifications and preparations',
    category: 'processing',
    estimatedDays: 7,
    requirements: ['Vehicle delivery to facility', 'Modification specifications'],
    deliverables: ['Processing completion certificate', 'Quality inspection']
  },
  {
    key: 'rmv_registration',
    label: 'RMV Registration',
    description: 'Department of Motor Traffic registration',
    category: 'rmv',
    estimatedDays: 5,
    requirements: ['Vehicle inspection', 'Documentation compliance'],
    deliverables: ['Registration certificate', 'Number plates']
  },
  {
    key: 'final_inspection',
    label: 'Final Inspection',
    description: 'Quality control and compliance check',
    category: 'processing',
    estimatedDays: 2,
    requirements: ['RMV registration', 'Customer specifications'],
    deliverables: ['Inspection report', 'Handover checklist']
  },
  {
    key: 'delivery',
    label: 'Delivery',
    description: 'Vehicle delivered to customer',
    category: 'delivery',
    estimatedDays: 1,
    requirements: ['Final inspection', 'Payment completion'],
    deliverables: ['Delivery receipt', 'Warranty documentation']
  }
];

export function SinotrukOrderJourney({ order, onUpdatePhase }: SinotrukOrderJourneyProps) {
  const [activeView, setActiveView] = useState('timeline');
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
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

  const getCategoryColor = (category: string) => {
    const colors = {
      initial: 'bg-blue-500',
      financial: 'bg-green-500',
      supplier: 'bg-purple-500',
      logistics: 'bg-orange-500',
      customs: 'bg-red-500',
      processing: 'bg-yellow-500',
      rmv: 'bg-indigo-500',
      delivery: 'bg-teal-500'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-500';
  };

  const getEstimatedCompletion = (stepIndex: number) => {
    const remainingDays = journeySteps
      .slice(stepIndex)
      .reduce((total, step) => total + step.estimatedDays, 0);
    
    const today = new Date();
    const completionDate = new Date(today.getTime() + (remainingDays * 24 * 60 * 60 * 1000));
    return completionDate.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Order Journey & Process Management</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {Math.round(overallProgress)}% Complete
            </Badge>
            <Badge className={getCategoryColor(journeySteps[currentStepIndex]?.category || 'initial')}>
              {journeySteps[currentStepIndex]?.category.toUpperCase() || 'INITIAL'}
            </Badge>
          </div>
        </CardTitle>
        <div className="space-y-2">
          <Progress value={overallProgress} className="w-full" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Step {currentStepIndex + 1} of {journeySteps.length}</span>
            <span>Est. Completion: {getEstimatedCompletion(currentStepIndex)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="space-y-4 mt-6">
            {/* Enhanced Timeline View */}
            <div className="relative">
              {journeySteps.map((step, index) => {
                const status = getStepStatus(index);
                const isLast = index === journeySteps.length - 1;
                const isSelected = selectedStep === step.key;
                
                return (
                  <div key={step.key} className="relative flex items-start">
                    {/* Connector Line */}
                    {!isLast && (
                      <div 
                        className={`absolute left-6 top-12 w-0.5 h-20 ${
                          status === 'completed' ? 'bg-green-300' : 'bg-gray-200'
                        }`}
                      />
                    )}
                    
                    {/* Step Content */}
                    <div className="flex items-start space-x-4 pb-8 w-full">
                      {/* Step Icon with Category Indicator */}
                      <div className="flex-shrink-0 relative">
                        <div className={`w-3 h-3 rounded-full ${getCategoryColor(step.category)} absolute -left-1.5 top-1`}></div>
                        {getStepIcon(status)}
                      </div>
                      
                      <div 
                        className={`flex-1 min-w-0 p-4 rounded-lg border cursor-pointer transition-all ${
                          getStepColor(status)
                        } ${isSelected ? 'ring-2 ring-blue-300 shadow-md' : ''}`}
                        onClick={() => setSelectedStep(isSelected ? null : step.key)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-sm">{step.label}</h4>
                              <Badge variant="outline" className="text-xs">
                                {step.estimatedDays} days
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {step.description}
                            </p>
                          </div>
                          
                          <div className="flex flex-col items-end gap-1">
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
                            {status === 'pending' && onUpdatePhase && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdatePhase(step.key, { step });
                                }}
                              >
                                Start
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isSelected && (
                          <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                            <div>
                              <h5 className="font-medium text-xs text-gray-700 mb-1">Requirements:</h5>
                              <ul className="text-xs text-muted-foreground space-y-1">
                                {step.requirements.map((req, i) => (
                                  <li key={i} className="flex items-center gap-2">
                                    <Circle className="h-2 w-2 fill-current" />
                                    {req}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h5 className="font-medium text-xs text-gray-700 mb-1">Deliverables:</h5>
                              <ul className="text-xs text-muted-foreground space-y-1">
                                {step.deliverables.map((deliverable, i) => (
                                  <li key={i} className="flex items-center gap-2">
                                    <CheckCircle className="h-2 w-2 fill-current text-green-600" />
                                    {deliverable}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            {onUpdatePhase && status === 'active' && (
                              <div className="flex gap-2 pt-2">
                                <Button 
                                  size="sm" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdatePhase(step.key, { action: 'complete', step });
                                  }}
                                >
                                  Mark Complete
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdatePhase(step.key, { action: 'update', step });
                                  }}
                                >
                                  Update Progress
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="overview" className="space-y-4 mt-6">
            {/* Process Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {journeySteps.filter((_, i) => i < currentStepIndex).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">1</div>
                  <div className="text-sm text-muted-foreground">Active</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {journeySteps.length - currentStepIndex - 1}
                  </div>
                  <div className="text-sm text-muted-foreground">Remaining</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {journeySteps.slice(currentStepIndex).reduce((sum, step) => sum + step.estimatedDays, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Est. Days</div>
                </CardContent>
              </Card>
            </div>

            {/* Category Progress */}
            <div className="space-y-3">
              <h4 className="font-semibold">Progress by Category</h4>
              {['initial', 'financial', 'supplier', 'logistics', 'customs', 'processing', 'rmv', 'delivery'].map(category => {
                const categorySteps = journeySteps.filter(step => step.category === category);
                const completedInCategory = categorySteps.filter((_, i) => 
                  journeySteps.findIndex(s => s.key === categorySteps[i].key) < currentStepIndex
                ).length;
                const progressPercent = (completedInCategory / categorySteps.length) * 100;
                
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize font-medium">{category}</span>
                      <span>{completedInCategory}/{categorySteps.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded ${getCategoryColor(category)}`}></div>
                      <Progress value={progressPercent} className="flex-1 h-2" />
                      <span className="text-xs text-muted-foreground w-12">
                        {Math.round(progressPercent)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Phase Details</CardTitle>
              </CardHeader>
              <CardContent>
                {journeySteps[currentStepIndex] && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">{journeySteps[currentStepIndex].label}</h4>
                      <p className="text-muted-foreground">{journeySteps[currentStepIndex].description}</p>
                    </div>
                    <div>
                      <h5 className="font-medium mb-2">Requirements:</h5>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {journeySteps[currentStepIndex].requirements.map((req, i) => (
                          <li key={i}>{req}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium mb-2">Expected Deliverables:</h5>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {journeySteps[currentStepIndex].deliverables.map((deliverable, i) => (
                          <li key={i}>{deliverable}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Process Teams</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Team assignments and responsibilities coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}