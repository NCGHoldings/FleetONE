import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, CheckCircle, AlertCircle, Truck, FileText, User, Camera } from 'lucide-react';
import { useYutongDeliveryManagement } from '@/hooks/useYutongDeliveryManagement';
import { format } from 'date-fns';

interface YutongDeliveryManagementProps {
  onRefresh: () => void;
}

export function YutongDeliveryManagement({ onRefresh }: YutongDeliveryManagementProps) {
  const {
    isLoading,
    getDeliveryInspections,
    getCustomerHandovers,
    getDeliveryConfirmations,
    createDeliveryInspection,
    createCustomerHandover,
    createDeliveryConfirmation,
  } = useYutongDeliveryManagement();

  const [inspections, setInspections] = useState<any[]>([]);
  const [handovers, setHandovers] = useState<any[]>([]);
  const [confirmations, setConfirmations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('inspections');

  const loadDeliveryData = async () => {
    try {
      const [inspectionsData, handoversData, confirmationsData] = await Promise.all([
        getDeliveryInspections(),
        getCustomerHandovers(),
        getDeliveryConfirmations(),
      ]);
      
      setInspections(inspectionsData || []);
      setHandovers(handoversData || []);
      setConfirmations(confirmationsData || []);
    } catch (error) {
      console.error('Error loading delivery data:', error);
    }
  };

  useEffect(() => {
    loadDeliveryData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'delivered':
      case 'approved':
        return 'bg-green-500';
      case 'in_progress':
      case 'in_transit':
        return 'bg-blue-500';
      case 'pending':
      case 'scheduled':
        return 'bg-yellow-500';
      case 'failed':
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const InspectionCard = ({ inspection }: { inspection: any }) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Inspection - {inspection.inspector_name}</CardTitle>
          <Badge className={`${getStatusColor(inspection.status)} text-white`}>
            {inspection.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(new Date(inspection.inspection_date), 'MMM dd, yyyy')}</span>
          </div>
          {inspection.overall_rating && (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              <span>Rating: {inspection.overall_rating}/5</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span>{inspection.checklist_items?.length || 0} checklist items</span>
          </div>
          {inspection.defects_found?.length > 0 && (
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span>{inspection.defects_found.length} defects found</span>
            </div>
          )}
        </div>
        {inspection.notes && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-sm text-muted-foreground">{inspection.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const HandoverCard = ({ handover }: { handover: any }) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Handover - {handover.handover_officer_name}</CardTitle>
          <Badge className={`${getStatusColor(handover.status)} text-white`}>
            {handover.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(new Date(handover.handover_date), 'MMM dd, yyyy')}</span>
          </div>
          {handover.handover_time && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{handover.handover_time}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{handover.customer_representative_name || 'Not specified'}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
            <span>Training: {handover.training_provided ? 'Yes' : 'No'}</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t">
          <p className="text-sm text-muted-foreground">Location: {handover.location}</p>
          {handover.notes && (
            <p className="text-sm text-muted-foreground mt-1">{handover.notes}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const DeliveryCard = ({ delivery }: { delivery: any }) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Delivery - {delivery.driver_name || 'Driver TBD'}</CardTitle>
          <Badge className={`${getStatusColor(delivery.status)} text-white`}>
            {delivery.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(new Date(delivery.delivery_date), 'MMM dd, yyyy')}</span>
          </div>
          {delivery.delivery_time && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{delivery.delivery_time}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-muted-foreground" />
            <span>{delivery.delivery_location}</span>
          </div>
          {delivery.driver_contact && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{delivery.driver_contact}</span>
            </div>
          )}
        </div>
        {delivery.special_instructions && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-sm text-muted-foreground">{delivery.special_instructions}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Delivery & Handover Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="inspections">Final Inspections</TabsTrigger>
            <TabsTrigger value="handovers">Customer Handovers</TabsTrigger>
            <TabsTrigger value="deliveries">Delivery Confirmations</TabsTrigger>
          </TabsList>

          <TabsContent value="inspections" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Final Inspection Checklist</h3>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    New Inspection
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Final Inspection</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="inspector-name">Inspector Name</Label>
                        <Input id="inspector-name" placeholder="Enter inspector name" />
                      </div>
                      <div>
                        <Label htmlFor="inspection-date">Inspection Date</Label>
                        <Input id="inspection-date" type="date" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="notes">Inspection Notes</Label>
                      <Textarea id="notes" placeholder="Enter inspection notes..." />
                    </div>
                    <Button className="w-full">Create Inspection</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {inspections.length > 0 ? (
                inspections.map((inspection) => (
                  <InspectionCard key={inspection.id} inspection={inspection} />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No final inspections found
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="handovers" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Customer Handover Documentation</h3>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <User className="h-4 w-4 mr-2" />
                    Schedule Handover
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Schedule Customer Handover</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="handover-officer">Handover Officer</Label>
                        <Input id="handover-officer" placeholder="Enter officer name" />
                      </div>
                      <div>
                        <Label htmlFor="handover-date">Handover Date</Label>
                        <Input id="handover-date" type="date" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input id="location" placeholder="Enter handover location" />
                    </div>
                    <div>
                      <Label htmlFor="customer-rep">Customer Representative</Label>
                      <Input id="customer-rep" placeholder="Enter customer representative name" />
                    </div>
                    <Button className="w-full">Schedule Handover</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {handovers.length > 0 ? (
                handovers.map((handover) => (
                  <HandoverCard key={handover.id} handover={handover} />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No customer handovers scheduled
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="deliveries" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Delivery Confirmation Process</h3>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Truck className="h-4 w-4 mr-2" />
                    New Delivery
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Delivery Confirmation</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="driver-name">Driver Name</Label>
                        <Input id="driver-name" placeholder="Enter driver name" />
                      </div>
                      <div>
                        <Label htmlFor="delivery-date">Delivery Date</Label>
                        <Input id="delivery-date" type="date" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="delivery-location">Delivery Location</Label>
                      <Input id="delivery-location" placeholder="Enter delivery location" />
                    </div>
                    <div>
                      <Label htmlFor="special-instructions">Special Instructions</Label>
                      <Textarea id="special-instructions" placeholder="Enter any special instructions..." />
                    </div>
                    <Button className="w-full">Create Delivery</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {confirmations.length > 0 ? (
                confirmations.map((delivery) => (
                  <DeliveryCard key={delivery.id} delivery={delivery} />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No delivery confirmations found
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}