import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

interface PaymentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentData: PaymentConfirmationData) => void;
  quotationData: {
    quotation_no: string;
    customer_name: string;
    gross_revenue: number;
    advance_paid?: number;
    balance_due?: number;
    fuel_cost_fuel_only?: number;
    commission_pass_through_amount?: number;
    discount_amount_lkr?: number;
  };
  loading?: boolean;
}

export interface PaymentConfirmationData {
  amount: number;
  paymentType: 'advance' | 'full' | 'final' | 'other';
  method: string;
  reference?: string;
  driverName?: string;
  conductorName?: string;
  busNo?: string;
}

export const PaymentConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  quotationData,
  loading = false 
}: PaymentConfirmationModalProps) => {
  // Calculate final total to match quotation preview
  const calculateFinalTotal = () => {
    return quotationData.gross_revenue + 
           (quotationData.fuel_cost_fuel_only || 0) + 
           (quotationData.commission_pass_through_amount || 0) - 
           (quotationData.discount_amount_lkr || 0);
  };

  const finalTotal = calculateFinalTotal();
  const advancePaid = quotationData.advance_paid || 0;
  const balanceDue = finalTotal - advancePaid;
  const isAdvanceAlreadyPaid = advancePaid > 0;
  
  const [paymentType, setPaymentType] = useState<'advance' | 'full' | 'final' | 'other'>(
    isAdvanceAlreadyPaid ? 'final' : 'advance'
  );
  const [amount, setAmount] = useState<number>(
    isAdvanceAlreadyPaid ? balanceDue : finalTotal * 0.5
  );
  const [method, setMethod] = useState<string>('cash');
  const [reference, setReference] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [conductorName, setConductorName] = useState<string>('');
  const [busNo, setBusNo] = useState<string>('');

  const handlePaymentTypeChange = (type: 'advance' | 'full' | 'final' | 'other') => {
    setPaymentType(type);
    if (type === 'advance' && !isAdvanceAlreadyPaid) {
      setAmount(finalTotal * 0.5);
    } else if (type === 'full') {
      setAmount(finalTotal);
    } else if (type === 'final') {
      setAmount(balanceDue);
    }
  };

  const handleConfirm = () => {
    onConfirm({
      amount,
      paymentType,
      method,
      reference: reference || undefined,
      driverName: driverName || undefined,
      conductorName: conductorName || undefined,
      busNo: busNo || undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm Payment & Trip Assignment</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quotation Summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Quotation No:</p>
                  <p className="text-muted-foreground">{quotationData.quotation_no}</p>
                </div>
                <div>
                  <p className="font-medium">Customer:</p>
                  <p className="text-muted-foreground">{quotationData.customer_name}</p>
                </div>
                <div>
                  <p className="font-medium">Total Amount:</p>
                  <p className="text-muted-foreground">LKR {finalTotal.toLocaleString()}</p>
                </div>
                {isAdvanceAlreadyPaid && (
                  <>
                    <div>
                      <p className="font-medium">Advance Paid:</p>
                      <p className="text-green-600">LKR {advancePaid.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="font-medium">Balance Due:</p>
                      <p className="text-red-600">LKR {balanceDue.toLocaleString()}</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Details */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Payment Details</Label>
            
            <div className="space-y-3">
              <Label>Payment Type</Label>
              <RadioGroup 
                value={paymentType} 
                onValueChange={(value) => handlePaymentTypeChange(value as 'advance' | 'full' | 'final' | 'other')}
                className="grid grid-cols-2 gap-4"
              >
                {!isAdvanceAlreadyPaid && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="advance" id="advance" />
                    <Label htmlFor="advance">Advance Payment (50%)</Label>
                  </div>
                )}
                {!isAdvanceAlreadyPaid && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="full" id="full" />
                    <Label htmlFor="full">Full Payment (100%)</Label>
                  </div>
                )}
                {isAdvanceAlreadyPaid && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="final" id="final" />
                    <Label htmlFor="final">Final Payment (Balance)</Label>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other">Custom Amount</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (LKR)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  min="0"
                  max={finalTotal}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="method">Payment Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="card">Card Payment</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Reference/Notes (Optional)</Label>
              <Textarea
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Payment reference number, cheque number, or additional notes..."
                rows={2}
              />
            </div>
          </div>

          {/* Trip Assignment */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Trip Assignment (Optional)</Label>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="driverName">Driver Name</Label>
                <Input
                  id="driverName"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Enter driver name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="conductorName">Conductor Name</Label>
                <Input
                  id="conductorName"
                  value={conductorName}
                  onChange={(e) => setConductorName(e.target.value)}
                  placeholder="Enter conductor name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="busNo">Bus Number</Label>
                <Input
                  id="busNo"
                  value={busNo}
                  onChange={(e) => setBusNo(e.target.value)}
                  placeholder="Enter bus number"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={loading || amount <= 0}>
              {loading ? 'Processing...' : 'Confirm Payment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};