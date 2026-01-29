import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileText, Building2 } from 'lucide-react';

interface LightVehicleInvoiceTypeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (type: 'direct_invoice' | 'proforma_invoice', proformaConfig?: {
    amountPercentage?: number;
    financeCompanyName?: string;
    financeCompanyAddress?: string;
    purpose?: string;
  }) => void;
  totalAmount: number;
}

export function LightVehicleInvoiceTypeModal({
  open,
  onOpenChange,
  onConfirm,
  totalAmount
}: LightVehicleInvoiceTypeModalProps) {
  const [invoiceType, setInvoiceType] = useState<'direct_invoice' | 'proforma_invoice'>('direct_invoice');
  const [amountPercentage, setAmountPercentage] = useState<number>(100);
  const [financeCompanyName, setFinanceCompanyName] = useState('');
  const [financeCompanyAddress, setFinanceCompanyAddress] = useState('');
  const [purpose, setPurpose] = useState('Vehicle financing application');

  const proformaAmount = (totalAmount * amountPercentage) / 100;

  const handleConfirm = () => {
    if (invoiceType === 'proforma_invoice') {
      onConfirm(invoiceType, {
        amountPercentage,
        financeCompanyName,
        financeCompanyAddress,
        purpose
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
      <DialogContent className="max-w-md">
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
          </RadioGroup>

          {invoiceType === 'proforma_invoice' && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Invoice Amount Percentage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={amountPercentage}
                    onChange={(e) => setAmountPercentage(Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  <span className="text-sm font-medium ml-auto">
                    = {formatCurrency(proformaAmount)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Finance Company Name *</Label>
                <Input
                  value={financeCompanyName}
                  onChange={(e) => setFinanceCompanyName(e.target.value)}
                  placeholder="Enter finance company name"
                />
              </div>

              <div className="space-y-2">
                <Label>Finance Company Address</Label>
                <Input
                  value={financeCompanyAddress}
                  onChange={(e) => setFinanceCompanyAddress(e.target.value)}
                  placeholder="Enter address"
                />
              </div>

              <div className="space-y-2">
                <Label>Purpose</Label>
                <Textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Purpose of proforma invoice"
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
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
