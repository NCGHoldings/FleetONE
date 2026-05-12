import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { FileText, Building, Percent, AlertCircle, Receipt, DollarSign, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface ProformaInvoiceConfig {
   invoiceCategory: 'direct_invoice' | 'proforma_invoice' | 'tax_invoice';
  proformaAmountPercentage?: number;
  proformaAmount?: number;
  financeCompanyName?: string;
  financeCompanyAddress?: string;
  proformaPurpose?: string;
  amountMode?: 'percentage' | 'fixed';
  declaredVehicleValue?: number;
  customerCommitment?: number;
  leasingCompanyAmount?: number;
   // Tax Invoice fields
   isTaxInvoice?: boolean;
   customerVatNumber?: string;
   taxRate?: number;
   // Sri Lanka government format fields
   supplierTin?: string;
   purchaserTin?: string;
   placeOfSupply?: string;
   dateOfDelivery?: string;
   modeOfPayment?: string;
   additionalInformation?: string;
   invoiceDate?: string;
}

interface YutongInvoiceTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onConfirm: (config: ProformaInvoiceConfig) => void;
  isLoading?: boolean;
   defaultInvoiceType?: 'direct_invoice' | 'proforma_invoice' | 'tax_invoice';
}

const FINANCE_PURPOSES = [
  { value: 'bank_leasing', label: 'Bank Leasing' },
  { value: 'finance_company', label: 'Finance Company' },
  { value: 'hire_purchase', label: 'Hire Purchase' },
  { value: 'other', label: 'Other' }
];

const COMMON_PERCENTAGES = [60, 70, 80, 90];
const COMMON_FIXED_INCREMENTS = [500000, 1000000, 2000000, 5000000];
const COMMITMENT_PERCENTAGES = [20, 30, 40, 50];

