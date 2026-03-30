// @ts-nocheck
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Building2, Receipt } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LightVehicleInvoiceTypeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (type: 'direct_invoice' | 'proforma_invoice' | 'tax_invoice', proformaConfig?: {
    amountPercentage?: number;
    financeCompanyName?: string;
    financeCompanyAddress?: string;
    purpose?: string;
  }, taxConfig?: {
    supplierTin?: string;
    purchaserTin?: string;
    placeOfSupply?: string;
    dateOfDelivery?: string;
    modeOfPayment?: string;
    additionalInformation?: string;
    taxRate?: number;
  }) => void;
  totalAmount: number;
}

export function LightVehicleInvoiceTypeModal({
  open,
  onOpenChange,
  onConfirm,
  totalAmount
}: LightVehicleInvoiceTypeModalProps) {
  const [invoiceType, setInvoiceType] = useState<'direct_invoice' | 'proforma_invoice' | 'tax_invoice'>('direct_invoice');
  const [amountPercentage, setAmountPercentage] = useState<number>(100);
  const [financeCompanyName, setFinanceCompanyName] = useState('');
  const [financeCompanyAddress, setFinanceCompanyAddress] = useState('');
  const [purpose, setPurpose] = useState('Vehicle financing application');
  // Tax invoice fields
  const [supplierTin, setSupplierTin] = useState('');
  const [purchaserTin, setPurchaserTin] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [dateOfDelivery, setDateOfDelivery] = useState('');
  const [modeOfPayment, setModeOfPayment] = useState('');
  const [additionalInformation, setAdditionalInformation] = useState('');

  const proformaAmount = (totalAmount * amountPercentage) / 100;
  const taxRate = 18;
  const baseAmount = totalAmount / (1 + taxRate / 100);
  const vatAmount = totalAmount - baseAmount;

  const handleConfirm = () => {
    if (invoiceType === 'proforma_invoice') {
      onConfirm(invoiceType, {
        amountPercentage,
        financeCompanyName,
        financeCompanyAddress,
        purpose
      });
    } else if (invoiceType === 'tax_invoice') {
      onConfirm(invoiceType, undefined, {
        supplierTin: supplierTin || undefined,
        purchaserTin: purchaserTin || undefined,
        placeOfSupply: placeOfSupply || undefined,
        dateOfDelivery: dateOfDelivery || undefined,
        modeOfPayment: modeOfPayment || undefined,
        additionalInformation: additionalInformation || undefined,
        taxRate,
      });
    } else {
      onConfirm(invoiceType);
    }
    onOpenChange(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Invoice Type</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={invoiceType} onValueChange={(v) => setInvoiceType(v as any)}>
            <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="direct_invoice" id="direct" />
              <Label htmlFor="direct" className="flex items-center gap-2 cursor-pointer flex-1">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Direct Invoice</p>
                  <p className="text-xs text-muted-foreground">Standard invoice for customer</p>
                </div>
              </Label>
            </div>
            
            <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="proforma_invoice" id="proforma" />
              <Label htmlFor="proforma" className="flex items-center gap-2 cursor-pointer flex-1">
                <Building2 className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium">Proforma Invoice</p>
                  <p className="text-xs text-muted-foreground">For finance company / loan application</p>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="tax_invoice" id="tax" />
              <Label htmlFor="tax" className="flex items-center gap-2 cursor-pointer flex-1">
                <Receipt className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Tax Invoice (Sri Lanka Govt Format)</p>
                  <p className="text-xs text-muted-foreground">Government-mandated format with VAT</p>
                </div>
              </Label>
            </div>
          </RadioGroup>

          {/* Tax Invoice Fields */}
          {invoiceType === 'tax_invoice' && (
            <div className="space-y-4 pt-4 border-t">
              <Alert>
                <Receipt className="h-4 w-4" />
                <AlertDescription>Sri Lankan government-mandated Tax Invoice format (EOG 02/04/05).</AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Supplier's TIN</Label>
                  <Input placeholder="Supplier TIN" value={supplierTin} onChange={(e) => setSupplierTin(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Purchaser's TIN *</Label>
                  <Input placeholder="Purchaser TIN" value={purchaserTin} onChange={(e) => setPurchaserTin(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Date of Delivery</Label>
                  <Input type="date" value={dateOfDelivery} onChange={(e) => setDateOfDelivery(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Place of Supply</Label>
                  <Input placeholder="e.g., Colombo" value={placeOfSupply} onChange={(e) => setPlaceOfSupply(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Mode of Payment</Label>
                <Select value={modeOfPayment} onValueChange={setModeOfPayment}>
                  <SelectTrigger><SelectValue placeholder="Select payment mode" /></SelectTrigger>
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
                <Textarea placeholder="Optional additional notes" value={additionalInformation} onChange={(e) => setAdditionalInformation(e.target.value)} rows={2} />
              </div>

              <div className="grid grid-cols-3 gap-3 p-3 bg-muted/50 rounded border">
                <div>
                  <p className="text-xs text-muted-foreground">Excl. VAT</p>
                  <p className="font-medium text-sm">{formatCurrency(baseAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">VAT ({taxRate}%)</p>
                  <p className="font-medium text-sm text-destructive">{formatCurrency(vatAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-bold text-sm">{formatCurrency(totalAmount)}</p>
                </div>
              </div>
            </div>
          )}

          {invoiceType === 'proforma_invoice' && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Invoice Amount Percentage</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" min={1} max={100} value={amountPercentage} onChange={(e) => setAmountPercentage(Number(e.target.value))} className="w-24" />
                  <span className="text-sm text-muted-foreground">%</span>
                  <span className="text-sm font-medium ml-auto">= {formatCurrency(proformaAmount)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Finance Company Name *</Label>
                <Input value={financeCompanyName} onChange={(e) => setFinanceCompanyName(e.target.value)} placeholder="Enter finance company name" />
              </div>

              <div className="space-y-2">
                <Label>Finance Company Address</Label>
                <Input value={financeCompanyAddress} onChange={(e) => setFinanceCompanyAddress(e.target.value)} placeholder="Enter address" />
              </div>

              <div className="space-y-2">
                <Label>Purpose</Label>
                <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Purpose of proforma invoice" rows={2} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={handleConfirm}
            disabled={invoiceType === 'proforma_invoice' && !financeCompanyName}
          >
            Generate Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
