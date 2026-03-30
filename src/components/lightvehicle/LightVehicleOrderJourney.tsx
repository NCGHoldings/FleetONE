// @ts-nocheck
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Circle, Clock, Calendar, Users, FileText, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LightVehicleOrder {
  id: string;
  order_number?: string;
  status: string;
  current_phase?: string;
  progress_percentage?: number;
  customer_name?: string;
  vehicle_name?: string;
  brand?: string;
}

interface LightVehicleOrderJourneyProps {
  order: LightVehicleOrder;
  onRefresh?: () => void;
}

const journeySteps = [
  {
    key: 'order_confirmation',
    label: 'Order Confirmation',
    description: 'Customer order confirmed and processed',
    category: 'initial',
    estimatedDays: 1,
    requirements: ['Customer approval', 'Payment terms confirmation'],
    deliverables: ['Order confirmation document', 'Payment schedule']
  },
  {
    key: 'payment_collection',
    label: 'Payment Collection',
    description: 'Advance payment received and verified',
    category: 'financial',
    estimatedDays: 3,
    requirements: ['Bank transfer confirmation', 'Payment verification'],
    deliverables: ['Payment receipt', 'GL entry posted']
  },
  {
    key: 'vehicle_preparation',
    label: 'Vehicle Preparation',
    description: 'Vehicle inspection and preparation',
    category: 'processing',
    estimatedDays: 5,
    requirements: ['Vehicle availability', 'Condition assessment'],
    deliverables: ['Preparation report', 'Vehicle ready status']
  },
  {
    key: 'documentation',
    label: 'Documentation',
    description: 'Prepare all required documents',
    category: 'processing',
    estimatedDays: 2,
    requirements: ['Vehicle documents', 'Insurance papers'],
    deliverables: ['Complete document package', 'Transfer documents']
  },
  {
    key: 'vehicle_inspection',
    label: 'Vehicle Inspection',
    description: 'Pre-delivery quality inspection',
    category: 'quality',
    estimatedDays: 1,
    requirements: ['Inspection checklist', 'Quality standards'],
    deliverables: ['Inspection certificate', 'Quality report']
  },
  {
    key: 'registration',
    label: 'RMV Registration',
    description: 'Vehicle registration process',
    category: 'rmv',
    estimatedDays: 5,
    requirements: ['Transfer documents', 'Revenue license'],
    deliverables: ['Registration certificate', 'Number plates']
  },
  {
    key: 'final_check',
    label: 'Final Check',
    description: 'Final verification before delivery',
    category: 'quality',
    estimatedDays: 1,
    requirements: ['All payments cleared', 'Documents complete'],
    deliverables: ['Delivery clearance', 'Handover checklist']
  },
  {
    key: 'delivery',
    label: 'Delivery',
    description: 'Vehicle delivered to customer',
    category: 'delivery',
    estimatedDays: 1,
    requirements: ['Balance payment', 'Final inspection'],
    deliverables: ['Delivery receipt', 'Warranty documentation']
  }
];

