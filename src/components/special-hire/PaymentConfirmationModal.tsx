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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Eye, Edit, FileCheck, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

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
    total_paid?: number;
    fuel_cost_fuel_only?: number;
    commission_pass_through_amount?: number;
    discount_amount_lkr?: number;
    total_additional_charges?: number;
    // Pre-existing vehicle assignment data
    assigned_driver_name?: string | null;
    assigned_conductor_name?: string | null;
    assigned_bus_no?: string | null;
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

type ProcessingStep = 'idle' | 'payment' | 'assignment' | 'notification' | 'document' | 'complete';

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
  
  // Progress tracking state
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');
  const [progressPercent, setProgressPercent] = useState(0);
  
  // Calculate final total to match quotation preview
  const calculateFinalTotal = () => {
    const hireAll = quotationData.gross_revenue || 0;
    const fuelAll = quotationData.fuel_cost_fuel_only || 0;
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
  const totalPaidSoFar = quotationData.total_paid || quotationData.advance_paid || 0;
  const balanceDue = Math.max(finalTotal - totalPaidSoFar, 0);
  const isAdvanceAlreadyPaid = totalPaidSoFar > 0;
  
  const [paymentType, setPaymentType] = useState<'advance' | 'balance' | 'full'>(
    isAdvanceAlreadyPaid ? 'balance' : 'advance'
  );
  const [amount, setAmount] = useState<number>(
    isAdvanceAlreadyPaid ? balanceDue : finalTotal * 0.5
  );
  const [method, setMethod] = useState<string>('cash');
  const [reference, setReference] = useState<string>('');
  // Pre-populate from existing assignment if available
  const [driverName, setDriverName] = useState<string>(quotationData.assigned_driver_name || '');
  const [conductorName, setConductorName] = useState<string>(quotationData.assigned_conductor_name || '');
  const [busNo, setBusNo] = useState<string>(quotationData.assigned_bus_no || '');
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

  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

  const handleFileUpload = async (file: File) => {
    // Check authentication first
    if (!user?.id) {
      toast.error('Please log in to upload payment proof');
      setUploadStatus('error');
      return;
    }

    // Validate file size (max 10MB for high-res phone photos)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File is too large. Please upload a file smaller than 10MB.');
      setUploadStatus('error');
      return;
    }

    // Validate file type - accept any image format (including HEIC/HEIF) + PDF
    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';
    if (!isImage && !isPDF) {
      toast.error('Invalid file type. Please upload an image or PDF.');
      setUploadStatus('error');
      return;
    }

    try {
      setIsUploadingProof(true);
      setUploadStatus('uploading');
      
      const key = `${user.id}/${quotationData.quotation_no || 'quotation'}/${Date.now()}-${file.name}`;
      
      // Set a timeout for the upload (30 seconds)
      const uploadPromise = supabase.storage
        .from('payment-proofs')
        .upload(key, file, { upsert: true, contentType: file.type });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Upload timed out')), 30000)
      );
      
      const result = await Promise.race([uploadPromise, timeoutPromise]) as any;
      
      if (result?.error) {
        console.error('Upload error details:', result.error);
        
        // Provide user-friendly error messages
        if (result.error.message?.includes('policy') || result.error.message?.includes('permission')) {
          toast.error('Permission denied. Please contact administrator to fix storage permissions.');
        } else if (result.error.message?.includes('size')) {
          toast.error('File is too large. Please upload a smaller file (max 5MB).');
        } else if (result.error.message?.includes('type') || result.error.message?.includes('format')) {
          toast.error('Invalid file type. Please upload an image or PDF.');
        } else {
          toast.error(`Upload failed: ${result.error.message}`);
        }
        setUploadStatus('error');
        return;
      }
      
      setPaymentProofUrl(key);
      const { data: signed } = await supabase.storage
        .from('payment-proofs')
        .createSignedUrl(key, 60 * 10);
      if (signed?.signedUrl) setProofPreviewUrl(signed.signedUrl);
      setUploadStatus('success');
      toast.success('Payment proof uploaded successfully');
    } catch (e: any) {
      console.error('Upload failed:', e);
      setUploadStatus('error');
      
      // Handle unexpected errors
      if (e?.message?.includes('timed out')) {
        toast.error('Upload timed out. Please check your internet connection and try again.');
      } else if (e?.message?.includes('policy') || e?.message?.includes('denied')) {
        toast.error('Storage permission error. Please contact administrator.');
      } else {
        toast.error('Failed to upload payment proof. Please try again.');
      }
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
      setUploadStatus('idle');
    }
  };

  const getProgressStepLabel = (step: ProcessingStep): string => {
    switch (step) {
      case 'payment': return 'Creating payment record...';
      case 'assignment': return 'Updating trip assignment...';
      case 'notification': return 'Sending notifications...';
      case 'document': return 'Generating sales receipt...';
      case 'complete': return 'Complete!';
      default: return '';
    }
  };

  const handleConfirm = () => {
    // Validate amount
    if (amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    if (paymentType === 'balance') {
      if (balanceDue <= 0) {
        toast.error('This trip is fully paid. No balance payment is required.');
        return;
      }
    }

    // Validate required fields for all payments (to ensure document quality)
    if (!method) {
      toast.error('Please select a payment method');
      return;
    }

    // Validate required fields for balance payment with specific messages
    if (paymentType === 'balance') {
      if (!paymentProofUrl) {
        toast.error('Payment proof is required for balance payment');
        return;
      }
      if (!driverName) {
        toast.error('Driver name is required for trip assignment');
        return;
      }
      if (!busNo) {
        toast.error('Bus number is required for trip assignment');
        return;
      }
    }

    // All validations passed - document will be auto-generated
    console.log('[SPH Payment] Confirming payment - document will be auto-generated');
    
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

  const [activeTab, setActiveTab] = useState<'details' | 'preview'>('details');

  // Determine if we should show the loading overlay
  const isProcessing = loading || processingStep !== 'idle';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {adjustmentData && !balanceInvoiceSent 
              ? 'Choose Action: Invoice or Payment' 
              : 'Confirm Payment & Trip Assignment'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Processing Progress Indicator */}
          {isProcessing && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="font-medium text-primary">
                    {getProgressStepLabel(processingStep) || 'Processing...'}
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  Please wait while we process your request. This may take a few seconds.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Finance Integration Info Alert */}
          <Alert className="bg-blue-50 border-blue-200">
            <FileCheck className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-sm">
              <strong>Automated Finance Integration:</strong> When you confirm this payment, a draft Sales Receipt will be automatically generated. 
              Finance team will then approve and post to GL (General Ledger) and AR (Accounts Receivable).
            </AlertDescription>
          </Alert>

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
                      <p className="font-medium">Total Paid:</p>
                      <p className="text-green-600">LKR {totalPaidSoFar.toLocaleString()}</p>
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

          {paymentType === 'balance' && balanceDue <= 0 && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 text-sm font-medium">
                This trip is fully paid. The balance due is 0. No further payments are required.
              </AlertDescription>
            </Alert>
          )}

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
                  disabled={isProcessing || (paymentType === 'balance' && balanceDue <= 0)}
                />
                {((paymentType === 'balance' && amount > balanceDue) || (paymentType !== 'balance' && amount > finalTotal)) && (
                  <p className="text-xs text-blue-600 font-medium flex items-center mt-1 bg-blue-50 p-1.5 rounded">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Overpayment of LKR {((amount - (paymentType === 'balance' ? balanceDue : finalTotal))).toLocaleString()} will be recorded as linked credit.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="method">Payment Method</Label>
                <Select value={method} onValueChange={setMethod} disabled={isProcessing}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Reference Number (Optional)</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g., Bank transaction ID, Cheque number"
                disabled={isProcessing}
              />
            </div>

            {/* Payment Proof Upload */}
            <div className="space-y-2">
              <Label>Payment Proof {paymentType === 'balance' && <span className="text-red-500">*</span>}</Label>
              {!paymentProofUrl ? (
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    id="payment-proof"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    disabled={isUploadingProof || isProcessing}
                  />
                  <Label htmlFor="payment-proof" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2">
                      {isUploadingProof ? (
                        <>
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-8 h-8 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Click to upload payment proof (image or PDF, max 5MB)
                          </span>
                        </>
                      )}
                    </div>
                  </Label>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-800">Payment proof uploaded</span>
                  </div>
                  <div className="flex gap-2">
                    {proofPreviewUrl && (
                      <Button variant="outline" size="sm" onClick={() => window.open(proofPreviewUrl, '_blank')}>
                        <Eye className="w-4 h-4 mr-1" /> View
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={handleRemoveProof} disabled={isProcessing}>
                      Remove
                    </Button>
                  </div>
                </div>
              )}
              {uploadStatus === 'error' && (
                <p className="text-xs text-red-500 mt-1">Upload failed. Please try again.</p>
              )}
            </div>
          </div>

          {/* Trip Assignment */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Trip Assignment</Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="driverName">Driver Name {paymentType === 'balance' && <span className="text-red-500">*</span>}</Label>
                <Input
                  id="driverName"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Enter driver name"
                  disabled={isProcessing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="conductorName">Conductor Name</Label>
                <Input
                  id="conductorName"
                  value={conductorName}
                  onChange={(e) => setConductorName(e.target.value)}
                  placeholder="Enter conductor name"
                  disabled={isProcessing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="busNo">Bus Number {paymentType === 'balance' && <span className="text-red-500">*</span>}</Label>
                <Input
                  id="busNo"
                  value={busNo}
                  onChange={(e) => setBusNo(e.target.value)}
                  placeholder="e.g., NC-1234"
                  disabled={isProcessing}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
              disabled={isProcessing}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={isProcessing || (paymentType === 'balance' && balanceDue <= 0)}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4 mr-2" />
                  Confirm Payment
                </>
              )}
            </Button>
          </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
