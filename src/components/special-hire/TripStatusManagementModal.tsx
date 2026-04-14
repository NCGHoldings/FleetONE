import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, DollarSign, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { 
  fetchSpecialHireFinanceSettings, 
  postRefundToGLStandalone 
} from '@/hooks/useSpecialHireFinance';


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
    };
    total_amount: number;
    advance_paid: number;
    status: string;
  } | null;
  onStatusChange: (data: TripStatusData) => Promise<void>;
  loading?: boolean;
  effectiveCompanyId?: string;
}

const STATUS_OPTIONS = [
  { value: 'confirmed', label: 'Confirm Trip', color: 'bg-green-500' },
  { value: 'cancelled', label: 'Cancel Trip', color: 'bg-red-500' },
  { value: 'on_hold', label: 'Put On Hold', color: 'bg-yellow-500' },
  { value: 'no_bus_allocated', label: 'No Bus Allocated Issue', color: 'bg-orange-500' },
  { value: 'other', label: 'Other (specify reason)', color: 'bg-gray-500' },
];

const REFUND_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending Processing' },
  { value: 'processed', label: 'Processed/Approved' },
  { value: 'completed', label: 'Refund Completed' },
];

export function TripStatusManagementModal({
  open,
  onOpenChange,
  trip,
  onStatusChange,
  loading = false,
  effectiveCompanyId,
}: TripStatusManagementModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundStatus, setRefundStatus] = useState<string>('pending');
  const [isPostingGL, setIsPostingGL] = useState(false);

  const requiresReason = selectedStatus === 'cancelled' || selectedStatus === 'on_hold' || 
                        selectedStatus === 'no_bus_allocated' || selectedStatus === 'other';
  
  const isCancellation = selectedStatus === 'cancelled';
  const hasAdvancePayment = trip && trip.advance_paid > 0;
  const maxRefundAmount = trip ? trip.advance_paid : 0;

  const handleSubmit = async () => {
    if (!selectedStatus) return;
    if (requiresReason && !reason.trim()) return;
    if (!trip) return;
    
    const statusData: TripStatusData = {
      status: selectedStatus,
      reason: reason.trim(),
    };

    if (isCancellation && hasAdvancePayment && refundAmount > 0) {
      statusData.refundAmount = refundAmount;
      statusData.refundStatus = refundStatus;
    }

    // ========================
    // GL POSTING FOR REFUNDS
    // ========================
    // If refund is being processed, post to GL
    if (isCancellation && refundAmount > 0 && (refundStatus === 'processed' || refundStatus === 'completed')) {
      try {
        setIsPostingGL(true);
        const NCG_HOLDING_FALLBACK = 'a0000000-0000-0000-0000-000000000001';
        const companyIdToUse = effectiveCompanyId || NCG_HOLDING_FALLBACK;
        const settings = await fetchSpecialHireFinanceSettings(companyIdToUse);
        
        if (settings) {
          const glResult = await postRefundToGLStandalone({
            quotationNo: trip.quotation.quotation_no,
            customerName: trip.quotation.customer_name,
            refundAmount: refundAmount,
            reason: reason.trim(),
            settings,
            effectiveCompanyId: companyIdToUse,
          });
          
          if (glResult) {
            console.log('Refund posted to GL:', glResult.entry_number);
            toast.success('Refund posted to General Ledger');
          }
        } else {
          console.log('Special Hire Finance settings not configured - skipping GL posting');
        }
      } catch (glError) {
        console.error('GL posting for refund failed (non-blocking):', glError);
        toast.warning('Refund processed but GL posting failed. Check Finance Settings.');
      } finally {
        setIsPostingGL(false);
      }
    }
    // ========================
    // END GL POSTING
    // ========================

    await onStatusChange(statusData);
    
    // Reset form
    setSelectedStatus('');
    setReason('');
    setRefundAmount(0);
    setRefundStatus('pending');
  };

  const handleStatusSelect = (status: string) => {
    setSelectedStatus(status);
    
    // Auto-set refund amount to full advance when cancelling
    if (status === 'cancelled' && hasAdvancePayment) {
      setRefundAmount(maxRefundAmount);
    }
  };

  if (!trip) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Trip Status</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted p-3 rounded-md">
            <div className="text-sm">
              <div className="font-medium">{trip.quotation.quotation_no}</div>
              <div className="text-muted-foreground">{trip.quotation.customer_name}</div>
              <div className="text-xs mt-1">
                Current Status: <span className="font-medium capitalize">{trip.status}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">New Status</Label>
            <Select value={selectedStatus} onValueChange={handleStatusSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${option.color}`} />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {requiresReason && (
            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                placeholder="Please provide a reason for this status change..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          )}

          {isCancellation && hasAdvancePayment && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Refund Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Advance Paid: LKR {trip.advance_paid.toLocaleString()}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="refundAmount">Refund Amount (LKR)</Label>
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
                  <Label htmlFor="refundStatus">Refund Status</Label>
                  <Select value={refundStatus} onValueChange={setRefundStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REFUND_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {refundAmount > 0 && (
                  <div className="flex items-start gap-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
                    <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-orange-800">Refund Required</div>
                      <div className="text-orange-700">
                        Customer will receive LKR {refundAmount.toLocaleString()} refund
                      </div>
                    </div>
                  </div>
                )}

                {refundAmount > 0 && (refundStatus === 'processed' || refundStatus === 'completed') && (
                  <div className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                    <BookOpen className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-blue-800">GL Posting</div>
                      <div className="text-blue-700">
                        Refund will be posted to General Ledger (DR Customer Advance / CR Bank)
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading || isPostingGL}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                loading || 
                isPostingGL ||
                !selectedStatus || 
                (requiresReason && !reason.trim()) ||
                (isCancellation && hasAdvancePayment && refundAmount > maxRefundAmount)
              }
            >
              {loading || isPostingGL ? 'Updating...' : 'Update Status'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