export function YutongInvoiceTypeModal({
  isOpen,
  onClose,
  totalAmount,
  onConfirm,
  isLoading = false,
  defaultInvoiceType = 'direct_invoice'
}: YutongInvoiceTypeModalProps) {
   const [invoiceCategory, setInvoiceCategory] = useState<'direct_invoice' | 'proforma_invoice' | 'tax_invoice'>(defaultInvoiceType);
  const [proformaPercentage, setProformaPercentage] = useState(70);
  const [amountMode, setAmountMode] = useState<'percentage' | 'fixed'>('percentage');
  const [fixedAmount, setFixedAmount] = useState(totalAmount);
  const [customerCommitment, setCustomerCommitment] = useState(0);
  const [commitmentMode, setCommitmentMode] = useState<'percentage' | 'fixed'>('percentage');
  const [commitmentPercentage, setCommitmentPercentage] = useState(30);
  const [commitmentFixedAmount, setCommitmentFixedAmount] = useState(0);
  const [financeCompanyName, setFinanceCompanyName] = useState('');
  const [financeCompanyAddress, setFinanceCompanyAddress] = useState('');
  const [proformaPurpose, setProformaPurpose] = useState('bank_leasing');
   const [customerVatNumber, setCustomerVatNumber] = useState('');
   // New Sri Lanka tax invoice fields
   const [supplierTin, setSupplierTin] = useState('');
   const [purchaserTin, setPurchaserTin] = useState('');
   const [placeOfSupply, setPlaceOfSupply] = useState('');
   const [dateOfDelivery, setDateOfDelivery] = useState('');
   const [modeOfPayment, setModeOfPayment] = useState('');
   const [additionalInformation, setAdditionalInformation] = useState('');
   const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    setInvoiceCategory(defaultInvoiceType);
  }, [defaultInvoiceType, isOpen]);

  useEffect(() => {
    setFixedAmount(totalAmount);
  }, [totalAmount, isOpen]);

  const proformaAmount = amountMode === 'percentage' 
    ? Math.round((totalAmount * proformaPercentage) / 100)
    : fixedAmount;

  const effectiveCustomerCommitment = commitmentMode === 'percentage'
    ? Math.round(proformaAmount * commitmentPercentage / 100)
    : commitmentFixedAmount;
  const leasingCompanyAmount = proformaAmount - effectiveCustomerCommitment;
  const declaredVehicleValue = proformaAmount > totalAmount ? proformaAmount : totalAmount;
   
   const taxRate = 18;
   const baseAmount = totalAmount / (1 + taxRate / 100);
   const vatAmount = totalAmount - baseAmount;

  const handleConfirm = () => {
    const config: ProformaInvoiceConfig = {
      invoiceCategory,
      invoiceDate,
      ...(invoiceCategory === 'proforma_invoice' && {
        amountMode,
        proformaAmountPercentage: amountMode === 'percentage' ? proformaPercentage : Math.round((proformaAmount / totalAmount) * 100),
        proformaAmount,
        financeCompanyName: financeCompanyName || undefined,
        financeCompanyAddress: financeCompanyAddress || undefined,
        proformaPurpose,
        declaredVehicleValue: proformaAmount > totalAmount ? proformaAmount : undefined,
        customerCommitment: effectiveCustomerCommitment > 0 ? effectiveCustomerCommitment : undefined,
        leasingCompanyAmount,
       }),
       ...(invoiceCategory === 'tax_invoice' && {
         isTaxInvoice: true,
         customerVatNumber: customerVatNumber || undefined,
         taxRate,
         supplierTin: supplierTin || undefined,
         purchaserTin: purchaserTin || customerVatNumber || undefined,
         placeOfSupply: placeOfSupply || undefined,
         dateOfDelivery: dateOfDelivery || undefined,
         modeOfPayment: modeOfPayment || undefined,
         additionalInformation: additionalInformation || undefined,
       })
    };
    onConfirm(config);
  };

  const handleClose = () => {
    setInvoiceCategory('direct_invoice');
    setProformaPercentage(70);
    setAmountMode('percentage');
    setFixedAmount(totalAmount);
    setCustomerCommitment(0);
    setCommitmentMode('percentage');
    setCommitmentPercentage(30);
    setCommitmentFixedAmount(0);
    setFinanceCompanyName('');
    setFinanceCompanyAddress('');
    setProformaPurpose('bank_leasing');
     setCustomerVatNumber('');
     setSupplierTin('');
     setPurchaserTin('');
     setPlaceOfSupply('');
     setDateOfDelivery('');
     setModeOfPayment('');
     setAdditionalInformation('');
     setInvoiceDate(new Date().toISOString().split('T')[0]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Select Invoice Type
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <RadioGroup
            value={invoiceCategory}
             onValueChange={(value) => setInvoiceCategory(value as 'direct_invoice' | 'proforma_invoice' | 'tax_invoice')}
            className="space-y-3"
          >
            <div className="flex items-start space-x-3 p-4 border rounded-lg hover:border-primary transition-colors cursor-pointer">
              <RadioGroupItem value="direct_invoice" id="direct" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="direct" className="font-semibold text-base cursor-pointer">
                  Direct Customer Invoice
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Standard invoice for full amount directly to customer
                </p>
                <p className="text-sm font-medium mt-2">
                  Amount: LKR {totalAmount.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 border rounded-lg hover:border-primary transition-colors cursor-pointer">
              <RadioGroupItem value="proforma_invoice" id="proforma" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="proforma" className="font-semibold text-base cursor-pointer">
                  Proforma Invoice
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  For bank/finance company - flexible amount for leasing purposes
                </p>
              </div>
            </div>
             
             <div className="flex items-start space-x-3 p-4 border rounded-lg hover:border-primary transition-colors cursor-pointer">
               <RadioGroupItem value="tax_invoice" id="tax" className="mt-1" />
               <div className="flex-1">
                 <Label htmlFor="tax" className="font-semibold text-base cursor-pointer">
                   Tax Invoice (Sri Lanka Government Format)
                 </Label>
                 <p className="text-sm text-muted-foreground mt-1">
                   Government-mandated format with VAT breakdown
                 </p>
                 <p className="text-sm font-medium mt-2">
                   Amount: LKR {totalAmount.toLocaleString()} (incl. {taxRate}% VAT)
                 </p>
               </div>
             </div>
          </RadioGroup>

          <div className="space-y-2 p-4 bg-muted/30 rounded-lg border">
            <Label>Invoice Date</Label>
            <Input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full sm:w-[200px]"
            />
            <p className="text-xs text-muted-foreground">Select a past date to backdate this invoice.</p>
          </div>

           {/* Tax Invoice Options - Sri Lanka Government Format */}
           {invoiceCategory === 'tax_invoice' && (
             <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
               <Alert>
                 <Receipt className="h-4 w-4" />
                 <AlertDescription>
                   This generates the Sri Lankan government-mandated Tax Invoice format (EOG 02/04/05).
                 </AlertDescription>
               </Alert>
               
               <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-2">
                   <Label>Supplier's TIN</Label>
                   <Input
                     placeholder="Supplier TIN"
                     value={supplierTin}
                     onChange={(e) => setSupplierTin(e.target.value)}
                   />
                 </div>
                 <div className="space-y-2">
                   <Label>Purchaser's TIN *</Label>
                   <Input
                     placeholder="Purchaser TIN"
                     value={purchaserTin}
                     onChange={(e) => setPurchaserTin(e.target.value)}
                   />
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-2">
                   <Label>Date of Delivery</Label>
                   <Input
                     type="date"
                     value={dateOfDelivery}
                     onChange={(e) => setDateOfDelivery(e.target.value)}
                   />
                 </div>
                 <div className="space-y-2">
                   <Label>Place of Supply</Label>
                   <Input
                     placeholder="e.g., Colombo"
                     value={placeOfSupply}
                     onChange={(e) => setPlaceOfSupply(e.target.value)}
                   />
                 </div>
               </div>

               <div className="space-y-2">
                 <Label>Mode of Payment</Label>
                 <Select value={modeOfPayment} onValueChange={setModeOfPayment}>
                   <SelectTrigger>
                     <SelectValue placeholder="Select payment mode" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="Cash">Cash</SelectItem>
                     <SelectItem value="Cheque">Cheque</SelectItem>
                     <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                     <SelectItem value="Credit">Credit</SelectItem>
                   </SelectContent>
                 </Select>
               </div>

               <div className="space-y-2">
                 <Label>Additional Information</Label>
                 <Textarea
                   placeholder="Optional additional notes"
                   value={additionalInformation}
                   onChange={(e) => setAdditionalInformation(e.target.value)}
                   rows={2}
                 />
               </div>
               
               <div className="grid grid-cols-3 gap-4 p-3 bg-background rounded border">
                 <div>
                   <p className="text-xs text-muted-foreground">Excl. VAT</p>
                   <p className="font-medium">LKR {baseAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                 </div>
                 <div>
                   <p className="text-xs text-muted-foreground">VAT ({taxRate}%)</p>
                   <p className="font-medium text-destructive">LKR {vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                 </div>
                 <div>
                   <p className="text-xs text-muted-foreground">Total</p>
                   <p className="font-bold text-primary">LKR {totalAmount.toLocaleString()}</p>
                 </div>
               </div>
             </div>
           )}
           
          {/* Proforma Invoice Options */}
          {invoiceCategory === 'proforma_invoice' && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Proforma invoice for financing purposes. You can set the amount by percentage or enter a fixed amount (can exceed bus value).
                </AlertDescription>
              </Alert>

              {/* Amount Mode Toggle */}
              <div className="flex items-center justify-between p-3 bg-background rounded border">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm">Percentage</Label>
                </div>
                <Switch
                  checked={amountMode === 'fixed'}
                  onCheckedChange={(checked) => setAmountMode(checked ? 'fixed' : 'percentage')}
                />
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Fixed Amount</Label>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {amountMode === 'percentage' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Invoice Amount Percentage
                    </Label>
                    <span className="text-lg font-bold text-primary">{proformaPercentage}%</span>
                  </div>
                  
                  <Slider
                    value={[proformaPercentage]}
                    onValueChange={([value]) => setProformaPercentage(value)}
                    min={10}
                    max={150}
                    step={5}
                    className="w-full"
                  />
                  
                  <div className="flex gap-2 flex-wrap">
                    {COMMON_PERCENTAGES.map((pct) => (
                      <Button
                        key={pct}
                        type="button"
                        variant={proformaPercentage === pct ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setProformaPercentage(pct)}
                      >
                        {pct}%
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Proforma Invoice Amount (LKR)
                    </Label>
                    <Input
                      type="number"
                      value={fixedAmount}
                      onChange={(e) => setFixedAmount(Number(e.target.value) || 0)}
                      min={0}
                      className="text-lg font-bold"
                    />
                  </div>
                  
                  <div className="flex gap-2 flex-wrap">
                    {COMMON_FIXED_INCREMENTS.map((inc) => (
                      <Button
                        key={inc}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFixedAmount(totalAmount + inc)}
                      >
                        +{(inc / 1000000).toFixed(1)}M
                      </Button>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFixedAmount(totalAmount)}
                    >
                      Reset
                    </Button>
                  </div>

                  {fixedAmount > totalAmount && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Proforma amount exceeds actual bus value by LKR {(fixedAmount - totalAmount).toLocaleString()}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Customer Commitment & Amount Breakdown */}
              <div className="space-y-3 p-3 bg-background rounded border">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-primary" />
                  <Label className="font-semibold text-sm">Customer Commitment & Leasing Breakdown</Label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Declared Vehicle Value (Sub Total)</p>
                    <p className="font-bold text-primary">LKR {proformaAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Actual Bus Value</p>
                    <p className="font-medium">LKR {totalAmount.toLocaleString()}</p>
                  </div>
                </div>

                <div className="border-t pt-3 space-y-3">
                  {/* Commitment Mode Toggle */}
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Customer Commitment</Label>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={commitmentMode === 'percentage' ? 'font-bold text-primary' : 'text-muted-foreground'}>%</span>
                      <Switch
                        checked={commitmentMode === 'fixed'}
                        onCheckedChange={(checked) => {
                          setCommitmentMode(checked ? 'fixed' : 'percentage');
                          if (checked) {
                            setCommitmentFixedAmount(Math.round(proformaAmount * commitmentPercentage / 100));
                          }
                        }}
                      />
                      <span className={commitmentMode === 'fixed' ? 'font-bold text-primary' : 'text-muted-foreground'}>Fixed</span>
                    </div>
                  </div>

                  {commitmentMode === 'percentage' ? (
                    <div className="space-y-2">
                      <div className="flex gap-2 flex-wrap">
                        {COMMITMENT_PERCENTAGES.map((pct) => (
                          <Button
                            key={pct}
                            type="button"
                            variant={commitmentPercentage === pct ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCommitmentPercentage(pct)}
                          >
                            {pct}%
                          </Button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <Slider
                          value={[commitmentPercentage]}
                          onValueChange={([value]) => setCommitmentPercentage(value)}
                          min={5}
                          max={80}
                          step={5}
                          className="flex-1"
                        />
                        <span className="text-sm font-bold w-12 text-right">{commitmentPercentage}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Customer pays: LKR {effectiveCustomerCommitment.toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        type="number"
                        value={commitmentFixedAmount}
                        onChange={(e) => setCommitmentFixedAmount(Number(e.target.value) || 0)}
                        min={0}
                        max={proformaAmount}
                        className="text-sm"
                        placeholder="Enter fixed commitment amount"
                      />
                    </div>
                  )}

                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-3 p-2 bg-muted/50 rounded text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Customer Commitment</p>
                      <p className="font-semibold text-destructive">LKR {effectiveCustomerCommitment.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">To Be Leased</p>
                      <p className="font-bold text-primary">LKR {leasingCompanyAmount.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Finance Company / Bank Details
                </Label>

                <Select value={proformaPurpose} onValueChange={setProformaPurpose}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    {FINANCE_PURPOSES.map((purpose) => (
                      <SelectItem key={purpose.value} value={purpose.value}>
                        {purpose.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Bank / Finance Company Name (optional)"
                  value={financeCompanyName}
                  onChange={(e) => setFinanceCompanyName(e.target.value)}
                />

                <Textarea
                  placeholder="Bank / Finance Company Address (optional)"
                  value={financeCompanyAddress}
                  onChange={(e) => setFinanceCompanyAddress(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? 'Generating...' : 'Generate Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
