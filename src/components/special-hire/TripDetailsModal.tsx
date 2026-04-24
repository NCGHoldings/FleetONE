import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MapPin, Calendar, Users, Bus, Phone, Mail, Building, FileText, Send } from 'lucide-react';
import { format } from 'date-fns';
import { TripStatusTimeline } from './TripStatusTimeline';
import { PaymentTimeline } from './PaymentTimeline';
import { GenerateBalanceInvoiceModal } from './GenerateBalanceInvoiceModal';
import { PostTripAdjustmentModal } from './PostTripAdjustmentModal';
import { PaymentConfirmationModal } from './PaymentConfirmationModal';
import { usePostTripAdjustment } from '@/hooks/usePostTripAdjustment';
import { supabase } from '@/integrations/supabase/client';
import {
  getQuotationAdditionalDistance,
  calculateTotalKm,
  resolveBusType,
} from '@/lib/special-hire-invoice-helpers';

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
    balance_invoice_document_id?: string;
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
  // Modal state
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isBalanceInvoiceModalOpen, setIsBalanceInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const { getAdjustment } = usePostTripAdjustment();
  const [localAdjustmentData, setLocalAdjustmentData] = useState<any>(null);
  const [fullQuotation, setFullQuotation] = useState<any>(null);

  // Fetch adjustment data when modal opens or quotation changes
  useEffect(() => {
    if (open && trip?.quotation_id) {
      fetchAdjustmentData();
      fetchFullQuotation();
    }
  }, [open, trip?.quotation_id]);

  const fetchAdjustmentData = async () => {
    if (trip?.quotation_id) {
      const { data } = await getAdjustment(trip.quotation_id);
      setLocalAdjustmentData(data);
    }
  };

  const fetchFullQuotation = async () => {
    if (!trip?.quotation_id) return;
    try {
      const { data, error } = await supabase
        .from('special_hire_quotations')
        .select('km_trip, km_parking_to_pickup, km_drop_to_parking, total_distance_km, additional_charges, bus_fleet_details, total_additional_charges, hire_type, intermediate_stops')
        .eq('id', trip.quotation_id)
        .maybeSingle();
      if (!error && data) setFullQuotation(data);
    } catch (e) {
      console.error('Error fetching full quotation in TripDetailsModal:', e);
    }
  };

  // Compute distance context for the GenerateBalanceInvoiceModal so the
  // invoice's Mileage line shows the correct value even when no post-trip
  // adjustment exists.
  const baseTripKm = calculateTotalKm(fullQuotation);
  const quotationExtras = getQuotationAdditionalDistance(fullQuotation);
  const totalQuotedTripKm = baseTripKm + quotationExtras.distanceKm;
  const resolvedBusType = fullQuotation ? resolveBusType(fullQuotation) : 'Standard Bus';

  // Use effective adjustment that prioritizes local data over props
  const effectiveAdjustment = localAdjustmentData || adjustmentData || null;

  const calculateTotalAmount = () => {
    // Use original_quotation_amount from adjustment if available
    if (effectiveAdjustment?.original_quotation_amount) {
      return effectiveAdjustment.original_quotation_amount;
    }
    
    // Otherwise calculate from quotation fields
    if (!trip?.quotation) return 0;
    const hireAll = trip.quotation.gross_revenue || 0;
    const fuelAll = trip.quotation.fuel_cost_fuel_only || 0;
    const commission = trip.quotation.commission_pass_through_amount || 0;
    const discount = trip.quotation.discount_amount_lkr || 0;
    return Math.round(hireAll + fuelAll + commission - discount);
  };

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

      {/* Generate Balance Invoice Modal */}
      {effectiveAdjustment && 
       (effectiveAdjustment.adjustment_status === 'finalized' || 
        effectiveAdjustment.adjustment_status === 'invoiced') && 
       trip.quotation && (
        <>
          <GenerateBalanceInvoiceModal
            open={isBalanceInvoiceModalOpen}
            onOpenChange={setIsBalanceInvoiceModalOpen}
            quotationData={{
              id: trip.quotation_id,
              quotation_no: trip.quotation.quotation_no,
              customer_name: trip.quotation.customer_name,
              customer_phone: trip.quotation.customer_phone,
              customer_email: trip.quotation.customer_email,
              company_name: trip.quotation.company_name,
              pickup_location: trip.quotation.pickup_location,
              drop_location: trip.quotation.drop_location,
              pickup_datetime: trip.quotation.pickup_datetime,
              drop_datetime: trip.quotation.drop_datetime,
              bus_type: resolvedBusType,
              number_of_buses: trip.quotation.number_of_buses,
              number_of_passengers: trip.quotation.number_of_passengers,
              original_quotation_amount: effectiveAdjustment?.original_quotation_amount || 0,
              gross_revenue: trip.quotation.gross_revenue,
              fuel_cost_fuel_only: trip.quotation.fuel_cost_fuel_only,
              commission_pass_through_amount: trip.quotation.commission_pass_through_amount,
              discount_amount_lkr: trip.quotation.discount_amount_lkr,
              total_additional_charges: (fullQuotation as any)?.total_additional_charges,
              advance_paid: trip.advance_paid,
              balance_due: effectiveAdjustment?.balance_due || trip.balance_due,
              driver_name: trip.driver_name,
              conductor_name: trip.conductor_name,
              bus_no: trip.bus_no,
              // Distance context — keeps Mileage line correct even without a post-trip adjustment.
              tripDistance: totalQuotedTripKm || undefined,
              totalKm: totalQuotedTripKm || undefined,
              hire_type: (fullQuotation as any)?.hire_type,
              intermediate_stops: (fullQuotation as any)?.intermediate_stops,
            }}
            adjustmentData={{
              id: effectiveAdjustment.id || '',
              extra_km: effectiveAdjustment.extra_km || 0,
              extra_km_rate: effectiveAdjustment.extra_km_charge_per_km || 0,
              extra_km_total_charge: effectiveAdjustment.extra_km_total_charge || 0,
              additional_expenses: effectiveAdjustment.additional_expenses || [],
              total_additional_expenses: effectiveAdjustment.total_additional_expenses || 0,
              adjustment_notes: effectiveAdjustment.notes || '',
            }}
            onInvoiceGenerated={() => {
              setIsBalanceInvoiceModalOpen(false);
              fetchAdjustmentData();
            }}
          />

          <PostTripAdjustmentModal
            open={isAdjustmentModalOpen}
            onOpenChange={setIsAdjustmentModalOpen}
            quotationId={trip.quotation_id}
            quotationNo={trip.quotation.quotation_no}
            customerName={trip.quotation.customer_name}
            originalAmount={calculateTotalAmount()}
            originalKm={(trip.quotation as any).km_trip || 0}
            advancePaid={trip.advance_paid || 0}
            defaultKmRate={300}
            onAdjustmentSaved={fetchAdjustmentData}
            onRequestInvoiceGeneration={() => setIsBalanceInvoiceModalOpen(true)}
            originalPickupDatetime={(trip.quotation as any).pickup_datetime}
            originalDropDatetime={(trip.quotation as any).drop_datetime}
            originalOvertimeCharge={(trip.quotation as any).overtime_charge || 0}
            originalOvernightCharge={(trip.quotation as any).overnight_charge || 0}
            hourlyRate={(trip.quotation as any).overtime_rate_lkr_per_hour || 500}
            nightBlockFee={(trip.quotation as any).overnight_charge_lkr_per_day || 10000}
          />

          <PaymentConfirmationModal
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            onConfirm={(paymentData) => {
              setIsPaymentModalOpen(false);
            }}
            onGenerateInvoiceRequest={() => {
              setIsPaymentModalOpen(false);
              setIsBalanceInvoiceModalOpen(true);
            }}
            quotationData={{
              quotation_no: trip.quotation.quotation_no,
              customer_name: trip.quotation.customer_name,
              gross_revenue: trip.quotation.gross_revenue || 0,
              advance_paid: trip.advance_paid || 0,
              balance_due: trip.balance_due || 0,
              total_paid: trip.total_paid || 0,
              assigned_driver_name: trip.assigned_driver_name,
              assigned_conductor_name: trip.assigned_conductor_name,
              assigned_bus_no: trip.assigned_bus_no,
              fuel_cost_fuel_only: trip.quotation.fuel_cost_fuel_only || 0,
              commission_pass_through_amount: trip.quotation.commission_pass_through_amount || 0,
              discount_amount_lkr: trip.quotation.discount_amount_lkr || 0,
              total_additional_charges: trip.quotation.total_additional_charges || 0,
            }}
            adjustmentData={effectiveAdjustment}
            balanceInvoiceSent={!!effectiveAdjustment?.balance_invoice_document_id}
          />
        </>
      )}
    </Dialog>
  );
}