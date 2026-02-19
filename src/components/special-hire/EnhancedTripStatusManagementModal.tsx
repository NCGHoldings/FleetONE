import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, DollarSign, CheckCircle, XCircle, Clock, Users, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

export interface TripStatusData {
  status: string;
  reason: string;
  refundAmount?: number;
  refundStatus?: string;
}

interface TripStatusManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: {
    id: string;
    quotation: {
      quotation_no: string;
      customer_name: string;
      pickup_location: string;
      drop_location: string;
      pickup_datetime: string;
      number_of_passengers: number;
    };
    total_amount: number;
    advance_paid: number;
    status: string;
    trip_status?: string;
  } | null;
  onStatusChange: (data: TripStatusData) => Promise<void>;
  loading?: boolean;
}

const STATUS_OPTIONS = [
  { 
    value: 'confirmed', 
    label: 'Confirm Trip', 
    color: 'bg-green-500',
    icon: CheckCircle,
    description: 'Confirm the trip is ready to proceed'
  },
  { 
    value: 'cancelled', 
    label: 'Cancel Trip', 
    color: 'bg-red-500',
    icon: XCircle,
    description: 'Cancel the trip and process refunds if applicable'
  },
  { 
    value: 'on_hold', 
    label: 'Put On Hold', 
    color: 'bg-yellow-500',
    icon: Clock,
    description: 'Temporarily pause the trip processing'
  },
  { 
    value: 'no_bus_allocated', 
    label: 'No Bus Available', 
    color: 'bg-orange-500',
    icon: AlertTriangle,
    description: 'Mark as no bus allocated for this trip'
  },
  { 
    value: 'completed', 
    label: 'Mark Completed', 
    color: 'bg-green-600',
    icon: TrendingUp,
    description: 'Mark the trip as successfully completed'
  },
];

const REFUND_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending Processing', description: 'Refund request is being processed' },
  { value: 'approved', label: 'Approved', description: 'Refund has been approved by management' },
  { value: 'processed', label: 'Processed', description: 'Refund payment has been initiated' },
  { value: 'completed', label: 'Completed', description: 'Refund has been successfully completed' },
];

const CANCELLATION_REASONS = [
  'Customer requested cancellation',
  'Vehicle breakdown/maintenance issue',
  'Driver unavailable',
  'Weather conditions',
  'Route restrictions',
  'Customer did not show up',
  'Payment issues',
  'Other operational reasons',
];