export function LightVehicleOrderJourney({ order, onRefresh }: LightVehicleOrderJourneyProps) {
  const [activeView, setActiveView] = useState('timeline');
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const currentPhase = order.current_phase || 'order_confirmation';
  const currentStepIndex = journeySteps.findIndex(step => step.key === currentPhase);
  const overallProgress = order.progress_percentage || Math.round(((currentStepIndex + 1) / journeySteps.length) * 100);

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
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'active':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-muted/50 border-border';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      initial: 'bg-blue-500',
      financial: 'bg-green-500',
      processing: 'bg-purple-500',
      quality: 'bg-yellow-500',
      rmv: 'bg-indigo-500',
      delivery: 'bg-teal-500'
    };
    return colors[category] || 'bg-muted';
  };

  const handleUpdatePhase = async (phaseKey: string, action: 'start' | 'complete') => {
    setIsUpdating(true);
    try {
      const stepIndex = journeySteps.findIndex(s => s.key === phaseKey);
      const nextPhase = action === 'complete' && stepIndex < journeySteps.length - 1 
        ? journeySteps[stepIndex + 1].key 
        : phaseKey;
      
      const newProgress = action === 'complete' 
        ? Math.round(((stepIndex + 2) / journeySteps.length) * 100)
        : Math.round(((stepIndex + 1) / journeySteps.length) * 100);

      const { error } = await supabase
        .from('lightvehicle_orders')
        .update({
          current_phase: action === 'complete' ? nextPhase : phaseKey,
          progress_percentage: Math.min(newProgress, 100),
          status: action === 'complete' && phaseKey === 'delivery' ? 'completed' : 'in_progress'
        })
        .eq('id', order.id);

      if (error) throw error;
      
      toast.success(action === 'complete' ? 'Phase completed!' : 'Phase started!');
      onRefresh?.();
    } catch (error: any) {
      console.error('Error updating phase:', error);
      toast.error('Failed to update phase');
    } finally {
      setIsUpdating(false);
    }
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
          <span>Order Journey</span>
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
          <TabsList className="grid w-full grid-cols-3">
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
          </TabsList>

          <TabsContent value="timeline" className="space-y-4 mt-6">
            <div className="relative">
              {journeySteps.map((step, index) => {
                const status = getStepStatus(index);
                const isLast = index === journeySteps.length - 1;
                const isSelected = selectedStep === step.key;
                
                return (
                  <div key={step.key} className="relative flex items-start">
                    {!isLast && (
                      <div 
                        className={`absolute left-6 top-12 w-0.5 h-20 ${
                          status === 'completed' ? 'bg-green-300' : 'bg-border'
                        }`}
                      />
                    )}
                    
                    <div className="flex items-start space-x-4 pb-8 w-full">
                      <div className="flex-shrink-0 relative">
                        <div className={`w-3 h-3 rounded-full ${getCategoryColor(step.category)} absolute -left-1.5 top-1`}></div>
                        {getStepIcon(status)}
                      </div>
                      
                      <div 
                        className={`flex-1 min-w-0 p-4 rounded-lg border cursor-pointer transition-all ${
                          getStepColor(status)
                        } ${isSelected ? 'ring-2 ring-primary shadow-md' : ''}`}
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
                          </div>
                        </div>

                        {isSelected && (
                          <div className="mt-4 pt-4 border-t space-y-3">
                            <div>
                              <h5 className="font-medium text-xs mb-1">Requirements:</h5>
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
                              <h5 className="font-medium text-xs mb-1">Deliverables:</h5>
                              <ul className="text-xs text-muted-foreground space-y-1">
                                {step.deliverables.map((deliverable, i) => (
                                  <li key={i} className="flex items-center gap-2">
                                    <CheckCircle className="h-2 w-2 fill-current text-green-600" />
                                    {deliverable}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            {status === 'active' && (
                              <div className="flex gap-2 pt-2">
                                <Button 
                                  size="sm" 
                                  disabled={isUpdating}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdatePhase(step.key, 'complete');
                                  }}
                                >
                                  Mark Complete
                                </Button>
                              </div>
                            )}
                            {status === 'pending' && index === currentStepIndex + 1 && (
                              <div className="flex gap-2 pt-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  disabled={isUpdating}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdatePhase(step.key, 'start');
                                  }}
                                >
                                  Start Phase
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
                  <div className="text-2xl font-bold text-muted-foreground">
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

            <div className="space-y-3">
              <h4 className="font-semibold">Progress by Category</h4>
              {['initial', 'financial', 'processing', 'quality', 'rmv', 'delivery'].map(category => {
                const categorySteps = journeySteps.filter(step => step.category === category);
                const completedInCategory = categorySteps.filter((step) => 
                  journeySteps.findIndex(s => s.key === step.key) < currentStepIndex
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
                      <h4 className="font-semibold text-lg flex items-center gap-2">
                        <div className={`w-4 h-4 rounded ${getCategoryColor(journeySteps[currentStepIndex].category)}`}></div>
                        {journeySteps[currentStepIndex].label}
                      </h4>
                      <p className="text-muted-foreground mt-1">
                        {journeySteps[currentStepIndex].description}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium mb-2">Requirements</h5>
                        <ul className="space-y-1">
                          {journeySteps[currentStepIndex].requirements.map((req, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm">
                              <Circle className="h-2 w-2" />
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-medium mb-2">Deliverables</h5>
                        <ul className="space-y-1">
                          {journeySteps[currentStepIndex].deliverables.map((del, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-2 w-2 text-green-600" />
                              {del}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4 border-t">
                      <Button 
                        disabled={isUpdating}
                        onClick={() => handleUpdatePhase(journeySteps[currentStepIndex].key, 'complete')}
                      >
                        Mark as Complete
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
