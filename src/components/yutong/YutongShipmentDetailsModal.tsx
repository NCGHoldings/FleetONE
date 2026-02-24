import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { Ship, MapPin, FileText, Clock } from 'lucide-react';
import { useYutongLogisticsManagement, YutongShipment, ShippingDocument, ShipmentTracking } from '@/hooks/useYutongLogisticsManagement';

interface YutongShipmentDetailsModalProps {
  shipment: YutongShipment;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function YutongShipmentDetailsModal({
  shipment,
  open,
  onClose,
  onRefresh
}: YutongShipmentDetailsModalProps) {
  const [documents, setDocuments] = useState<ShippingDocument[]>([]);
  const [tracking, setTracking] = useState<ShipmentTracking[]>([]);
  const [loading, setLoading] = useState(false);
  const [newDocument, setNewDocument] = useState({
    document_type: '',
    document_number: '',
    document_date: '',
    issued_by: '',
    notes: '',
  });
  const [newTracking, setNewTracking] = useState({
    location: '',
    status: '',
    description: '',
    milestone_reached: '',
  });

  const { 
    getShippingDocuments, 
    addShippingDocument,
    getShipmentTracking,
    updateShipmentStatus,
    documentTypeLabels 
  } = useYutongLogisticsManagement();

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const result = await getShippingDocuments(shipment.id);
      if (result.success) {
        setDocuments(result.data || []);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTracking = async () => {
    try {
      setLoading(true);
      const result = await getShipmentTracking(shipment.id);
      if (result.success) {
        setTracking(result.data || []);
      }
    } catch (error) {
      console.error('Error loading tracking:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadDocuments();
      loadTracking();
    }
  }, [open, shipment.id]);

  const handleAddDocument = async () => {
    if (!newDocument.document_type || !newDocument.document_number) return;

    const result = await addShippingDocument({
      shipment_id: shipment.id,
      ...newDocument,
    });

    if (result.success) {
      loadDocuments();
      setNewDocument({
        document_type: '',
        document_number: '',
        document_date: '',
        issued_by: '',
        notes: '',
      });
    }
  };

  const handleUpdateTracking = async () => {
    if (!newTracking.status) return;

    const result = await updateShipmentStatus(shipment.id, newTracking.status, {
      location: newTracking.location,
      description: newTracking.description,
      milestone_reached: newTracking.milestone_reached,
    });

    if (result.success) {
      loadTracking();
      onRefresh();
      setNewTracking({
        location: '',
        status: '',
        description: '',
        milestone_reached: '',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5" />
            Shipment Details - {shipment.shipment_reference}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tracking">Tracking</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="costs">Costs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Shipment Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Shipment Reference</Label>
                    <div className="font-mono text-sm mt-1">
                      {shipment.shipment_reference}
                    </div>
                  </div>
                  
                  <div>
                    <Label>Shipping Method</Label>
                    <div className="mt-1">
                      <Badge variant="outline">
                        {shipment.shipping_method === 'roro' ? 'RoRo (Roll-on/Roll-off)' : 'Container'}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <Label>Current Status</Label>
                    <div className="mt-1">
                      <Badge className="bg-blue-100 text-blue-800">
                        {shipment.current_status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <Label>Tracking Number</Label>
                    <div className="font-mono text-sm mt-1">
                      {shipment.tracking_number || 'Not assigned'}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Vessel & Route Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Vessel Name</Label>
                    <div className="mt-1">{shipment.vessel_name || 'Not assigned'}</div>
                  </div>
                  
                  <div>
                    <Label>Container Number</Label>
                    <div className="font-mono text-sm mt-1">
                      {shipment.container_number || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <Label>Route</Label>
                    <div className="mt-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{shipment.departure_port}</span>
                      </div>
                      <div className="text-center text-muted-foreground">↓</div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{shipment.arrival_port}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label>Scheduled Departure</Label>
                    <div className="mt-1">
                      {shipment.scheduled_departure_date ? 
                        format(new Date(shipment.scheduled_departure_date), 'MMM dd, yyyy') : 
                        'Not scheduled'
                      }
                    </div>
                  </div>
                  <div>
                    <Label>Actual Departure</Label>
                    <div className="mt-1">
                      {shipment.actual_departure_date ? 
                        format(new Date(shipment.actual_departure_date), 'MMM dd, yyyy') : 
                        'Not departed'
                      }
                    </div>
                  </div>
                  <div>
                    <Label>Scheduled Arrival</Label>
                    <div className="mt-1">
                      {shipment.scheduled_arrival_date ? 
                        format(new Date(shipment.scheduled_arrival_date), 'MMM dd, yyyy') : 
                        'Not scheduled'
                      }
                    </div>
                  </div>
                  <div>
                    <Label>Estimated Arrival</Label>
                    <div className="mt-1">
                      {shipment.estimated_arrival_date ? 
                        format(new Date(shipment.estimated_arrival_date), 'MMM dd, yyyy') : 
                        'Not estimated'
                      }
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tracking" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Add Tracking Update</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="location">Current Location</Label>
                    <Input
                      id="location"
                      value={newTracking.location}
                      onChange={(e) => setNewTracking({ ...newTracking, location: e.target.value })}
                      placeholder="e.g., Port of Colombo"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="status">Status Update</Label>
                    <Select
                      value={newTracking.status}
                      onValueChange={(value) => setNewTracking({ ...newTracking, status: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="booked">Booked</SelectItem>
                        <SelectItem value="in_transit">In Transit</SelectItem>
                        <SelectItem value="arrived">Arrived</SelectItem>
                        <SelectItem value="customs_clearance">Customs Clearance</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="delayed">Delayed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="milestone">Milestone Reached</Label>
                  <Input
                    id="milestone"
                    value={newTracking.milestone_reached}
                    onChange={(e) => setNewTracking({ ...newTracking, milestone_reached: e.target.value })}
                    placeholder="e.g., Departed from Zhengzhou Port"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newTracking.description}
                    onChange={(e) => setNewTracking({ ...newTracking, description: e.target.value })}
                    placeholder="Additional details about this update..."
                    className="mt-1"
                  />
                </div>

                <Button onClick={handleUpdateTracking} className="w-full">
                  Add Tracking Update
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tracking History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tracking.map((update) => (
                    <div key={update.id} className="border-l-4 border-blue-200 pl-4 py-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-100 text-blue-800">
                            {update.status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                          {update.location && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {update.location}
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(update.tracking_date), 'MMM dd, yyyy HH:mm')}
                        </div>
                      </div>
                      
                      {update.milestone_reached && (
                        <div className="font-medium text-sm mb-1">
                          {update.milestone_reached}
                        </div>
                      )}
                      
                      {update.description && (
                        <p className="text-sm text-muted-foreground">
                          {update.description}
                        </p>
                      )}
                    </div>
                  ))}
                  
                  {tracking.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No tracking updates available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Add Shipping Document</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="docType">Document Type</Label>
                    <Select
                      value={newDocument.document_type}
                      onValueChange={(value) => setNewDocument({ ...newDocument, document_type: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select document type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(documentTypeLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="docNumber">Document Number</Label>
                    <Input
                      id="docNumber"
                      value={newDocument.document_number}
                      onChange={(e) => setNewDocument({ ...newDocument, document_number: e.target.value })}
                      placeholder="Enter document number"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="docDate">Document Date</Label>
                    <Input
                      id="docDate"
                      type="date"
                      value={newDocument.document_date}
                      onChange={(e) => setNewDocument({ ...newDocument, document_date: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="issuedBy">Issued By</Label>
                    <Input
                      id="issuedBy"
                      value={newDocument.issued_by}
                      onChange={(e) => setNewDocument({ ...newDocument, issued_by: e.target.value })}
                      placeholder="Organization/Authority"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="docNotes">Notes</Label>
                  <Textarea
                    id="docNotes"
                    value={newDocument.notes}
                    onChange={(e) => setNewDocument({ ...newDocument, notes: e.target.value })}
                    placeholder="Additional document notes..."
                    className="mt-1"
                  />
                </div>

                <Button onClick={handleAddDocument} className="w-full">
                  Add Document
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Document List</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {documentTypeLabels[doc.document_type as keyof typeof documentTypeLabels]}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {doc.document_number} • {doc.issued_by}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={doc.document_status === 'approved' ? 'default' : 'secondary'}
                        >
                          {doc.document_status}
                        </Badge>
                        {doc.document_date && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(new Date(doc.document_date), 'MMM dd, yyyy')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {documents.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No documents available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="costs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Shipping Costs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label>Shipping Cost</Label>
                    <div className="mt-1 font-medium">
                      {shipment.shipping_cost ? 
                        `USD ${shipment.shipping_cost.toLocaleString()}` : 
                        'Not set'
                      }
                    </div>
                  </div>
                  <div>
                    <Label>Insurance Amount</Label>
                    <div className="mt-1 font-medium">
                      {shipment.insurance_amount ? 
                        `USD ${shipment.insurance_amount.toLocaleString()}` : 
                        'Not set'
                      }
                    </div>
                  </div>
                </div>
                
                {shipment.special_instructions && (
                  <div className="mt-4">
                    <Label>Special Instructions</Label>
                    <div className="mt-1 p-3 bg-muted rounded-md text-sm">
                      {shipment.special_instructions}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}