export function EnhancedTripStatusManagementModal({
  open,
  onOpenChange,
  trip,
  onStatusChange,
  loading = false,
}: TripStatusManagementModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundStatus, setRefundStatus] = useState<string>('pending');

  const requiresReason = selectedStatus === 'cancelled' || selectedStatus === 'on_hold' || 
                         selectedStatus === 'no_bus_allocated';
  
  const isCancellation = selectedStatus === 'cancelled';
  const hasAdvancePayment = trip && trip.advance_paid > 0;
  const maxRefundAmount = trip ? trip.advance_paid : 0;
  const selectedStatusConfig = STATUS_OPTIONS.find(s => s.value === selectedStatus);

  const handleSubmit = async () => {
    if (!selectedStatus) return;
    if (requiresReason && !reason.trim() && !customReason.trim()) return;
    
    const finalReason = reason === 'Other operational reasons' ? customReason : reason;
    
    const statusData: TripStatusData = {
      status: selectedStatus,
      reason: finalReason.trim(),
    };

    if (isCancellation && hasAdvancePayment && refundAmount > 0) {
      statusData.refundAmount = refundAmount;
      statusData.refundStatus = refundStatus;
    }

    // ========================
    // GL POSTING FOR REFUNDS
    // ========================
    if (isCancellation && refundAmount > 0 && (refundStatus === 'processed' || refundStatus === 'completed')) {
      try {
        const { fetchSpecialHireFinanceSettings, postRefundToGLStandalone, NCG_HOLDING_ID } = await import("@/hooks/useSpecialHireFinance");
        const settings = await fetchSpecialHireFinanceSettings(NCG_HOLDING_ID);
        
        if (settings && trip) {
          const glResult = await postRefundToGLStandalone({
            quotationNo: trip.quotation.quotation_no,
            customerName: trip.quotation.customer_name,
            refundAmount: refundAmount,
            reason: finalReason.trim(),
            settings,
            effectiveCompanyId: NCG_HOLDING_ID,
          });
          
          if (glResult) {
            console.log('Refund posted to GL:', glResult.entry_number);
            // Toast handled by caller
          }
        } else {
          console.log('Special Hire Finance settings not configured - skipping GL posting');
        }
      } catch (glError) {
        console.error('GL posting for refund failed (non-blocking):', glError);
      }
    }
    // ========================
    // END GL POSTING
    // ========================

    await onStatusChange(statusData);
    
    // Reset form
    setSelectedStatus('');
    setReason('');
    setCustomReason('');
    setRefundAmount(0);
    setRefundStatus('pending');
  };

  const handleStatusSelect = (status: string) => {
    setSelectedStatus(status);
    setReason('');
    setCustomReason('');
    
    // Auto-set refund amount to full advance when cancelling
    if (status === 'cancelled' && hasAdvancePayment) {
      setRefundAmount(maxRefundAmount);
    } else {
      setRefundAmount(0);
    }
  };

  if (!trip) return null;

  const potentialImpact = selectedStatus === 'cancelled' && refundAmount > 0 
    ? trip.total_amount - refundAmount 
    : selectedStatus === 'completed' 
    ? trip.total_amount 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>Trip Status Management</span>
            <Badge variant="outline">{trip.trip_status || trip.status}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Trip Summary */}
          <Card className="professional-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2">
                <Users className="w-4 h-4 text-primary" />
                <span>Trip Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Quotation</div>
                  <div className="font-medium">{trip.quotation.quotation_no}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Customer</div>
                  <div className="font-medium">{trip.quotation.customer_name}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Route</div>
                  <div className="font-medium text-xs">
                    {trip.quotation.pickup_location} → {trip.quotation.drop_location}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Date & Passengers</div>
                  <div className="font-medium text-xs">
                    {format(new Date(trip.quotation.pickup_datetime), 'MMM dd, yyyy')} • {trip.quotation.number_of_passengers} pax
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xs text-muted-foreground">Total Amount</div>
                  <div className="font-semibold">LKR {trip.total_amount.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Advance Paid</div>
                  <div className="font-semibold text-green-600">LKR {trip.advance_paid.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Balance</div>
                  <div className="font-semibold text-orange-600">
                    LKR {(trip.total_amount - trip.advance_paid).toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Selection */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">Select New Status *</Label>
              <Select value={selectedStatus} onValueChange={handleStatusSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose the new status for this trip" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center space-x-3 py-2">
                          <div className={`p-1 rounded-full ${option.color} text-white`}>
                            <Icon className="w-3 h-3" />
                          </div>
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-xs text-muted-foreground">{option.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {selectedStatusConfig && (
              <div className="p-3 bg-muted/50 rounded-md border border-dashed">
                <div className="flex items-center space-x-2">
                  <selectedStatusConfig.icon className={`w-4 h-4`} />
                  <span className="font-medium text-sm">Selected: {selectedStatusConfig.label}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{selectedStatusConfig.description}</p>
              </div>
            )}
          </div>

          {/* Reason Selection */}
          {requiresReason && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Status Change *</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {CANCELLATION_REASONS.map((reasonOption) => (
                      <SelectItem key={reasonOption} value={reasonOption}>
                        {reasonOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {reason === 'Other operational reasons' && (
                <div className="space-y-2">
                  <Label htmlFor="customReason">Please specify *</Label>
                  <Textarea
                    id="customReason"
                    placeholder="Please provide specific details..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
              )}
            </div>
          )}

          {/* Refund Management */}
          {isCancellation && hasAdvancePayment && (
            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-orange-600" />
                  <span>Refund Processing</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Customer has paid LKR {trip.advance_paid.toLocaleString()} as advance payment.
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="refundAmount">Refund Amount (LKR) *</Label>
                    <Input
                      id="refundAmount"
                      type="number"
                      max={maxRefundAmount}
                      min={0}
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(Number(e.target.value))}
                      placeholder="0"
                    />
                    <div className="text-xs text-muted-foreground">
                      Maximum refundable: LKR {maxRefundAmount.toLocaleString()}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="refundStatus">Refund Status *</Label>
                    <Select value={refundStatus} onValueChange={setRefundStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REFUND_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div>
                              <div className="font-medium">{option.label}</div>
                              <div className="text-xs text-muted-foreground">{option.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {refundAmount > 0 && (
                  <div className="p-3 bg-orange-100 border border-orange-200 rounded text-sm">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-orange-800">Refund Summary</div>
                        <div className="text-orange-700 text-xs mt-1">
                          • Customer will receive: LKR {refundAmount.toLocaleString()}<br />
                          • Company retains: LKR {(trip.advance_paid - refundAmount).toLocaleString()}<br />
                          • Status: {REFUND_STATUS_OPTIONS.find(r => r.value === refundStatus)?.label}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Financial Impact */}
          {potentialImpact > 0 && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-sm text-blue-800">Financial Impact</span>
                </div>
                <div className="text-xs text-blue-700 mt-1">
                  {selectedStatus === 'cancelled' 
                    ? `Potential revenue loss: LKR ${(trip.total_amount - potentialImpact).toLocaleString()}`
                    : `Expected revenue: LKR ${potentialImpact.toLocaleString()}`
                  }
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                loading || 
                !selectedStatus || 
                (requiresReason && !reason.trim() && !customReason.trim()) ||
                (isCancellation && hasAdvancePayment && refundAmount > maxRefundAmount) ||
                (reason === 'Other operational reasons' && !customReason.trim())
              }
              className="flex-1"
            >
              {loading ? 'Processing...' : 'Update Trip Status'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}