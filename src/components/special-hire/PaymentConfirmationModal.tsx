import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PaymentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentData: PaymentConfirmationData) => void;
  onGenerateInvoiceRequest?: () => void;
  quotationData: {
    quotation_no: string;
    customer_name: string;
    gross_revenue: number;
    number_of_buses?: number;
    percentage_adjustment?: number;
    advance_paid?: number;
    balance_due?: number;
    fuel_cost_fuel_only?: number;
    commission_pass_through_amount?: number;
    discount_amount_lkr?: number;
    total_additional_charges?: number;
  };
  adjustmentData?: {
    extra_km?: number;
    extra_km_charge_per_km?: number;
    extra_km_total_charge?: number;
    additional_expenses?: Array<{ description: string; amount: number }>;
    total_additional_expenses?: number;
    notes?: string;
  };
  balanceInvoiceSent?: boolean;
  loading?: boolean;
}

export interface PaymentConfirmationData {
  amount: number;
  paymentType: 'advance' | 'balance' | 'full';
  method: string;
  reference?: string;
  driverName?: string;
  conductorName?: string;
  busNo?: string;
  paymentProofUrl?: string;
  notes?: string;
}

export const PaymentConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  onGenerateInvoiceRequest,
  quotationData,
  adjustmentData,
  balanceInvoiceSent = false,
  loading = false 
}: PaymentConfirmationModalProps) => {
  const { user } = useAuth();
  const [workflowMode, setWorkflowMode] = useState<'generate_invoice' | 'confirm_payment'>('confirm_payment');
  // Calculate final total to match quotation preview
  const calculateFinalTotal = () => {
    const hireAll = quotationData.gross_revenue || 0;
    const fuelAll = quotationData.fuel_cost_fuel_only || 0; // already total across buses
    const commission = quotationData.commission_pass_through_amount || 0;
    const additional = quotationData.total_additional_charges || 0;
    const discount = quotationData.discount_amount_lkr || 0;
    const base = hireAll + fuelAll + commission + additional - discount;
    const adjustmentPct = quotationData.percentage_adjustment || 0;
    const adjustmentAmount = base * (adjustmentPct / 100);
    
    // Add post-trip adjustments if present
    const extraKmCharge = adjustmentData?.extra_km_total_charge || 0;
    const additionalExpenses = adjustmentData?.total_additional_expenses || 0;
    
    return Math.round(base + adjustmentAmount + extraKmCharge + additionalExpenses);
  };

  const finalTotal = calculateFinalTotal();
  const advancePaid = quotationData.advance_paid || 0;
  const balanceDue = finalTotal - advancePaid;
  const isAdvanceAlreadyPaid = advancePaid > 0;
  
  const [paymentType, setPaymentType] = useState<'advance' | 'balance' | 'full'>(
    isAdvanceAlreadyPaid ? 'balance' : 'advance'
  );
  const [amount, setAmount] = useState<number>(
    isAdvanceAlreadyPaid ? balanceDue : finalTotal * 0.5
  );
  const [method, setMethod] = useState<string>('cash');
  const [reference, setReference] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [conductorName, setConductorName] = useState<string>('');
  const [busNo, setBusNo] = useState<string>('');
  const [paymentProofUrl, setPaymentProofUrl] = useState<string>('');
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string>('');
  const [isUploadingProof, setIsUploadingProof] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');

  const handlePaymentTypeChange = (type: 'advance' | 'balance' | 'full') => {
    setPaymentType(type);
    if (type === 'advance' && !isAdvanceAlreadyPaid) {
      setAmount(finalTotal * 0.5);
    } else if (type === 'full') {
      setAmount(finalTotal);
    } else if (type === 'balance') {
      setAmount(balanceDue);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setIsUploadingProof(true);
      const userId = user?.id || 'anonymous';
      const key = `payment-proofs/${userId}/${quotationData.quotation_no || 'quotation'}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(key, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      setPaymentProofUrl(key);
      const { data: signed } = await supabase.storage
        .from('payment-proofs')
        .createSignedUrl(key, 60 * 10);
      if (signed?.signedUrl) setProofPreviewUrl(signed.signedUrl);
    } catch (e) {
      console.error('Upload failed:', e);
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handleRemoveProof = async () => {
    try {
      if (paymentProofUrl && paymentProofUrl.startsWith('payment-proofs/')) {
        await supabase.storage.from('payment-proofs').remove([paymentProofUrl]);
      }
    } catch (e) {
      console.error('Remove proof error:', e);
    } finally {
      setPaymentProofUrl('');
      setProofPreviewUrl('');
    }
  };

  const handleConfirm = () => {
    // Validate required fields for balance payment
    if (paymentType === 'balance' && (!paymentProofUrl || !driverName || !busNo)) {
      toast.error('For balance payments, payment proof, driver name, and bus number are required.');
      return;
    }

    onConfirm({
      amount,
      paymentType,
      method,
      reference: reference || undefined,
      driverName: driverName || undefined,
      conductorName: conductorName || undefined,
      busNo: busNo || undefined,
      paymentProofUrl: paymentProofUrl || undefined,
      notes: notes || undefined,
    });
  };

  const handleGenerateInvoice = () => {
    onClose();
    if (onGenerateInvoiceRequest) {
      onGenerateInvoiceRequest();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {adjustmentData && !balanceInvoiceSent 
              ? 'Choose Action: Invoice or Payment' 
              : 'Confirm Payment & Trip Assignment'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Workflow Selection - Only show if adjustments exist and invoice not sent yet */}
          {adjustmentData && !balanceInvoiceSent && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">What would you like to do?</h3>
                <RadioGroup value={workflowMode} onValueChange={(val) => setWorkflowMode(val as any)}>
                  <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="generate_invoice" id="generate_invoice" />
                    <div className="flex-1">
                      <Label htmlFor="generate_invoice" className="font-medium cursor-pointer">
                        Generate & Send Invoice to Customer
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Customer hasn't paid yet. Generate balance invoice showing adjustments and send to customer.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="confirm_payment" id="confirm_payment" />
                    <div className="flex-1">
                      <Label htmlFor="confirm_payment" className="font-medium cursor-pointer">
                        Confirm Payment Received
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Customer already paid. Record the payment details and close this trip.
                      </p>
                    </div>
                  </div>
                </RadioGroup>
                
                {workflowMode === 'generate_invoice' && (
                  <div className="mt-4 pt-4 border-t">
                    <Button onClick={handleGenerateInvoice} className="w-full">
                      Proceed to Generate Invoice
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Only show payment form if in confirm_payment mode OR no adjustments OR invoice already sent */}
          {(workflowMode === 'confirm_payment' || !adjustmentData || balanceInvoiceSent) && (
            <>
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
              
              {/* Post-Trip Adjustments Summary */}
              {adjustmentData && (adjustmentData.extra_km_total_charge || adjustmentData.total_additional_expenses) && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-xs font-semibold text-primary mb-2">POST-TRIP ADJUSTMENTS</div>
                  <div className="space-y-2 text-xs">
                    {adjustmentData.extra_km && adjustmentData.extra_km !== 0 && (
                      <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                        <span className="text-muted-foreground">
                          Extra KM: {adjustmentData.extra_km > 0 ? '+' : ''}{adjustmentData.extra_km} km 
                          × LKR {(adjustmentData.extra_km_charge_per_km || 0).toLocaleString()}/km
                        </span>
                        <span className="font-medium">
                          +LKR {(adjustmentData.extra_km_total_charge || 0).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {adjustmentData.additional_expenses && adjustmentData.additional_expenses.length > 0 && (
                      <div className="p-2 bg-pink-50 rounded space-y-1">
                        <div className="text-muted-foreground font-medium">Additional Expenses:</div>
                        {adjustmentData.additional_expenses.map((exp, idx) => (
                          <div key={idx} className="flex justify-between text-xs pl-2">
                            <span className="text-muted-foreground">• {exp.description}</span>
                            <span>LKR {exp.amount.toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="flex justify-between font-medium pt-1 border-t mt-1">
                          <span>Total Additional:</span>
                          <span>+LKR {(adjustmentData.total_additional_expenses || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between items-center p-2 bg-blue-50 rounded font-semibold">
                      <span>Total Adjustments:</span>
                      <span className="text-primary">
                        +LKR {((adjustmentData.extra_km_total_charge || 0) + (adjustmentData.total_additional_expenses || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Details */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Payment Details</Label>
            
            <div className="space-y-3">
              <Label>Payment Type</Label>
              <RadioGroup 
                value={paymentType} 
                onValueChange={(value) => handlePaymentTypeChange(value as 'advance' | 'balance' | 'full')}
                className={`grid gap-4 ${isAdvanceAlreadyPaid ? 'grid-cols-1' : 'grid-cols-2'}`}
              >
                {!isAdvanceAlreadyPaid && (
                  <>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="advance" id="advance" />
                      <Label htmlFor="advance">Advance Payment (50%)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="full" id="full" />
                      <Label htmlFor="full">Full Payment (100%)</Label>
                    </div>
                  </>
                )}
                {isAdvanceAlreadyPaid && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="balance" id="balance" />
                    <Label htmlFor="balance">Balance Payment (LKR {balanceDue.toLocaleString()})</Label>
                  </div>
                )}
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

            <div className="space-y-2">
              <Label htmlFor="paymentProof">Payment Proof (image/PDF, optional)</Label>
              <Input
                id="paymentProof"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                disabled={isUploadingProof}
              />
              {paymentProofUrl && (
                <div className="flex items-center gap-2">
                  {proofPreviewUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={proofPreviewUrl} target="_blank" rel="noopener noreferrer">Preview</a>
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={handleRemoveProof}>Remove</Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes about the payment..."
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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};