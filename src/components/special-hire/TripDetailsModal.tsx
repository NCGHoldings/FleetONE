import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Calendar, Users, Bus, Phone, Mail, Building } from 'lucide-react';
import { format } from 'date-fns';
import { TripStatusTimeline } from './TripStatusTimeline';
import { PaymentTimeline } from './PaymentTimeline';

interface TripDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: {
    id: string;
    quotation_id: string;
    status: string;
    trip_status?: string;
    total_amount: number;
    advance_paid: number;
    balance_due: number;
    driver_name?: string;
    conductor_name?: string;
    bus_no?: string;
    created_at: string;
    cancellation_reason?: string;
    refund_amount?: number;
    refund_status?: string;
    status_changed_at?: string;
    quotation: {
      quotation_no: string;
      customer_name: string;
      customer_phone: string;
      customer_email?: string;
      company_name?: string;
      pickup_location: string;
      drop_location: string;
      pickup_datetime: string;
      drop_datetime: string;
      number_of_buses: number;
      number_of_passengers: number;
      gross_revenue: number;
      fuel_cost_fuel_only?: number;
      commission_pass_through_amount?: number;
      discount_amount_lkr?: number;
    };
    payments: any[];
    invoices: any[];
  } | null;
  onViewInvoice: (type: 'advance' | 'final') => void;
  onDownloadInvoice: (type: 'advance' | 'final') => void;
  onViewPaymentProof: (proofUrl: string) => void;
  adjustmentStatus?: string;
  adjustmentAmount?: number;
  adjustmentData?: {
    extra_km?: number;
    extra_km_total_charge?: number;
    total_additional_expenses?: number;
  };
}

export function TripDetailsModal({
  open,
  onOpenChange,
  trip,
  onViewInvoice,
  onDownloadInvoice,
  onViewPaymentProof,
  adjustmentStatus,
  adjustmentAmount,
  adjustmentData,
}: TripDetailsModalProps) {
  if (!trip) return null;

  const timelineEvents = [
    {
      status: 'quotation',
      timestamp: trip.created_at,
    },
    {
      status: trip.trip_status || trip.status,
      timestamp: trip.status_changed_at || trip.created_at,
      reason: trip.cancellation_reason,
      refundAmount: trip.refund_amount,
      refundStatus: trip.refund_status,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>Trip Details - {trip.quotation.quotation_no}</span>
            <Badge variant="outline">{trip.trip_status || trip.status}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Trip Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <Card className="professional-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Building className="w-4 h-4 text-primary" />
                  <span>Customer Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Customer Name</div>
                    <div className="font-medium">{trip.quotation.customer_name}</div>
                  </div>
                  {trip.quotation.company_name && (
                    <div>
                      <div className="text-xs text-muted-foreground">Company</div>
                      <div className="font-medium">{trip.quotation.company_name}</div>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm">{trip.quotation.customer_phone}</span>
                  </div>
                  {trip.quotation.customer_email && (
                    <div className="flex items-center space-x-2">
                      <Mail className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm">{trip.quotation.customer_email}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Trip Information */}
            <Card className="professional-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>Trip Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-3 h-3 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Pickup Location</div>
                      <div className="font-medium text-sm">{trip.quotation.pickup_location}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {trip.quotation.pickup_datetime ? format(new Date(trip.quotation.pickup_datetime), 'MMM dd, yyyy HH:mm') : 'Not specified'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-1.5 w-px h-6 bg-border"></div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-3 h-3 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Drop Location</div>
                      <div className="font-medium text-sm">{trip.quotation.drop_location}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {trip.quotation.drop_datetime ? format(new Date(trip.quotation.drop_datetime), 'MMM dd, yyyy HH:mm') : 'Same as pickup'}
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm">{trip.quotation.number_of_passengers} Passengers</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Bus className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm">{trip.quotation.number_of_buses} Bus(es)</span>
                  </div>
                </div>

                {/* Vehicle Assignment */}
                {(trip.bus_no || trip.driver_name || trip.conductor_name) && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Vehicle Assignment
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        {trip.bus_no && (
                          <div>
                            <div className="text-xs text-muted-foreground">Bus No</div>
                            <div className="font-medium">{trip.bus_no}</div>
                          </div>
                        )}
                        {trip.driver_name && (
                          <div>
                            <div className="text-xs text-muted-foreground">Driver</div>
                            <div className="font-medium">{trip.driver_name}</div>
                          </div>
                        )}
                        {trip.conductor_name && (
                          <div>
                            <div className="text-xs text-muted-foreground">Conductor</div>
                            <div className="font-medium">{trip.conductor_name}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Status Timeline */}
            <TripStatusTimeline
              currentStatus={trip.trip_status || trip.status}
              events={timelineEvents}
              refundAmount={trip.refund_amount}
              refundStatus={trip.refund_status}
              adjustmentStatus={adjustmentStatus}
              adjustmentAmount={adjustmentAmount}
            />
          </div>

          {/* Right Column - Financial Information */}
          <div className="space-y-6">
            <PaymentTimeline
              totalAmount={trip.total_amount}
              advancePaid={trip.advance_paid}
              balanceDue={trip.balance_due}
              payments={trip.payments}
              invoices={trip.invoices}
              adjustmentData={adjustmentData}
              onViewInvoice={onViewInvoice}
              onDownloadInvoice={onDownloadInvoice}
              onViewPaymentProof={onViewPaymentProof}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}